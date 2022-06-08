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
const Oauth = require("./oauth");

const contentsOfDotEnvFile = { // convert to using a .env file for this or
  // secrets
  "config": {
    "paulsTestDev": {
      "stravaClientId": 72486,
      "stravaClientSecret": "b0d500111e3d1774903da1f067b5b7adf38ca726",
      "consumerSecret": "ffqgs2OxeJkFHUM0c3pGysdCp1Znt0tnc2s",
      "oauth_consumer_key": "eb0a9a22-db68-4188-a913-77ee997924a8",
      "polarClientId": "654623e7-7191-4cfe-aab5-0bc24785fdee",
      "polarSecret": "f797c0e1-a39d-4b48-a2d9-89c2baea9005",
      "whaooClientId": "iA2JRS_dBkikcb0uEnHPtb6IDt1vDYNbityEEhp801I",
      "wahooSecret": "w4FvDllcO0zYrnV1-VKR-T2gJ4mYUOiFJuwx-8C-C2I",
      "wahooWebhookToken": "97661c16-6359-4854-9498-a49c07b6ec11",
    },
    "anotherDeveloper": {
      "clientId": "a different id",
      "client_secret": "another secret",
    },
  },
};

const configurations = contentsOfDotEnvFile["config"];
// change to configurations = process.env["config"] when environment variables
// set up properly

admin.initializeApp();
const db = admin.firestore();
const oauth = new Oauth(configurations, db);

// INTEGRATION FOR APP:
// get url response and go through onboarding flow.
// we recieve auth token from strava to stravaCallBack.
// tokens stored under userId

exports.connectService = functions.https.onRequest(async (req, res) => {
  // Dev calls this service with parameters: user-id, dev-id, and service to
  // authenticate.
  // TODO: create authorization with dev-secret keys and dev-id.

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
      res.send(url);
      return;
    }
    if (devDoc.data().devKey != devKey|| devKey == null) {
      url =
        "error: the developerId was badly formatted, missing or not authorised";
      res.send(url);
      return;
    }
  } else {
    url = "error: the developerId parameter is missing";
    res.send(url);
    return;
  }

  // now check the userId has been given
  if (userId == null) {
    url = "error: the userId parameter is missing";
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
    response = await got(url);
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
  const provider = appQuery["provider"];
  // add parameters from user onto the callback redirect.
  oauth.setProvider(devId, userId, provider);
  return oauth.redirectUrl;
}

exports.wahooCallback = functions.https.onRequest(async (req, res) => {
  // recreate the oauth object that is managing the Oauth flow
  console.log(req.url);
  const data = Url.parse(req.url, true).query;
  oauth.fromCallbackData("wahoo", data);
  if (oauth.status.gotCode) {
    await oauth.getAndSaveAccessCodes();
  }
  if (!oauth.error) {
    res.send("your authorization was successful please close this window");
  } else {
    res.send(oauth.errorMessage);
  }
});

exports.stravaWebhook = functions.https.onRequest((request, response) => {
  if (request.method === "POST") {
    functions.logger.info("webhook event received!", {
      query: request.query,
      body: request.body,
    });
    // get userbased on userid. (.where("id" == request.body.id)).
    // TODO: Get strava activity and sanatize
    strava.activities.get({"id": request.body.object_id}, (result)=>{
      console.log(result);
    });
    // TODO: Send the information to an endpoint specified by the dev
    // registered to a user.
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

async function oauthCallbackHandlerGarmin(oAuthCallback, db) {
  const oauthNonce = crypto.randomBytes(10).toString("hex");
  // console.log(oauth_nonce);
  const oauthTimestamp = Math.round(new Date().getTime()/1000);
  // console.log(oauth_timestamp);
  const consumerSecret = "ffqgs2OxeJkFHUM0c3pGysdCp1Znt0tnc2s";
  let oauthTokenSecret = oAuthCallback["oauth_token_secret"].split("-");
  const userId = oauthTokenSecret[1];
  const devId = oauthTokenSecret[2];
  oauthTokenSecret = oauthTokenSecret[0];
  const parameters = {
    oauth_nonce: oauthNonce,
    oauth_verifier: oAuthCallback["oauth_verifier"],
    oauth_token: oAuthCallback["oauth_token"],
    oauth_consumer_key: "eb0a9a22-db68-4188-a913-77ee997924a8",
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
  const url = "https://connectapi.garmin.com/oauth-service/oauth/access_token?oauth_consumer_key=eb0a9a22-db68-4188-a913-77ee997924a8&oauth_nonce="+oauthNonce.toString()+"&oauth_signature_method=HMAC-SHA1&oauth_timestamp="+oauthTimestamp.toString()+"&oauth_signature="+encodedSignature+"&oauth_verifier="+oAuthCallback["oauth_verifier"]+"&oauth_token="+oAuthCallback["oauth_token"]+"&oauth_version=1.0";
  const response = await got.post(url);
  console.log(response.body);
  await firestoreData(response.body, userId, devId);
  async function firestoreData(data, userId, devId) {
    data = data.split("=");
    // console.log(data);
    const garminAccessToken = (data[1].split("&"))[0];
    const garminAccessTokenSecret = data[2];
    devId = devId.split("=")[1];
    const firestoreParameters = {
      "devId": devId,
      "garmin_access_token": garminAccessToken,
      "garmin_access_token_secret": garminAccessTokenSecret,
    };
    userId = userId.split("=")[1];
    await db.collection("users").doc(userId.toString()).set(firestoreParameters, {merge: true});
    return true;
  }
}
