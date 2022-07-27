/* eslint-disable no-multi-str */
/* eslint-disable no-unused-vars */
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
const stravaApi = require("strava-v3");
const OauthWahoo = require("./oauthWahoo");
const contentsOfDotEnvFile = require("./config.json");
const filters = require("./data-filter");
const fs = require("fs");
const notion = require("./notion");

const configurations = contentsOfDotEnvFile["config"];
// find a way to decrypt and encrypt this information

admin.initializeApp();
const db = admin.firestore();
const oauthWahoo = new OauthWahoo(configurations, db);
const callbackBaseUrl = "https://us-central1-"+process.env.GCLOUD_PROJECT+".cloudfunctions.net";

// INTEGRATION FOR APP:
// get url response and go through onboarding flow.
// we recieve auth token from strava to stravaCallBack.
// tokens stored under userId

exports.redirectPage = functions.https.onRequest( async (req, res) => {
  const transactionId = (Url.parse(req.url, true).query)["transactionId"];
  const provider = (Url.parse(req.url, true).query)["provider"];
  const devId = (Url.parse(req.url, true).query)["devId"];
  const params = "?transactionId="+transactionId+"&isRedirect=true";
  const html = await fs.promises.readFile("redirectPage.html");
  res.writeHead(200, {"Content-Type": "text/html"});
  res.write(html);
  res.write("<h2 style='text-align: center;font-family:DM Sans'>Data integrations provider for "+devId+"</h2>\
  <h2 style='text-align: center;font-family:DM Sans'>To authenticate "+provider+" click <a href=/connectService"+params+">here</a></h2>");
  res.end();
});

exports.connectService = functions.https.onRequest(async (req, res) => {
  // Dev calls this service with parameters: user-id, dev-id, service to
  // authenticate and URL to redirect to at the end of the call
  // in form:  us-central1-rove.cloudfunctions.net/connectService?
  // userId=***&devId=***&devKey=***&provider=***
  let transactionId = (Url.parse(req.url, true).query)["transactionId"];
  const isRedirect = (Url.parse(req.url, true).query)["isRedirect"];
  let parameters = {};
  if (transactionId == undefined) {
    parameters.provider = (Url.parse(req.url, true).query)["provider"];
    parameters.devId = (Url.parse(req.url, true).query)["devId"];
    parameters.userId = (Url.parse(req.url, true).query)["userId"];
    parameters.devKey = (Url.parse(req.url, true).query)["devKey"] || null;
    parameters.redirectUrl = (Url.parse(req.url, true).query)["redirectUrl"] || null;
  } else {
    parameters = await getParametersFromTransactionId(transactionId);
    updateTransactionWithStatus(transactionId, "userClickedAuthButton");
  }
  let url = "";
  console.log(callbackBaseUrl);
  // parameter checks
  // first check developer exists and the devKey matches
  if (parameters.devId != null) {
    const devDoc = await admin.firestore()
        .collection("developers")
        .doc(parameters.devId)
        .get();

    if (!devDoc.exists) {
      url =
         "error: the developerId was badly formatted, missing or not authorised";
      res.status(400);
      res.send(url);
      return;
    }
    if (devDoc.data().devKey != parameters.devKey|| parameters.devKey == null) {
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
  if (parameters.userId == null) {
    url = "error: the userId parameter is missing";
    res.status(400);
    res.send(url);
    return;
  }
  const providers = ["strava", "garmin", "polar", "wahoo"];
  if (providers.includes(parameters.provider) == false) {
    url = "error: the provider was badly formatted, missing or not supported";
    res.status(400);
    res.send(url);
    return;
  }
  // now all parameters are checked create transaction
  // if one not already created
  if (transactionId == undefined) {
    transactionId = await createTransactionWithParameters(parameters);
  }
  // redirect to splash page if isRedirect is not set
  if (isRedirect == undefined || isRedirect == false) {
    // call redirect with the transaction id
    res.redirect(callbackBaseUrl+"/redirectPage?transactionId="+transactionId+"&provider="+parameters.provider+"&devId="+parameters.devId);
    return;
  }

  // compose the redirect url for the user.
  if (parameters.provider == "strava") {
    url = await stravaOauth(parameters, transactionId);
  } else if (parameters.provider == "garmin") {
    url = await garminOauth(parameters, transactionId);
  } else if (parameters.provider == "polar") {
    url = await polarOauth(parameters, transactionId);
  } else if (parameters.provider == "wahoo") {
    url = await wahooOauth(parameters, transactionId);
  } else {
    // the request was badly formatted with incorrect provider parameter
    url = "error: the provider was badly formatted, missing or not supported";
  }
  // send back URL to user device.
  res.redirect(url);
});

exports.disconnectService = functions.https.onRequest(async (req, res) => {
  const provider = (Url.parse(req.url, true).query)["provider"];
  const devId = (Url.parse(req.url, true).query)["devId"];
  const userId = (Url.parse(req.url, true).query)["userId"];
  const devKey = (Url.parse(req.url, true).query)["devKey"];

  let message = "";
  let userDoc;

  // parameter checks
  // first check developer exists and the devKey matches
  if (devId != null) {
    const devDoc = await admin.firestore()
        .collection("developers")
        .doc(devId)
        .get();

    if (!devDoc.exists) {
      message =
        "error: the developerId was badly formatted, missing or not authorised";
      res.status(400);
      res.send(message);
      return;
    }
    if (devDoc.data().devKey != devKey|| devKey == null) {
      message =
        "error: the developerId was badly formatted, missing or not authorised";
      res.status(400);
      res.send(message);
      return;
    }
  } else {
    message = "error: the developerId parameter is missing";
    res.status(400);
    res.send(message);
    return;
  }
  // now check the userId has been given
  if (userId != null) {
    const userDocId = devId+userId;
    userDoc = await admin.firestore()
        .collection("users")
        .doc(userDocId)
        .get();

    if (!userDoc.exists) {
      message =
        "error: the userId was badly formatted or does not exist";
      res.status(400);
      res.send(message);
      return;
    }
  } else {
    message = "error: the userId parameter is missing";
    res.status(400);
    res.send(message);
    return;
  }

  const providers = ["strava", "garmin", "polar", "wahoo"];
  // check if this user is authorized already
  // if they are then deauthorize and respond with success/failure message
  // if they are not then error - user not authorised with this provider
  if (providers.includes(provider) == true) {
    const userDocData = userDoc.data();
    let result;
    if (provider == "strava") {
      // deauth for Strava.
      // TODO check user is already authorised
      if (userDocData["strava_connected"] == true) {
        result = await deleteStravaActivity(userDoc, false);
        // check success or fail. result 200 is success 400 is failure
      } else {
        // error the user is not authorizes already
      }
    } else if (provider == "garmin") {
      if (userDocData["garmin_connected"] == true) {
        result = await deleteGarminActivity(userDoc, false);
        // check success or fail. result 200 is success 400 is failure
        if (result == 200) {
          res.status(200);
          message = JSON.stringify({status: "disconnected"});
        } else {
          res.status(result);
          message = "error: unexpected problem";
        }
      } else {
        res.status(400);
        message = "error: the userId was not authorised for this provider";
        // error the user is not authorizes already
      }
    } else if (provider == "polar") {
      if (userDocData["polar_connected"] == true) {
        result = await deletePolarActivity(userDoc, false);
        // check success or fail. result 200 is success 400 is failure
        if (result == 200) {
          res.status(200);
          message = JSON.stringify({status: "disconnected"});
        } else {
          res.status(result);
          message = "error: unexpected problem";
        }
      } else {
        res.status(400);
        message = "error: the userId was not authorised for this provider";
        // error the user is not authorizes already
      }
    } else if (provider == "wahoo") {
      if (userDocData["wahoo_connected"] == true) {
        result = await deleteWahooActivity(userDoc, false);
        // check success or fail. result 200 is success 400 is failure
        if (result == 200) {
          res.status(200);
          message = JSON.stringify({status: "disconnected"});
        } else {
          res.status(result);
          message = "error: unexpected problem";
        }
      } else {
        res.status(400);
        message = "error: the userId was not authorised for this provider";
        // error the user is not authorizes already
      }
    }
  } else {
    // the request was badly formatted with incorrect provider parameter
    message = "error: the provider was badly formatted, missing or not supported";
    res.status(400);
  }
  // send back message to user device.
  res.send(message);
  return;
});

async function deleteStravaActivity(userDoc, webhookCall) {
  const devId = await userDoc.data()["devId"];
  const secretLookup = await db.collection("developers").doc(devId).get();
  const lookup = await secretLookup.data()["secret_lookup"];
  stravaApi.config({
    "client_id": configurations[lookup]["stravaClientId"],
    "client_secret": configurations[lookup]["stravaClientSecret"],
    "redirect_uri": callbackBaseUrl+"/stravaCallback",
  });
  // delete activities
  // check if this is the last user with this stravaId and this is not a call from the webhook
  let accessToken = userDoc.data()["strava_access_token"];
  if (!webhookCall) {
    const userQueryList = await db.collection("users").
        where("strava_id", "==", userDoc.data()["strava_id"])
        .get();
    if ( userQueryList.docs.length == 1) {
      if (await checkStravaTokens(userDoc.id, db) == true) {
        // token out of date, make request for new ones.
        const payload = await stravaApi.oauth.refreshToken(userDoc.data()["strava_refresh_token"]);
        await stravaTokenStorage(userDoc.id, payload, db);
        accessToken = payload["access_token"];
      }
      const deAuthResponse = await stravaApi.oauth.deauthorize({"access_token": accessToken});
      // response contains just the access_token from strava to verify success
      if (deAuthResponse.access_token != accessToken) {
        return 400;
      }
    }
  }
  // Delete Strava keys and activities.
  await userDoc.ref.update({
    strava_access_token: admin.firestore.FieldValue.delete(),
    strava_connected: admin.firestore.FieldValue.delete(),
    strava_refresh_token: admin.firestore.FieldValue.delete(),
    strava_token_expires_at: admin.firestore.FieldValue.delete(),
    strava_token_expires_in: admin.firestore.FieldValue.delete(),
    strava_id: admin.firestore.FieldValue.delete(),
  });

  const activities = await userDoc.ref.collection("activities")
      .where("sanitised.data_source", "==", "strava")
      .get();
  activities.forEach(async (doc)=>{
    await doc.ref.delete();
  });

  // if all successful send to developers sendToDeauthoriseWebhook.
  // userId, provider, status: deauthorised
  const response = await sendToDeauthoriseWebhook(userDoc, "strava", 0);
  return response; // 200 success, 400 failure
}

async function deleteGarminActivity(userDoc, webhookCall) {
  if (!webhookCall) {
    const userQueryList = await db.collection("users").
        where("garmin_access_token",
            "==",
            userDoc.data()["garmin_access_token"])
        .get();
    if (userQueryList.docs.length == 1) {
    // send post to garmin to de-auth.
      const response = await deleteGarminUser(userDoc);
      // check success if fail return 400
      if (response.statusCode != 204) {
        return 400;
      }
    }
  }
  try {
    // delete garmin keys and activities.
    await db.collection("users").doc(userDoc.id).update({
      garmin_access_token: admin.firestore.FieldValue.delete(),
      garmin_access_token_secret: admin.firestore.FieldValue.delete(),
      garmin_connected: admin.firestore.FieldValue.delete(),
      garmin_user_id: admin.firestore.FieldValue.delete(),
    });
    // delete activities from provider.
    const activities = await userDoc.ref.collection("activities")
        .where("sanitised.data_source", "==", "garmin")
        .get();
    activities.forEach(async (doc)=>{
      await doc.ref.delete();
    });
    await sendToDeauthoriseWebhook(userDoc);
    return 200; // 200 success, 400 failure
  } catch (error) {
    return 400;
  }
}
async function deleteGarminUser(userDoc) {
  // console.log(oauth_timestamp);
  const devDoc = await db.collection("developers").doc(userDoc.data()["devId"]).get();
  const lookup = devDoc.data()["secret_lookup"];
  const options = encodeparams.garminCallOptions(
      "https://apis.garmin.com/wellness-api/rest/user/registration",
      "DELETE",
      configurations[lookup]["consumerSecret"],
      configurations[lookup]["oauth_consumer_key"],
      userDoc.data()["garmin_access_token"],
      userDoc.data()["garmin_access_token_secret"],
  );
  try {
    const response = await got.delete(options);
    if (response.statusCode == 204) {
      return response;
    } else {
      return 400;
    }
  } catch (error) {
    console.log("Error deleting garmin user Id for "+userDoc.data()["userId"]);
    return 400;
  }
}

async function deletePolarActivity(userDoc, webhookCall) {
  const userQueryList = await db.collection("users").
      where("polar_user_id", "==", userDoc.data()["polar_user_id"])
      .get();
  if (userQueryList.docs.length == 1) {
    try {
      const accessToken = userDoc.data()["polar_access_token"];
      const options = {
        url: "https://www.polaraccesslink.com/v3/users/"+
            userDoc.data()["polar_user_id"],
        method: "DELETE",
        headers: {
          "Accept": "application/json",
          "Authorization": "Bearer " + accessToken,
        },
      };
      const deAuthResponse = await got.delete(options);
      if (deAuthResponse.statusCode != 204) {
        return 400;
      }
    } catch (error) {
      if (error == 401) { // unauthorised
        // consider refreshing the access code and trying again
      }
      return 400;
    }
  }
  // delete polar keys and activities
  try {
    await userDoc.ref.update({
      polar_access_token: admin.firestore.FieldValue.delete(),
      polar_connected: admin.firestore.FieldValue.delete(),
      polar_refresh_token: admin.firestore.FieldValue.delete(),
      polar_token_expires_in: admin.firestore.FieldValue.delete(),
      polar_token_expires_at: admin.firestore.FieldValue.delete(),
      polar_user_id: admin.firestore.FieldValue.delete(),
      polar_registration_date: admin.firestore.FieldValue.delete(),
      polar_token_type: admin.firestore.FieldValue.delete(),
    });
    // delete activities from provider.
    const activities = await userDoc.ref.collection("activities")
        .where("sanitised.data_source", "==", "polar")
        .get();
    activities.forEach(async (doc)=>{
      await doc.ref.delete();
    });
    await sendToDeauthoriseWebhook(userDoc, "polar", 0);
    return 200;
  } catch (error) {
    return 400;
  }
}

async function deleteWahooActivity(userDoc) {
  const userQueryList = await db.collection("users").
      where("wahoo_user_id", "==", userDoc.data()["wahoo_user_id"])
      .get();
  if (userQueryList.docs.length == 1) {
    try {
      const accessToken = await oauthWahoo.getUserToken(userDoc);
      const options = {
        url: "https://api.wahooligan.com/v1/permissions",
        method: "DELETE",
        headers: {
          "Accept": "application/json",
          "Authorization": "Bearer " + accessToken,
        },
      };
      const deAuthResponse = await got.delete(options).json();
      if (deAuthResponse.success != "Application has been revoked") {
        return 400;
      }
    } catch (error) {
      if (error == 401) { // unauthorised
        // consider refreshing the access code and trying again
      }
      return 400;
    }
  }
  try {
    // delete wahoo keys and activities
    await db.collection("users").doc(userDoc.id).update({
      wahoo_access_token: admin.firestore.FieldValue.delete(),
      wahoo_connected: admin.firestore.FieldValue.delete(),
      wahoo_refresh_token: admin.firestore.FieldValue.delete(),
      wahoo_token_expires_in: admin.firestore.FieldValue.delete(),
      wahoo_token_expires_at: admin.firestore.FieldValue.delete(),
      wahoo_created_at: admin.firestore.FieldValue.delete(),
      wahoo_user_id: admin.firestore.FieldValue.delete(),
    });
    // delete activities from provider.
    const activities = await userDoc.ref.collection("activities")
        .where("sanitised.data_source", "==", "wahoo")
        .get();
    activities.forEach(async (doc)=>{
      await doc.ref.delete();
    });
    await sendToDeauthoriseWebhook(userDoc, "wahoo", 0);
    return 200;
  } catch (error) {
    return 400;
  }
}

async function sendToDeauthoriseWebhook(userDoc, provider, triesSoFar) {
  // get endpoint
  // send message to endpoint
  // retry if do not get 200 ok back
  const MaxRetries = 3;
  const devId = userDoc.data()["devId"];
  const userId = userDoc.data()["userId"];
  const datastring = {
    provider: provider,
    status: "disconnected",
    userId: userId,
  };
  const developerDoc = await db.collection("developers").doc(devId).get();
  const endpoint = developerDoc.data()["deauthorise_endpoint"];
  if (endpoint == undefined || endpoint == null) {
    // cannot send to developer as endpoint does not exist
    console.log("Cannot send deauthorise payload to "+devId+" endpoint not provided");
    return;
  }
  const options = {
    method: "POST",
    url: endpoint,
    headers: {
      "Accept": "application/json",
      "Content-type": "application/json",
    },
    body: JSON.stringify(datastring),
  };
  const response = await got(options);
  if (response.statusCode == 200) {
    // the developer accepted the information TODO
    /*
     userDoc.ref
         .collection("activities")
         .doc(activityDoc)
         .set({status: "sent", timestamp: new Date()}, {merge: true}); */
    return 200;
  } else {
    // call the retry functionality and increment the retry counter
    if (triesSoFar <= MaxRetries) {
      console.log("retrying sending to developer");
      wait(waitTime[triesSoFar]);
      sendToDeauthoriseWebhook(userDoc, provider, triesSoFar+1);
    } else {
      // max retries email developer
      console.log("max retries on sending deauthorisation to developer reached - fail");
    }
  }
}

exports.oauthCallbackHandlerGarmin = functions.https
    .onRequest(async (req, res) => {
      const oAuthCallback = Url.parse(req.url, true).query;
      const oauthTokenSecret = oAuthCallback["oauth_token_secret"].split("-");
      const transactionId = oauthTokenSecret[1].split("=")[1];
      const transactionData =
          await getParametersFromTransactionId(transactionId);
      await oauthCallbackHandlerGarmin(oAuthCallback, transactionData);
      const urlString = await successDevCallback(transactionData);
      res.redirect(urlString);
    }),

// callback from strava with token in
exports.stravaCallback = functions.https.onRequest(async (req, res) => {
  // this comes from strava
  // create authorization for user completing oAuth flow.
  const transactionId = (Url.parse(req.url, true).query)["transactionId"];
  const transactionData = await getParametersFromTransactionId(transactionId);
  const code = (Url.parse(req.url, true).query)["code"];
  const userId = transactionData.userId;
  const devId = transactionData.devId;
  if (userId == null || devId == null || code == null) {
    res.send(
        "Error: missing userId of DevId in callback: an unexpected "+
         "error has occurred please close this window and try again");
    return;
  }
  const secretLookup = await db.collection("developers").doc(devId).get();
  const lookup = await secretLookup.data()["secret_lookup"];
  const dataString = "client_id="+
     configurations[lookup]["stravaClientId"]+
     "&client_secret="+
     configurations[lookup]["stravaClientSecret"]+
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
      await getStravaAthleteId(userId, devId, JSON.parse(body));
      // send a response now to endpoint for devId confirming success
      // await sendDevSuccess(devId); //TODO: create dev success post.
      // userResponse = "Some good redirect.";
      const urlString = await successDevCallback(transactionData);
      res.redirect(urlString);
    } else {
      res.send("Error: "+response.statusCode+
         " please close this window and try again");
      // console.log(JSON.parse(body));
      // send an error response to dev.
      // TODO: create dev fail post.
      // userResponse = "Some bad redirect";
    }
  });
});

async function successDevCallback(transactionData) {
  let urlString = "";
  if (transactionData.redirectUrl == null) {
    // if no redirectUrl provided use default from developer
    // document and append userId and provider
    const devDoc = await db.collection("developers").doc(transactionData.devId).get();
    urlString = devDoc.data()["callbackURL"];
    urlString = urlString+"?userId="+transactionData.userId+"&provider="+transactionData.provider;
  } else {
    // use the url string that was sent with the API call
    const url = transactionData.redirectUrl.split("?");
    const baseUrl = url[0];
    if (url.length > 1) {
      urlString = transactionData.redirectUrl+"&";
    } else {
      urlString = transactionData.redirectUrl+"?";
    }
    urlString = urlString+"userId="+transactionData.userId+"&provider="+transactionData.provider;
  }
  return urlString;
}
exports.garminDeregistrations = functions.https.onRequest(async (req, res) => {
  // here we are handed a list of de-registrations with userIds and userAccessTokens.
  const deRegistrations = req.body["deregistrations"];
  for (let i=0; i<deRegistrations.length; i++) {
    const userQuery = await db.collection("users").where("garmin_access_token", "==", deRegistrations[i]["userAccessToken"]).get();
    userQuery.docs.forEach(async (doc) =>{
      const response = await deleteGarminActivity(doc, true);
      res.send(response);
    });
  }
});

exports.garminWebhook = functions.https.onRequest(async (req, res) => {
  if (req.method === "POST") {
    if (!req.debug) {
      functions.logger.info("garmin webhook event received!", {
        query: req.query,
        body: req.body,
      });
    }
    // 1) sanatise
    let sanitisedActivities = [{}];
    try {
      sanitisedActivities = filters.garminSanitise(req.body.activities);
    } catch (error) {
      console.log(error.errorMessage);
      res.status(404);
      res.send("Garmin Activity type not recognised");
      return;
    }
    // now for each sanitised activity send to relevent developer
    // users
    sanitisedActivities.forEach(async (sanitisedActivity, index)=>{
      const userDocsList = [];
      const userQuery = await db.collection("users")
          .where("garmin_access_token", "==", req.body.activities[index].userAccessToken).get();
      userQuery.docs.forEach((doc)=> {
        userDocsList.push(doc);
      });
      // save raw and sanitised activites as a backup for each user
      userDocsList.forEach( async (userDoc)=>{
        sanitisedActivity["userId"] = userDoc.data()["userId"];
        // TODO: this is a bit of a cludge to prevent the userId
        // being written incorrectly in this loop during async
        // firebase writes.
        const localSanitisedActivity = JSON.parse(JSON.stringify(sanitisedActivity));
        const activityDoc = userDoc.ref
            .collection("activities")
            .doc();
        await activityDoc.set({"sanitised": localSanitisedActivity, "raw": req.body.activities[index]});
        const triesSoFar = 0; // this is our first try to write to developer
        await sendToDeveloper(userDoc, localSanitisedActivity, req.body.activities[index], activityDoc, triesSoFar);
      });
    });
    res.status(200);
    res.send("EVENT_RECEIVED");
    return;
  } else if (req.method === "GET") {
    console.log("garmin not authorized");
    res.status(400);
    res.send("Not Authorized");
  }
});

async function stravaStoreTokens(userId, devId, data, db) {
  const userDocId = devId+userId;
  const parameters = {
    "strava_access_token": data["access_token"],
    "strava_refresh_token": data["refresh_token"],
    "strava_token_expires_at": data["expires_at"],
    "strava_token_expires_in": data["expires_in"],
    "strava_connected": true,
    "devId": devId,
    "userId": userId,
  };
  // set tokens for userId doc.
  const userRef = db.collection("users").doc(userDocId);
  await userRef.set(parameters, {merge: true});
  // assign userId for devId.
  // const devRef = db.collection("developers").doc(devId);
  // write resultant message to dev endpoint.
  return;
}
async function getStravaAthleteId(userId, devId, data) {
  // get athlete id from strava.
  const secretLookup = await db.collection("developers").doc(devId).get();
  const lookup = await secretLookup.data()["secret_lookup"];
  stravaApi.config({
    "client_id": configurations[lookup]["stravaClientId"],
    "client_secret": configurations[lookup]["stravaClientSecret"],
    "redirect_uri": callbackBaseUrl+"/stravaCallback",
  });
  const parameters = {
    "access_token": data["access_token"],
  };
  // set tokens for userId doc.
  const userDocId = devId+userId;
  const athleteSummary = await stravaApi.athlete.get(parameters);
  const userRef = db.collection("users").doc(userDocId);
  await userRef.set({"strava_id": athleteSummary["id"]}, {merge: true});
  return;
}

async function stravaOauth(transactionData, transactionId) {
  const userId = transactionData.userId;
  const devId = transactionData.devId;
  // add parameters from user onto the callback redirect.
  const secretLookup = await db.collection("developers").doc(devId).get();
  const lookup = await secretLookup.data()["secret_lookup"];
  const parameters = {
    client_id: configurations[lookup]["stravaClientId"],
    response_type: "code",
    redirect_uri: callbackBaseUrl+
      "/stravaCallback?transactionId="+
      transactionId,
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

async function garminOauth(transactionData, transactionId) {
  const oauthNonce = crypto.randomBytes(10).toString("hex");
  const userId = transactionData.userId;
  const devId = transactionData.devId;
  // console.log(oauth_nonce);
  const oauthTimestamp = Math.round(new Date().getTime()/1000);
  // console.log(oauth_timestamp);
  const secretLookup = await db.collection("developers").doc(devId).get();
  const lookup = await secretLookup.data()["secret_lookup"];
  const consumerSecret = configurations[lookup]["consumerSecret"];
  const parameters = {
    oauth_nonce: oauthNonce,
    oauth_consumer_key: configurations[lookup]["oauth_consumer_key"],
    oauth_timestamp: oauthTimestamp,
    oauth_signature_method: "HMAC-SHA1",
    oauth_version: "1.0",
  };
  const encodedParameters = encodeparams.collectParams(parameters);
  const baseUrl =
     "https://connectapi.garmin.com/oauth-service/oauth/request_token";
  const baseString = encodeparams
      .baseStringGen(encodedParameters, "POST", baseUrl);
  const encodingKey = consumerSecret + "&";
  const signature = crypto.createHmac("sha1", encodingKey)
      .update(baseString).digest().toString("base64");
  const encodedSignature = encodeURIComponent(signature);
  const url =
     "https://connectapi.garmin.com/oauth-service/oauth/request_token?oauth_consumer_key="+
     configurations[lookup]["oauth_consumer_key"]+
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
    response = await got.post(url);
  } catch (error) {
    console.log(error.response.body);
    return error.response.body;
  }
  const oauthTokens = response.body.split("&");
  // set callbackURL for garmin Oauth with token and userId and devId.
  const callbackURL =
      "oauth_callback="+
      callbackBaseUrl+
      "/oauthCallbackHandlerGarmin?"+
      oauthTokens[1]+
      "-transactionId="+transactionId;
  // append to oauth garmin url.
  const _url = "https://connect.garmin.com/oauthConfirm?"+
      oauthTokens[0]+
      "&"+
      callbackURL;
  return _url;
}

async function polarOauth(transactionData, transactionId) {
  const userId = transactionData.userId;
  const devId =transactionData.devId;
  const secretLookup = await db.collection("developers").doc(devId).get();
  const lookup = await secretLookup.data()["secret_lookup"];
  // add parameters from user onto the callback redirect.
  const parameters = {
    client_id: configurations[lookup]["polarClientId"],
    response_type: "code",
    redirect_uri: callbackBaseUrl+"/polarCallback",
    scope: "accesslink.read_all",
    state: transactionId,
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
  const transactionId = (Url.parse(req.url, true).query)["state"];
  const transactionData = await getParametersFromTransactionId(transactionId);
  const code = (Url.parse(req.url, true).query)["code"];
  const error = (Url.parse(req.url, true).query)["error"];
  const userId = transactionData.userId;
  const devId = transactionData.devId;
  if (error != null) {
    res.send("Error: "+error+" please try again");
    return;
  } else if (userId == null || devId == null || code == null) {
    res.send("Error: missing userId or DevId in callback: an unexpected error has occurred please close this window and try again");
    return;
  }
  const secretLookup = await db.collection("developers").doc(devId).get();
  const lookup = await secretLookup.data()["secret_lookup"];
  const clientIdClientSecret = configurations[lookup]["polarClientId"]+":"+configurations[lookup]["polarSecret"];
   const buffer = new Buffer.from(clientIdClientSecret); // eslint-disable-line
  const base64String = buffer.toString("base64");

  const dataString = "code="+
     code+
     "&grant_type=authorization_code"+
     "&redirect_uri="+callbackBaseUrl+"/polarCallback";
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
      const urlString = await successDevCallback(transactionData);
      res.redirect(urlString);
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
      const userDocId = devId+userId;
      const userRef = db.collection("users").doc(userDocId);
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
  const now = new Date();
  const userDocId = devId+userId;
  const parameters = {
    "polar_access_token": data["access_token"],
    "polar_token_type": data["token_type"],
    "polar_token_expires_at": Math.round(now/1000)+data["expires_in"],
    // need to calculate from the expires in which is in seconds from now.
    "polar_token_expires_in": data["expires_in"],
    "polar_connected": true,
    "polar_user_id": data["x_user_id"],
    "devId": devId,
    "userId": userId,
  };
  // set tokens for user doc.
  const userRef = db.collection("users").doc(userDocId);
  await userRef.set(parameters, {merge: true});
  // assign userId for devId.
  // const devRef = db.collection("developers").doc(devId);
  // write resultant message to dev endpoint.
  return;
}

async function wahooOauth(transactionData, transactionId) {
  const userId = transactionData.userId;
  const devId = transactionData.devId;
  // add parameters from user onto the callback redirect.
  await oauthWahoo.setDevUser(transactionData, transactionId);
  return oauthWahoo.redirectUrl;
}

exports.wahooCallback = functions.https.onRequest(async (req, res) => {
  // recreate the oauth object that is managing the Oauth flow
  const transactionId = (Url.parse(req.url, true).query)["state"];
  const transactionData = await getParametersFromTransactionId(transactionId);
  const data = Url.parse(req.url, true).query;
  await oauthWahoo.fromCallbackData(data, transactionData);
  if (oauthWahoo.status.gotCode) {
    await oauthWahoo.getAndSaveAccessCodes();
  }
  if (!oauthWahoo.error) {
    const urlString = await successDevCallback(transactionData);
    res.redirect(urlString);
  } else {
    res.send(oauthWahoo.errorMessage);
  }
});

exports.stravaWebhook = functions.https.onRequest(async (request, response) => {
  stravaApi.config({
    "client_id": configurations["roveLiveSecrets"]["stravaClientId"],
    "client_secret": configurations["roveLiveSecrets"]["stravaClientSecret"],
    "redirect_uri": callbackBaseUrl+"/stravaCallback",
  });
  if (request.method === "POST") {
    if (!request.debug) {
      functions.logger.info("webhook event received!", {
        body: request.body,
      });
    }
    let stravaAccessToken;
    // get userbased on userid. (.where("id" == request.body.owner_id)).
    // if the status is a delete then do nothing.
    if (request.body.aspect_type == "delete") {
      response.status(200);
      response.send();
      return;
    }
    const userDoc = await db.collection("users").where("strava_id", "==", request.body.owner_id).get();
    // if user de-authorizing.
    const userDocRef = userDoc.docs[0];
    if (userDoc.docs.length == 1) {
      stravaAccessToken = userDocRef.data()["strava_access_token"];
    } else {
      // there is an issue if there is more than one user with a userId in the DB.
      console.log("error in number of users registered to strava webhook: " + request.body.owner_id);
      return;
    }
    // console.log(stravaAccessToken);
    // check the tokens are valid
    let activity;
    let sanitisedActivity;
    if (await checkStravaTokens(userDocRef.id, db) == true) {
      // token out of date, make request for new ones.
      const payload = await stravaApi.oauth.refreshToken(userDocRef.data()["strava_refresh_token"]);
      await stravaTokenStorage(userDocRef.id, payload, db);
      const payloadAccessToken = payload["access_token"];
      if ("authorized" in request.body.updates) {
        console.log("de-auth event");
        const result = await deleteStravaActivity(userDocRef, true);
        response.status(result);
        response.send();
        return;
      } else {
        activity = await stravaApi.activities.get({"access_token": payloadAccessToken, "id": request.body.object_id});
        sanitisedActivity = filters.stravaSanitise([activity]);
        sanitisedActivity[0]["userId"] = userDocRef.data()["userId"];
      }
    } else {
      // token in date, can get activities as required.
      if ("authorized" in request.body.updates) {
        console.log("de-auth event");
        const result = await deleteStravaActivity(userDocRef, true);
        response.status(result);
        response.send();
        return;
      } else {
        activity = await stravaApi.activities.get({"access_token": stravaAccessToken, "id": request.body.object_id});
        sanitisedActivity = filters.stravaSanitise([activity]);
        sanitisedActivity[0]["userId"] = userDocRef.data()["userId"];
      }
    }
    // save to a doc
    const activityDoc = userDocRef.ref.collection("activities").doc();
    await activityDoc.set({"raw": activity, "sanitised": sanitisedActivity[0]});
    // Send the information to an endpoint specified by the dev registered to a user.
    response.status(200);
    response.send("OK!");
    await sendToDeveloper(userDocRef,
        sanitisedActivity[0],
        activity,
        activityDoc,
        0);
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
    if (!request.debug) {
      functions.logger.info("---> Wahoo 'POST' webhook event received!", {
        query: request.query,
        body: request.body,
      });
    }
    // check the webhook token is correct
    // TODO: parameterise - should be a lookup in a collection("wahooWebhookTokens")
    if (request.body.webhook_token != "97661c16-6359-4854-9498-a49c07b6ec11") {
      console.log("Wahoo Webhook event recieved that did not have the correct webhook token");
      response.status(401);
      response.send("NOT AUTHORISED");
      return;
    }
    const userDocsList = [];
    const userQuery = await db.collection("users")
        .where("wahoo_user_id", "==", request.body.user.id).get();
    userQuery.docs.forEach((doc)=>{
      userDocsList.push(doc);
    });
    // now we have a list of user Id's that are interested in this
    //  data
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
    // save raw and sanitised activites as a backup for each user
    userDocsList.forEach(async (userDoc)=>{
      sanitisedActivity["userId"] = userDoc.data()["userId"];
      // TODO: this is a bit of a cludge to prevent the userId
      // being written incorrectly in this loop during async
      // firebase writes.
      const localSanitisedActivity = JSON.parse(JSON.stringify(sanitisedActivity));
      const activityDoc = userDoc.ref
          .collection("activities")
          .doc();
      await activityDoc.set({"sanitised": localSanitisedActivity, "raw": request.body});
      const triesSoFar = 0; // this is our first try to write to developer
      await sendToDeveloper(userDoc, localSanitisedActivity, request.body, activityDoc, triesSoFar);
    });
    response.status(200);
    response.send("EVENT_RECEIVED");
    return;
  } else {
    if (!request.debug) {
      functions.logger.info("---> Wahoo 'GET' webhook event received!", {
        query: request.query,
        body: request.body,
      });
    }
    response.status(200);
    response.send("EVENT_RECEIVED");
  }
});

exports.polarWebhook = functions.https.onRequest(async (request, response) => {
  if (request.method === "POST") {
    if (!request.debug) {
      functions.logger.info("---> polar 'POST' webhook event received!", {
        query: request.query,
        body: request.body,
      });
    }
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
        sanitisedActivity = filters.polarSanatise(activity);
      } catch (error) {
        console.log(error.errorMessage);
        response.status(404);
        response.send("Error reading Polar Activity");
        return;
      }
      // write sanitised information and raw information to each user and then
      // send to developer
      userDocsList.forEach(async (userDoc)=>{
        sanitisedActivity["userId"] = userDoc.data()["userId"];
        // TODO: this is a bit of a cludge to prevent the userId
        // being written incorrectly in this loop during async
        // firebase writes.
        const localSanitisedActivity = JSON.parse(JSON.stringify(sanitisedActivity));
        const activityDoc = userDoc
            .ref.collection("activities")
            .doc();
        await activityDoc.set({"sanitised": localSanitisedActivity, "raw": activity});
        const triesSoFar = 0; // this is our first try to write to developer
        await sendToDeveloper(userDoc, localSanitisedActivity, activity, activityDoc, triesSoFar);
      });
    }
    response.status(200);
    response.send("OK");
  } else {
    if (!request.debug) {
      functions.logger.info("---> polar 'GET' webhook event received!", {
        query: request.query,
        body: request.body,
      });
    }
    response.status(200);
    response.send("OK");
  }
});

async function sendToDeveloper(userDoc,
    sanitisedActivity,
    activity,
    activityDoc,
    triesSoFar) {
  const MaxRetries = 3;
  const devId = userDoc.data()["devId"];
  const datastring = {"sanitised": sanitisedActivity, "raw": activity};
  const developerDoc = await db.collection("developers").doc(devId).get();
  const endpoint = developerDoc.data()["endpoint"];
  const userData = userDoc.data();
  // check if the user is from notion.
  if (userData["userId"] == "notion") {
    notion.sendToNotionEndpoint(endpoint, developerDoc, sanitisedActivity);
  } else {
    if (endpoint == undefined || endpoint == null) {
    // cannot send to developer as endpoint does not exist
      console.log("Cannot send webhook payload to "+devId+" endpoint not provided");
      return;
    }
    const options = {
      method: "POST",
      url: endpoint,
      headers: {
        "Accept": "application/json",
        "Content-type": "application/json",
      },
      body: JSON.stringify(datastring),
    };
    const response = await got.post(options);
    if (response.statusCode == 200) {
    // the developer accepted the information TODO
      activityDoc
          .set({status: "sent", timestamp: new Date().toISOString()},
              {merge: true});
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

exports.createNotionLink = functions.https.onRequest(async (req, res) => {
  const databaseId = (Url.parse(req.url, true).query)["databaseId"];
  const provider = (Url.parse(req.url, true).query)["provider"];
  const key = (Url.parse(req.url, true).query)["key"];
  // we need to create a new dev and a new user linked to this dev for the notion user.
  // the endpoint of notion should be written in.

  // create dev with secret_lookup notionUeser.
  await db.collection("developers").doc(databaseId).set({
    "secret_lookup": "roveLiveSecrets",
    "callbackURL": "https://notion.so",
    "deauthorize_endpoint": "",
    "devKey": key,
    "email": "",
    "endpoint": databaseId});
  // create user
  await db.collection("users").doc(databaseId+"notion").set({
    "devId": databaseId,
    "userId": "notion",
  });
  // redirect the user to connectService with new dev and user credentials.
  res.redirect("/connectService?userId="+databaseId+"notion"+"&devId="+databaseId+"&provider="+provider+"&devKey="+key);
});

async function polarWebhookUtility(devId, action, webhookId) {
  const secretLookup = await db.collection("developers").doc(devId).get();
  const lookup = await secretLookup.data()["secret_lookup"];
  const clientIdClientSecret = configurations[lookup]["polarClientId"]+":"+configurations[lookup]["polarSecret"];
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

async function oauthCallbackHandlerGarmin(oAuthCallback, transactionData) {
  const oauthNonce = crypto.randomBytes(10).toString("hex");
  // console.log(oauth_nonce);
  const oauthTimestamp = Math.round(new Date().getTime()/1000);
  // console.log(oauth_timestamp);
  let oauthTokenSecret = oAuthCallback["oauth_token_secret"].split("-");
  const userId = transactionData.userId;
  const devId = transactionData.devId;
  const secretLookup = await db.collection("developers").doc(devId).get();
  const lookup = await secretLookup.data()["secret_lookup"];
  const consumerSecret = configurations[lookup]["consumerSecret"];
  const oauthConsumerKey = configurations[lookup]["oauth_consumer_key"];
  oauthTokenSecret = oauthTokenSecret[0];
  const parameters = {
    oauth_nonce: oauthNonce,
    oauth_verifier: oAuthCallback["oauth_verifier"],
    oauth_token: oAuthCallback["oauth_token"],
    oauth_consumer_key: oauthConsumerKey,
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
  const url = "https://connectapi.garmin.com/oauth-service/oauth/access_token?oauth_consumer_key="+oauthConsumerKey+"&oauth_nonce="+oauthNonce.toString()+"&oauth_signature_method=HMAC-SHA1&oauth_timestamp="+oauthTimestamp.toString()+"&oauth_signature="+encodedSignature+"&oauth_verifier="+oAuthCallback["oauth_verifier"]+"&oauth_token="+oAuthCallback["oauth_token"]+"&oauth_version=1.0";
  const response = await got.post(url);
  // console.log(response.body);
  await firestoreData(response.body, userId, devId);
  async function firestoreData(data, userId, devId) {
    data = data.split("=");
    // console.log(data);
    const garminAccessToken = (data[1].split("&"))[0];
    const garminAccessTokenSecret = data[2];
    const userDocId = devId+userId;
    const garminUserId = await getGarminUserId(consumerSecret, oauthConsumerKey, garminAccessToken, garminAccessTokenSecret);
    const firestoreParameters = {
      "devId": devId,
      "userId": userId,
      "garmin_access_token": garminAccessToken,
      "garmin_access_token_secret": garminAccessTokenSecret,
      "garmin_connected": true,
      "garmin_user_id": garminUserId,
    };
    await db.collection("users").doc(userDocId).set(firestoreParameters, {merge: true});

    return true;
  }
}

async function checkStravaTokens(userDocId, db) {
  const tokens = await db.collection("users").doc(userDocId).get();
  const expiry = tokens.data().strava_token_expires_at;
  const now = new Date().getTime()/1000; // current epoch in seconds
  if (now > expiry) {
    return true;
  } else {
    return false;
  }
}
async function stravaTokenStorage(userDocId, data, db) {
  const parameters = {
    "strava_access_token": data["access_token"],
    "strava_refresh_token": data["refresh_token"],
    "strava_token_expires_at": data["expires_at"],
    "strava_token_expires_in": data["expires_in"],
    "strava_connected": true,
  };
  await db.collection("users").doc(userDocId).set(parameters, {merge: true});
}
async function getGarminUserId(consumerSecret, oauthConsumerKey, garminAccessToken, garminAccessTokenSecret) {
  let garminUserId = "";
  const options = encodeparams.garminCallOptions(
      "https://apis.garmin.com/wellness-api/rest/user/id",
      "GET",
      consumerSecret, // ROVE consumer secret
      oauthConsumerKey, // ROVE consumer key
      garminAccessToken, // users Access Token
      garminAccessTokenSecret, // users token secret
      {from: 0, to: 0}); // dates in seconds since epoch

  try {
    const response = await got.get(options);
    if (response.statusCode == 200) {
      garminUserId = JSON.parse(response.body).userId;
    }
  } catch (error) {
    console.log("Error getting garmin user Id");
  }
  return garminUserId;
}

async function getParametersFromTransactionId(transactionId) {
  const transactionDoc =
      await db.collection("transactions")
          .doc(transactionId)
          .get();
  const parameters = {
    devId: transactionDoc.data()["devId"],
    userId: transactionDoc.data()["userId"],
    devKey: transactionDoc.data()["devKey"],
    provider: transactionDoc.data()["provider"],
    redirectUrl: transactionDoc.data()["redirectUrl"],
  };
  return parameters;
}

async function updateTransactionWithStatus(transactionId, status) {
  const now = new Date().toISOString();
  db.collection("transactions")
      .doc(transactionId)
      .set({status: now}, {merge: true});
}

async function createTransactionWithParameters(parameters) {
  parameters.receivedConnectServiceCall = new Date().toISOString();
  const transactionRef = db.collection("transactions").doc();
  await transactionRef
      .set(parameters);
  return transactionRef.id;
}


// Utility Functions and Constants -----------------------------
const waitTime = {0: 0, 1: 1, 2: 10, 3: 60}; // time in minutes
const wait = (mins) => new Promise((resolve) => setTimeout(resolve, mins*60*1000));
