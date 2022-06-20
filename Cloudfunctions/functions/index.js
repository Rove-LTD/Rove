/* eslint-disable require-jsdoc */
/* eslint-disable max-len */
/**
 * Index.js contains the main functions and callbacks for Oauth
 * and webHook management
 */
const functions = require("firebase-functions");
// The Firebase Admin SDK to access Firestore.
const admin = require("firebase-admin");
const Url = require("url");
const crypto = require("crypto");
const encodeparams = require("./encodeparams");
const got = require("got");
const request = require("request");
const strava = require("strava-v3");
const OauthWahoo = require("./oauthWahoo");
const contentsOfDotEnvFile = require("./config.json");
const filters = require("./data-filter");
const { optionsToEndpoint } = require("firebase-functions");
const { retryAfterStatusCodes } = require("got/dist/source/core/calculate-retry-delay");
const { waitForDebugger } = require("inspector");

const configurations = contentsOfDotEnvFile["config"];
// find a way to decrypt and encrypt this information

admin.initializeApp();
const db = admin.firestore();
const oauthWahoo = new OauthWahoo(configurations, db);

// INTEGRATION FOR APP:
// get url response and go through onboarding flow.
// we recieve auth token from strava to stravaCallBack.
// tokens stored under userId

exports.connectService = functions.https.onRequest(async (req, res) => {
  // Dev calls this service with parameters: user-id, dev-id, and service to
  // authenticate.
  // in form:  us-central1-rove.cloudfunctions.net/authenticateStrava?
  // userId=***&devId=***&devKey=***&provider=***
  const provider = (Url.parse(req.url, true).query)["provider"];
  const devId = (Url.parse(req.url, true).query)["devId"];
  const userId = (Url.parse(req.url, true).query)["userId"];
  const devKey = (Url.parse(req.url, true).query)["devKey"];

  let url = "";

  // parameter checks
  // first check developer exists and the devKey matches
  if (devId != null) {
    const devDoc = await admin.firestore()
        .collection("developers")
        .doc(devId)
        .get();

    if (!devDoc.exists) {
      url =
        "error: the developerId was badly formatted, missing or not authorised";
      res.status(400);
      res.send(url);
      return;
    }
    if (devDoc.data().devKey != devKey|| devKey == null) {
      url =
        "error: the developerId was badly formatted, missing or not authorised";
      res.status(400);
      res.send(url);
      return;
    }
  } else {
    url = "error: the developerId parameter is missing";
    res.status(400);
    res.send(url);
    return;
  }

  // now check the userId has been given
  if (userId == null) {
    url = "error: the userId parameter is missing";
    res.status(400);
    res.send(url);
    return;
  }


  // stravaOauth componses the request url for the user.
  if (provider == "strava") {
    url = stravaOauth(req);
  } else if (provider == "garmin") {
    // TODO: Make the garmin request async and returnable.
    url = await garminOauth(req);
  } else if (provider == "polar") {
    url = await polarOauth(req);
  } else if (provider == "wahoo") {
    url = await wahooOauth(req);
  } else {
    // the request was badly formatted with incorrect provider parameter
    url = "error: the provider was badly formatted, missing or not supported";
  }
  // send back URL to user device.
  res.send(url);
  return;
});

exports.oauthCallbackHandlerGarmin = functions.https
    .onRequest(async (req, res) => {
      const oAuthCallback = Url.parse(req.url, true).query;
      await oauthCallbackHandlerGarmin(oAuthCallback, db);
      res.send("THANKS, YOU CAN NOW CLOSE THIS WINDOW");
    }),

// callback from strava with token in
exports.stravaCallback = functions.https.onRequest(async (req, res) => {
  // this comes from strava
  // create authorization for user completing oAuth flow.
  const oAuthCallback = (Url.parse(req.url, true).query)["userId"].split(":");
  const code = (Url.parse(req.url, true).query)["code"];
  const userId = oAuthCallback[0];
  const devId = oAuthCallback[1];
  if (userId == null || devId == null || code == null) {
    res.send(
        "Error: missing userId of DevId in callback: an unexpected "+
        "error has occurred please close this window and try again");
    return;
  }
  const dataString = "client_id="+
    configurations[devId]["stravaClientId"]+
    "&client_secret="+
    configurations[devId]["stravaClientSecret"]+
    "&code="+
    code+
    "&grant_type=authorization_code";
  const options = {
    url: "https://www.strava.com/api/v3/oauth/token",
    method: "POST",
    body: dataString,
  };

  // make request to strava for tokens after auth flow and store credentials.
  await request.post(options, async (error, response, body) => {
    if (!error && response.statusCode == 200) {
      // this is where the tokens come back.
      stravaStoreTokens(userId, devId, JSON.parse(body), db);
      await getStravaAthleteId(userId, devId, JSON.parse(body), db);
      // send a response now to endpoint for devId confirming success
      // await sendDevSuccess(devId); //TODO: create dev success post.
      // userResponse = "Some good redirect.";
      res.send("your authorization was successful please close this window");
    } else {
      res.send("Error: "+response.statusCode+
        " please close this window and try again");
      console.log(JSON.parse(body));
      // send an error response to dev.
      // TODO: create dev fail post.
      // userResponse = "Some bad redirect";
    }
  });
});

exports.garminWebhook = functions.https.onRequest(async (req, res) => {
  if (req.method === "POST") {
    functions.logger.info("garmin webhook event received!", {
      query: req.query,
      body: req.body,
    });
    // get userbased on userid. (.where("id" == request.body.id)).
    // TODO: Get strava activity and sanatize
    // TODO: Send the information to an endpoint specified by the dev
    // registered to a user.
    res.status(200).send("EVENT_RECEIVED");
  } else if (req.method === "GET") {
    console.log("garmin not authorized");
    res.status(400).send("Not Authorized");
  }
});

async function stravaStoreTokens(userId, devId, data, db) {
  const parameters = {
    "strava_access_token": data["access_token"],
    "strava_refresh_token": data["refresh_token"],
    "strava_token_expires_at": data["expires_at"],
    "strava_token_expires_in": data["expires_in"],
    "strava_connected": true,
    "devId": devId,
  };
  // set tokens for userId doc.
  const userRef = db.collection("users").doc(userId);
  await userRef.set(parameters, {merge: true});
  // assign userId for devId.
  // const devRef = db.collection("developers").doc(devId);
  // write resultant message to dev endpoint.
  return;
}
async function getStravaAthleteId(userId, devId, data, db) {
  // get athlete id from strava.
  strava.config({
    "client_id": configurations[devId]["stravaClientId"],
    "client_secret": configurations[devId]["stravaClientSecret"],
    "redirect_uri": "https://us-central1-rove-26.cloudfunctions.net/stravaCallback",
  });
  const parameters = {
    "access_token": data["access_token"],
  };
  // set tokens for userId doc.
  const athleteSummary = await strava.athlete.get(parameters);
  const userRef = db.collection("users").doc(userId);
  await userRef.set({"strava_id": athleteSummary["id"]}, {merge: true});
  return;
}

function stravaOauth(req) {
  const appQuery = Url.parse(req.url, true).query;
  const userId = appQuery["userId"];
  const devId = appQuery["devId"];
  // add parameters from user onto the callback redirect.
  const parameters = {
    client_id: configurations[devId]["stravaClientId"],
    response_type: "code",
    redirect_uri: "https://us-central1-rove-26.cloudfunctions.net/stravaCallback?userId="+
      userId+
      ":"+
      devId,
    approval_prompt: "force",
    scope: "profile:read_all,activity:read_all",
  };
  let encodedParameters = "";
  let k = 0;
  for (k in parameters) {
    if (parameters[k] != null) {
      const encodedValue = parameters[k];
      const encodedKey = k;
      if (encodedParameters === "") {
        encodedParameters += `${encodedKey}=${encodedValue}`;
      } else {
        encodedParameters += `&${encodedKey}=${encodedValue}`;
      }
    }
  }
  const baseUrl = "https://www.strava.com/oauth/authorize?";
  return (baseUrl + encodedParameters);
}

async function garminOauth(req) {
  const oauthNonce = crypto.randomBytes(10).toString("hex");
  const userId = (Url.parse(req.url, true).query)["userId"];
  const devId = (Url.parse(req.url, true).query)["devId"];
  // console.log(oauth_nonce);
  const oauthTimestamp = Math.round(new Date().getTime()/1000);
  // console.log(oauth_timestamp);
  const consumerSecret = configurations[devId]["consumerSecret"];
  const parameters = {
    oauth_nonce: oauthNonce,
    oauth_consumer_key: configurations[devId]["oauth_consumer_key"],
    oauth_timestamp: oauthTimestamp,
    oauth_signature_method: "HMAC-SHA1",
    oauth_version: "1.0",
  };
  const encodedParameters = encodeparams.collectParams(parameters);
  const baseUrl =
    "https://connectapi.garmin.com/oauth-service/oauth/request_token";
  const baseString = encodeparams
      .baseStringGen(encodedParameters, "GET", baseUrl);
  const encodingKey = consumerSecret + "&";
  const signature = crypto.createHmac("sha1", encodingKey)
      .update(baseString).digest().toString("base64");
  const encodedSignature = encodeURIComponent(signature);
  const url =
    "https://connectapi.garmin.com/oauth-service/oauth/request_token?oauth_consumer_key="+
    configurations[devId]["oauth_consumer_key"]+
    "&oauth_nonce="+
    oauthNonce.toString()+
    "&oauth_signature_method=HMAC-SHA1&oauth_timestamp="+
    oauthTimestamp.toString()+
    "&oauth_signature="+
    encodedSignature+
    "&oauth_version=1.0";
  let response = "";
  try {
    // get OAuth tokens from garmin
    response = await got.get(url);
  } catch (error) {
    console.log(error.response.body);
    return error.response.body;
  }
  const oauthTokens = response.body.split("&");
  // set callbackURL for garmin Oauth with token and userId and devId.
  const callbackURL =
    "oauth_callback=https://us-central1-rove-26.cloudfunctions.net/oauthCallbackHandlerGarmin?" +
    oauthTokens[1] +
        "-userId=" + userId + "-devId=" + devId;
  // append to oauth garmin url.
  const _url = "https://connect.garmin.com/oauthConfirm?" +
  oauthTokens[0] +
        "&" +
        callbackURL;
  return _url;
}

function polarOauth(req) {
  const appQuery = Url.parse(req.url, true).query;
  const userId = appQuery["userId"];
  const devId = appQuery["devId"];
  // add parameters from user onto the callback redirect.
  const parameters = {
    client_id: configurations[devId]["polarClientId"],
    response_type: "code",
    redirect_uri: "https://us-central1-rove-26.cloudfunctions.net/polarCallback",
    scope: "accesslink.read_all",
    state: userId+":"+devId,
  };

  let encodedParameters = "";
  let k = 0;
  for (k in parameters) {
    if (parameters[k] != null) {
      const encodedValue = parameters[k];
      const encodedKey = k;
      if (encodedParameters === "") {
        encodedParameters += `${encodedKey}=${encodedValue}`;
      } else {
        encodedParameters += `&${encodedKey}=${encodedValue}`;
      }
    }
  }
  const baseUrl = "https://flow.polar.com/oauth2/authorization?";
  return (baseUrl + encodedParameters);
}

// callback from polar with token in
exports.polarCallback = functions.https.onRequest(async (req, res) => {
  // this comes from polar
  // create authorization for user completing oAuth flow.
  const oAuthCallback = (Url.parse(req.url, true).query)["state"].split(":");
  const code = (Url.parse(req.url, true).query)["code"];
  const error = (Url.parse(req.url, true).query)["error"];
  const userId = oAuthCallback[0];
  const devId = oAuthCallback[1];
  if (error != null) {
    res.send("Error: "+error+" please try again");
    return;
  } else if (userId == null || devId == null || code == null) {
    res.send("Error: missing userId or DevId in callback: an unexpected error has occurred please close this window and try again");
    return;
  }
  const clientIdClientSecret = configurations[devId]["polarClientId"]+":"+configurations[devId]["polarSecret"];
  const buffer = new Buffer.from(clientIdClientSecret); // eslint-disable-line
  const base64String = buffer.toString("base64");

  const dataString = "code="+
    code+
    "&grant_type=authorization_code"+
    "&redirect_uri=https://us-central1-rove-26.cloudfunctions.net/polarCallback";
  const options = {
    url: "https://polarremote.com/v2/oauth2/token",
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "Accept": "application/json;charset=UTF-8",
      "Authorization": "Basic "+base64String,
    },
    body: dataString,
  };

  // make request to polar for tokens after auth flow and store credentials.
  await request.post(options, async (error, response, body) => {
    if (!error && response.statusCode == 200) {
    // this is where the tokens come back.
      let message ="";
      message = await registerUserWithPolar(userId, devId, JSON.parse(body), db);
      await polarStoreTokens(userId, devId, JSON.parse(body), db);
      // send a response now to endpoint for devId confirming success
      // await sendDevSuccess(devId); //TODO: create dev success post.
      // userResponse = "Some good redirect.";
      res.send("your authorization was successful please close this window: "+message);
    } else {
      res.send("Error: "+response.statusCode+":"+body.toString()+" please close this window and try again");
      console.log(JSON.parse(body));
      // send an error response to dev.
      // TODO: create dev fail post.
      // userResponse = "Some bad redirect";
    }
  });
  return;
});

async function registerUserWithPolar(userId, devId, data, db) {
  let message = "";
  const dataString = "<register><member-id>"+userId+"</member-id></register>";
  const options = {
    url: "https://www.polaraccesslink.com/v3/users",
    method: "POST",
    headers: {
      "Content-Type": "application/xml",
      "Accept": "application/json",
      "Authorization": "Bearer "+data["access_token"],
    },
    body: dataString,
  };
    // make request to polar to register the user.
  await request.post(options, async (error, response, body) => {
    if (!error && response.statusCode == 200) {
      const updates = {
        "polar_registration_date": JSON.parse(body)["registration-date"],
      };
      const userRef = db.collection("users").doc(userId);
      await userRef.set(updates, {merge: true});
    } else if (response.statusCode == 409) {
      // user already registered
      message = "you are already registered with Polar - there is no need to re-register";
    } else {
      console.log("error registering polar user: "+response.statusCode);
    }
  });
  return message;
}

async function polarStoreTokens(userId, devId, data, db) {
  const parameters = {
    "polar_access_token": data["access_token"],
    "polar_token_type": data["token_type"],
    // "polar_token_expires_at": data["expires_at"], PVTODO: need to calculate from the expires in which is in seconds from now.
    "polar_token_expires_in": data["expires_in"],
    "polar_connected": true,
    "polar_user_id": data["x_user_id"],
  };
  // set tokens for userId doc.
  const userRef = db.collection("users").doc(userId);
  await userRef.set(parameters, {merge: true});
  // assign userId for devId.
  // const devRef = db.collection("developers").doc(devId);
  // write resultant message to dev endpoint.
  return;
}

function wahooOauth(req) {
  const appQuery = Url.parse(req.url, true).query;
  const userId = appQuery["userId"];
  const devId = appQuery["devId"];
  // add parameters from user onto the callback redirect.
  oauthWahoo.setDevUser(devId, userId);
  return oauthWahoo.redirectUrl;
}

exports.wahooCallback = functions.https.onRequest(async (req, res) => {
  // recreate the oauth object that is managing the Oauth flow
  // console.log(req.url);
  const data = Url.parse(req.url, true).query;
  oauthWahoo.fromCallbackData(data);
  if (oauthWahoo.status.gotCode) {
    await oauthWahoo.getAndSaveAccessCodes();
  }
  if (!oauthWahoo.error) {
    res.send("your authorization was successful please close this window");
  } else {
    res.send(oauthWahoo.errorMessage);
  }
});

exports.stravaWebhook = functions.https.onRequest(async (request, response) => {
  if (request.method === "POST") {
    functions.logger.info("webhook event received!", {
      query: request.query,
      body: request.body,
    });
    let stravaAccessToken;
    // get userbased on userid. (.where("id" == request.body.owner_id)).
    const userDoc = await db.collection("users").where("strava_id", "==", request.body.owner_id).get();
    const userDocRef = userDoc.docs.at(0);
    if (userDoc.docs.length == 1) {
      stravaAccessToken = userDocRef.data()["strava_access_token"];
    } else {
      // there is an issue if there is more than one user with a userId in the DB.
      console.log("error in number of users registered to strava webhook: " + request.body.owner_id);
      return;
    }
    console.log(stravaAccessToken);
    // TODO: Get strava activity and sanatize
    const activity = await strava.activities.get({"access_token": stravaAccessToken, "id": request.body.object_id});
    // console.log(activity);
    const sanitisedActivity = filters.stravaSanitise([activity]);
    // console.log(sanitisedActivity);
    // TODO: Send the information to an endpoint specified by the dev registered to a user.
    const ref = admin.database().ref("activities");
    const childRef = ref.push();
    childRef.set(sanitisedActivity[0]);
    response.status(200).send("OK!");
    response.status(200).send("EVENT_RECEIVED");
  } else if (request.method === "GET") {
    const VERIFY_TOKEN = "STRAVA";
    const mode = request.query["hub.mode"];
    const token = request.query["hub.verify_token"];
    const challenge = request.query["hub.challenge"];

    if (mode && token) {
      if (mode === "subscribe" && token === VERIFY_TOKEN) {
        functions.logger.info("WEBHOOK_VERIFIED");
        response.status(200).json({"hub.challenge": challenge});
      } else {
        response.sendStatus(403);
      }
    } else {
      response.sendStatus(403);
    }
  }
});

exports.wahooWebhook = functions.https.onRequest(async (request, response) => {
  if (request.method === "POST") {
    functions.logger.info("---> Wahoo 'POST' webhook event received!", {
      query: request.query,
      body: request.body,
    });
    // check the webhook token is correct
    // TODO: parameterise - should be a lookup in a collection("wahooWebhookTokens")
    if (request.body.webhook_token != "97661c16-6359-4854-9498-a49c07b6ec11") {
      console.log("Wahoo Webhook event recieved that did not have the correct webhook token");
      response.status(401);
      response.send("NOT AUTHORISED");
      return;
    }
    let devList = [];
    const userDocsList = [];
    const userQuery = await db.collection("users")
        .where("wahoo_user_id", "==", request.body.user.id).get();
    userQuery.docs.forEach((doc)=>{
      devList.push(doc.data()["devId"]);
      userDocsList.push(doc);
    });
    devList = devList.filter(onlyUnique);
    // now we have a list of developer Id's that are interested in this
    // users data
    // 1) sanatise and 2) send
    let sanitisedActivity;
    try {
      sanitisedActivity = filters.wahooSanitise(request.body);
    } catch (error) {
      console.log(error.errorMessage);
      response.status(404);
      response.send("Event type not recognised");
      return;
    }
    // TODO: Send to webhook for each developer interested in this user
    devList.forEach((devId)=>{
      return;
    });
    // save raw and sanitised activites as a backup for each user
    userDocsList.forEach(async (userDoc)=>{
      sanitisedActivity["userTag"] = userDoc.id;
      await userDoc.ref.collection("activities").doc().set({"sanitised": sanitisedActivity, "raw": request.body});
    });
    response.status(200);
    response.send("EVENT_RECEIVED");
    return;
  } else {
    functions.logger.info("---> Wahoo 'GET' webhook event received!", {
      query: request.query,
      body: request.body,
    });
    response.status(200);
    response.send("EVENT_RECEIVED");
  }
});

exports.polarWebhook = functions.https.onRequest(async (request, response) => {
  if (request.method === "POST") {
    functions.logger.info("---> polar 'POST' webhook event received!", {
      query: request.query,
      body: request.body,
    });
    const userDocsList = [];
    const userQuery = await db.collection("users")
        .where("polar_user_id", "==", request.body.user_id).get();
    userQuery.docs.forEach((doc)=>{
      userDocsList.push(doc);
    });
    // request the exercise information from Polar - the access token is 
    // needed for this
    // TODO: if there are no users we have an issue
    const userToken = userQuery.docs[0].data()["polar_access_token"];
    if (request.body.event == "EXERCISE") {
      const headers = {
        "Accept": "application/json", "Authorization": "Bearer " + userToken,
      };
      const options = {
        url: "https://www.polaraccesslink.com/v3/exercises/" + request.body.entity_id,
        method: "POST",
        headers: headers,
      };
      const activity = await got.get(options).json();
      let sanitisedActivity;
      try {
        sanitisedActivity = filters.polarSanatise(activity);;
      } catch (error) {
        console.log(error.errorMessage);
        response.status(404);
        response.send("Error reading Polar Activity");
        return;
      }
      // write sanitised information and raw information to each user and then 
      // send to developer
      userDocsList.forEach(async (userDoc)=>{
        sanitisedActivity["userId"] = userDoc.id;
        const activityDoc = await userDoc
            .ref.collection("activities")
            .doc()
            .set({"sanitised": sanitisedActivity, "raw": activity});
      let triesSoFar = 0; // this is our first try to write to developer
      sendToDeveloper(userDoc, sanitisedActivity, activity, activityDoc, triesSoFar);
      });
    }
    response.status(200);
    response.send("OK");
  } else {
    functions.logger.info("---> polar 'GET' webhook event received!", {
      query: request.query,
      body: request.body,
    });
    response.status(200);
    response.send("OK");
  }
});

async function sendToDeveloper(userDoc, sanitisedActivity, activity, activityDoc, triesSoFar) {
  const MaxRetries = 3;
  waitTime = { 0: 0, 1: 1, 2: 10, 3: 60}; // time in minutes
  const devId = userDoc.data()["devId"];
  let datastring = {"sanitised": sanitisedActivity, "raw": activity};
  developerDoc = await db.collection("developers").doc(devId).get();
  options = {
    method: "POST",
    url: developerDoc.data()["endpoint"],
    headers:  {
      "Accept": "application/json", 
      "Content-type": "application/json", //"Authorization": "Bearer "+ developerDoc.data()["devKey"],
    },
    body: JSON.stringify(datastring),
  };
  response = await got.post(options);
  if (response.statusCode == 200) {
    // the developer accepted the information 
    userDoc.ref
        .collection("activities")
        .doc(activityDoc)
        .set({status: "sent", timestamp: new Date()}, {merge: true});
  } else {
    // call the retry functionality and increment the retry counter
    if (triesSoFar <= MaxRetries) {
      console.log("retrying sending to developer");
      wait(waitTime[triesSoFar]);
      sendToDeveloper(userDoc, sanitisedActivity, activity, activityDoc, triesSoFar+1);        
    } else {
      // max retries email developer
      console.log("max retries on sending to developer reached - fail");
    }
  }
}

exports.polarWebhookSetup = functions.https.onRequest(async (req, res) => {
  // get the devId and DevKey
  const devId = Url.parse(req.url, true).query["devId"];
  const action = Url.parse(req.url, true).query["action"];
  const webhookId = Url.parse(req.url, true).query["webhookId"];
  if (action == "delete" && webhookId == null) {
    res.send("Error: webhook Id not provided");
    return;
  }
  // make the call to polar and get the response
  const response = await polarWebhookUtility(devId, action, webhookId);

  // save the response to the developers doc in the developers collection
  if (action == "register" && response.statusCode == 201) {
    const responseObject = JSON.parse(response.body);
    const data = {
      polar_webhook_id: responseObject.data.id,
      polar_signature_secret_key: responseObject.data.signature_secret_key,
    };
    const devRef = db.collection("developers").doc(devId);
    await devRef.set(data, {merge: true});
    res.send("webhook created successfully" + response.body);
  } else if (action == "get" && response.statusCode == 200) {
    res.send("webhook: "+response.body);
  } else if (action == "delete" && response.statusCode == 204) {
    res.send("webhook deleted successfully");
  } else {
    res.send("error: "+response.statusCode+response.body);
  }
  return;
});

async function polarWebhookUtility(devId, action, webhookId) {
  const clientIdClientSecret = configurations[devId]["polarClientId"]+":"+configurations[devId]["polarSecret"];
  const buffer = new Buffer.from(clientIdClientSecret); // eslint-disable-line
  const base64String = buffer.toString("base64");
  const _headers = {
    "Content-Type": "application/json",
    "Accept": "application/json",
    "Authorization": "Basic "+base64String,
  };
  const _url = "https://www.polaraccesslink.com/v3/webhooks";
  let response;
  let options;
  switch (action) {
    case "register":
      options = {
        url: _url,
        method: "POST",
        headers: _headers,
        body: JSON.stringify({
          "events": [
            "EXERCISE", "SLEEP",
          ],
          "url": "https://us-central1-rove-26.cloudfunctions.net/polarWebhook",
        }),
      };
      response = await got.post(options);
      break;
    case "delete":
      options = {
        _url: _url+"/"+webhookId,
        _method: "DELETE",
        headers: _headers,
      };
      response = await got.delete(options);
      break;
    case "get":
      options = {
        _url: _url,
        _method: "GET",
        headers: _headers,
      };
      response = await got.get(options);
      break;
  }
  return response;
}

async function oauthCallbackHandlerGarmin(oAuthCallback, db) {
  const oauthNonce = crypto.randomBytes(10).toString("hex");
  // console.log(oauth_nonce);
  const oauthTimestamp = Math.round(new Date().getTime()/1000);
  // console.log(oauth_timestamp);
  let oauthTokenSecret = oAuthCallback["oauth_token_secret"].split("-");
  const userId = oauthTokenSecret[1].split("=")[1];
  const devId = oauthTokenSecret[2].split("=")[1];
  const consumerSecret = configurations[devId]["consumerSecret"];
  oauthTokenSecret = oauthTokenSecret[0];
  const parameters = {
    oauth_nonce: oauthNonce,
    oauth_verifier: oAuthCallback["oauth_verifier"],
    oauth_token: oAuthCallback["oauth_token"],
    oauth_consumer_key: configurations[devId]["oauth_consumer_key"],
    oauth_timestamp: oauthTimestamp,
    oauth_signature_method: "HMAC-SHA1",
    oauth_version: "1.0",
  };
  const encodedParameters = encodeparams.collectParams(parameters);
  const baseUrl = "https://connectapi.garmin.com/oauth-service/oauth/access_token";
  const baseString = encodeparams.baseStringGen(encodedParameters, "POST", baseUrl);
  const encodingKey = consumerSecret + "&" + oauthTokenSecret;
  const signature = crypto.createHmac("sha1", encodingKey).update(baseString).digest().toString("base64");
  const encodedSignature = encodeURIComponent(signature);
  const url = "https://connectapi.garmin.com/oauth-service/oauth/access_token?oauth_consumer_key="+configurations[devId]["oauth_consumer_key"]+"&oauth_nonce="+oauthNonce.toString()+"&oauth_signature_method=HMAC-SHA1&oauth_timestamp="+oauthTimestamp.toString()+"&oauth_signature="+encodedSignature+"&oauth_verifier="+oAuthCallback["oauth_verifier"]+"&oauth_token="+oAuthCallback["oauth_token"]+"&oauth_version=1.0";
  const response = await got.post(url);
  // console.log(response.body);
  await firestoreData(response.body, userId, devId);
  async function firestoreData(data, userId, devId) {
    data = data.split("=");
    // console.log(data);
    const garminAccessToken = (data[1].split("&"))[0];
    const garminAccessTokenSecret = data[2];
    const firestoreParameters = {
      "devId": devId,
      "garmin_access_token": garminAccessToken,
      "garmin_access_token_secret": garminAccessTokenSecret,
    };
    await db.collection("users").doc(userId).set(firestoreParameters, {merge: true});
    return true;
  }
}

// Utility Functions -----------------------------
function onlyUnique(value, index, self) {
  return self.indexOf(value) === index;
}
const wait = mins => new Promise(resolve => setTimeout(resolve, mins*60*1000));
