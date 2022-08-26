/* eslint-disable no-useless-catch */
/* eslint-disable no-prototype-builtins */
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
const fitDecoder = require("fit-decoder");
const FitParser = require("fit-file-parser").default;
const configurations = contentsOfDotEnvFile["config"];
// find a way to decrypt and encrypt this information

admin.initializeApp();
const db = admin.firestore();
const storage = admin.storage();

const webhookInBox = require("./webhookInBox");
const getHistoryInBox = require("./getHistoryInBox");
const oauthWahoo = new OauthWahoo(configurations, db);
const callbackBaseUrl = "https://us-central1-"+process.env.GCLOUD_PROJECT+".cloudfunctions.net";
const redirectPageUrl = "https://"+process.env.GCLOUD_PROJECT+".web.app";

// INTEGRATION FOR APP:
// get url response and go through onboarding flow.
// we recieve auth token from strava to stravaCallBack.
// tokens stored under userId

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
  // console.log(callbackBaseUrl);
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
  const providers = ["strava", "garmin", "polar", "wahoo", "coros"];
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
    // go to redirect with the transaction id
    res.redirect(redirectPageUrl+"?transactionId="+transactionId+"&provider="+parameters.provider+"&devId="+parameters.devId+"&userId="+parameters.userId);
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
  } else if (parameters.provider == "coros") {
    url = await corosOauth(parameters, transactionId);
  } else {
    // the request was badly formatted with incorrect provider parameter
    url = "error: the provider was badly formatted, missing or not supported";
  }
  // send back URL to user device.
  res.redirect(url);
});

exports.getActivityList = functions.https.onRequest(async (req, res) => {
  const transactionId = (Url.parse(req.url, true).query)["transactionId"];
  let parameters = {};
  if (transactionId == undefined) {
    parameters.start = (Url.parse(req.url, true).query)["start"];
    parameters.end = (Url.parse(req.url, true).query)["end"];
    parameters.devId = (Url.parse(req.url, true).query)["devId"];
    parameters.userId = (Url.parse(req.url, true).query)["userId"];
    parameters.devKey = (Url.parse(req.url, true).query)["devKey"] || null;
  } else {
    parameters = await getParametersFromTransactionId(transactionId);
    updateTransactionWithStatus(transactionId, "userClickedAuthButton");
  } // TODO: this is unnecessary
  let url = "";
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
  // now check the userId has been given and that it is for a doc that the dev is assigned to.
  const userDoc = await admin.firestore()
      .collection("users")
      .doc(parameters.devId+parameters.userId)
      .get();
  if (parameters.userId == null) {
    url = "error: the userId parameter is missing";
    res.status(400);
    res.send(url);
    return;
  } else {
    if (!userDoc.exists) {
      url =
      "error: the userId was badly formatted, missing or not authorised";
      res.status(400);
      res.send(url);
      return;
    }
    if (userDoc.data()["devId"] != parameters.devId) {
      url =
      "error: the userId was badly formatted, missing or not authorised";
      res.status(400);
      res.send(url);
      return;
    }
  }
  const start = new Date(parameters.start);
  const end = new Date(parameters.end);
  if (start == "Invalid Date" || end == "Invalid Date" || start.getTime() > end.getTime()) {
    url =
    "error: the start/end was badly formatted, or missing";
    res.status(400);
    res.send(url);
    return;
  }
  if (end.getTime() - start.getTime() > (15*24*60*60*1000)) {
    url = "error: the start and end time are too far apart";
    res.status(400);
    res.send(url);
    return;
  }
  // now we need to make a request to the user's authenticated services.
  // TODO: "<provider>_connected" is the way to determine.
  const providersConnected = {"polar": false, "garmin": false, "strava": false, "wahoo": false};
  providersConnected["polar"] = userDoc.data().hasOwnProperty("polar_user_id");
  providersConnected["garmin"] = userDoc.data().hasOwnProperty("garmin_access_token");
  providersConnected["wahoo"] = userDoc.data().hasOwnProperty("wahoo_user_id");
  providersConnected["strava"] = userDoc.data().hasOwnProperty("strava_id");
  // make the request for the services which are authenticated by the user
  try {
    const payload = await requestForDateRange(providersConnected, userDoc, start, end);
    url = "all checks passing";
    res.status(200);
    // write the docs into the database now.
    for (let i = 0; i < payload.length; i++) {
      saveAndSendActivity(userDoc,
          payload[i].sanitised,
          payload[i].raw);
    }
    res.send("OK");
  } catch (error) {
    res.status(400);
    res.send("There was an error: " + error);
  }
  // send to Dev first and then store all the activities.
});

async function requestForDateRange(providers, userDoc, start, end) {
  // we want to synchronously run these functions together
  // so I will create a .then for each to add to an integer.
  let numOfProviders = 0;
  const i = 0;
  let activtyList = [];
  if (providers["strava"]) {
    numOfProviders ++;
    activtyList = activtyList.concat(getStravaActivityList(start, end, userDoc));
  }
  if (providers["garmin"]) {
    numOfProviders ++;
    activtyList = activtyList.concat(getGarminActivityList(start, end, userDoc));
  }
  // sadly Polar is not available to list activities.
  if (providers["wahoo"]) {
    numOfProviders ++;
    activtyList = activtyList.concat(getWahooActivityList(start, end, userDoc));
  }
  if (providers["polar"]) {
    numOfProviders ++;
    activtyList = activtyList.concat(getPolarActivityList(start, end, userDoc));
  }
  try {
    let returnList = await Promise.all(activtyList);
    returnList = returnList.flat();
    return returnList;
  } catch (err) {
    throw err;
  }
}
async function getWahooActivityList(start, end, userDoc) {
  try {
    const accessToken = await oauthWahoo.getUserToken(userDoc);
    const options = {
      url: "https://api.wahooligan.com/v1/workouts",
      method: "GET",
      headers: {
        "Accept": "application/json",
        "Authorization": "Bearer " + accessToken,
      },
    };
    let activityList = await got.get(options);
    activityList = JSON.parse(activityList.body);
    if (activityList.hasOwnProperty("workouts")) {
      // delivers a list of the last 30 workouts...
      // return a sanitised list
      const sanitisedList = [];
      for (let i = 0; i<activityList.workouts.length; i++) {
        sanitisedList.push({"raw": activityList.workouts[i], "sanitised": filters.wahooSanitise(activityList.workouts[i])});
        // TODO: add back in when detail needed
        // sanitisedList[i]["sanitised"]["samples"] = await getDetailedActivity(userDoc.data(), activityList.workouts[i]);
      }
      // now filter for start times
      const startTime = start.getTime();
      const endTime = end.getTime();
      const listOfValidActivities = sanitisedList.filter((element)=>{
        if (new Date(element.sanitised.start_time).getTime() > startTime && new Date(element.sanitised.start_time).getTime() < endTime) {
          return element;
        }
      });
      return listOfValidActivities;
    }
  } catch (error) {
    if (error == 401) { // unauthorised
      // consider refreshing the access code and trying again
    }
    return 400;
  }
}
async function getPolarActivityList(start, end, userDoc) {
  const userToken = userDoc.data()["polar_access_token"];
  try {
    const headers = {
      "Accept": "application/json", "Authorization": "Bearer " + userToken,
    };
    const options = {
      url: "https://www.polaraccesslink.com/v3/exercises",
      method: "GET",
      headers: headers,
    };
    let activityList = await got.get(options);
    activityList = JSON.parse(activityList.body);
    const sanitisedList = [];
    for (let i = 0; i<activityList.length; i++) {
      sanitisedList.push({"raw": activityList[i], "sanitised": filters.polarSanatise(activityList[i])});
      // TODO: just get the file add the samples later when detail is needed
      const detailedSanitisedList = await getDetailedActivity(userDoc.data(), activityList[i], "polar");
      sanitisedList[i]["sanitised"]["file"] = detailedSanitisedList.file;
    }
    const startTime = start.getTime();
    const endTime = end.getTime();
    const listOfValidActivities = sanitisedList.filter((element)=>{
      if (new Date(element.sanitised.start_time).getTime() > startTime && new Date(element.sanitised.start_time).getTime() < endTime) {
        return element;
      }
    });
    return listOfValidActivities;
  } catch (error) {
    if (error == 401) { // unauthorised
      // consider refreshing the access code and trying again
    }
    return 400;
  }
}
async function getGarminActivityList(start, end, userDoc) {
  const url = "https://apis.garmin.com/wellness-api/rest/activities";
  const userDocData = await userDoc.data();
  const devId = userDocData["devId"];
  const secretLookup = await db.collection("developers").doc(devId).get();
  const lookup = await secretLookup.data()["secret_lookup"];
  const consumerSecret = configurations[lookup]["consumerSecret"];
  const oAuthConsumerSecret = configurations[lookup]["oauth_consumer_key"];
  let activityList = [];
  let requestEndTime;
  // we have to run the API call for each day in the call.
  while (start.getTime() < end.getTime()) {
    requestEndTime = new Date(start.getTime() + (24*60*60*1000));
    const options = await encodeparams.garminCallOptions(url, "GET", consumerSecret, oAuthConsumerSecret, userDocData["garmin_access_token"], userDocData["garmin_access_token_secret"], {from: start.getTime()/1000, to: requestEndTime.getTime()/1000});
    let currentActivityList = await got.get(options);
    currentActivityList = JSON.parse(currentActivityList.body);
    activityList = activityList.concat(currentActivityList);
    start = new Date(start.getTime() + (24*60*60*1000));
  }
  const listOfSanitisedActivities = filters.garminSanitise(activityList);
  const listOfValidActivities = [];
  for (let i=0; i< activityList.length; i++) {
    listOfValidActivities.push({"raw": activityList[i], "sanitised": listOfSanitisedActivities[i]});
    // TODO: uncomment when detail needed
    // listOfValidActivities[i]["sanitised"]["samples"] = await getDetailedActivity(userDocData, activityList[i]);
  }
  return listOfValidActivities;
}
async function getStravaActivityList(start, end, userDoc) {
  const userDocData = await userDoc.data();
  const devId = userDocData["devId"];
  const accessToken = userDocData["strava_access_token"];
  const secretLookup = await db.collection("developers").doc(devId).get();
  const lookup = await secretLookup.data()["secret_lookup"];
  stravaApi.config({
    "client_id": configurations[lookup]["stravaClientId"],
    "client_secret": configurations[lookup]["stravaClientSecret"],
    "redirect_uri": callbackBaseUrl+"/stravaCallback",
  });
  const result = await stravaApi.athlete.listActivities({"before": Math.round(end.getTime() / 1000), "after": Math.round(start.getTime() / 1000), "access_token": accessToken});
  const sanitisedActivities = filters.stravaSanitise(result);
  const listOfValidActivities = [];
  for (let i = 0; i<sanitisedActivities.length; i++) {
    listOfValidActivities.push({"raw": result[i], "sanitised": sanitisedActivities[i]});
    // listOfValidActivities[i]["sanitised"]["samples"] = getDetailedActivity(userDocData, result[i]);
  }
  return listOfValidActivities;
}

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

  const providers = ["strava", "garmin", "polar", "wahoo", "coros"];
  // check if this user is authorized already
  // if they are then deauthorize and respond with success/failure message
  // if they are not then error - user not authorised with this provider
  if (providers.includes(provider) == true) {
    const userDocData = userDoc.data();
    let result;
    if (provider == "strava") {
      // deauth for Strava.
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
    } else if (provider == "coros") {
      if (userDocData["coros_connected"] == true) {
        result = await deleteCorosActivity(userDoc, false);
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
      .where("sanitised.provider", "==", "strava")
      .get();
  await activities.forEach(async (doc)=>{
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
        .where("garmin_user_id",
            "==",
            userDoc.data()["garmin_user_id"])
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
        .where("sanitised.provider", "==", "garmin")
        .get();
    activities.forEach(async (doc)=>{
      await doc.ref.delete();
    });
    return await sendToDeauthoriseWebhook(userDoc, "garmin", 0);
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
        .where("sanitised.provider", "==", "polar")
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
        .where("sanitised.provider", "==", "wahoo")
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

async function deleteCorosActivity(userDoc) {
  const userQueryList = await db.collection("users").
      where("coros_id", "==", userDoc.data()["coros_id"])
      .get();
  if (userQueryList.docs.length == 1) {
    try {
      const accessToken = await getCorosToken(userDoc);
      const options = {
        url: "https://open.coros.com/oauth2/deauthorize?token=" + accessToken,
        method: "POST",
      };
      const deAuthResponse = await got.post(options).json();
      if (deAuthResponse.result != "0000") {
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
      coros_access_token: admin.firestore.FieldValue.delete(),
      coros_connected: admin.firestore.FieldValue.delete(),
      coros_refresh_token: admin.firestore.FieldValue.delete(),
      coros_token_expires_in: admin.firestore.FieldValue.delete(),
      coros_token_expires_at: admin.firestore.FieldValue.delete(),
      wahoo_created_at: admin.firestore.FieldValue.delete(),
      coros_id: admin.firestore.FieldValue.delete(),
    });
    // delete activities from provider.
    const activities = await userDoc.ref.collection("activities")
        .where("sanitised.provider", "==", "coros")
        .get();
    activities.forEach(async (doc)=>{
      await doc.ref.delete();
    });
    await sendToDeauthoriseWebhook(userDoc, "coros", 0);
    return 200;
  } catch (error) {
    return 400;
  }
}

async function getCorosToken(userDoc) {
  const userToken = userDoc.data()["coros_access_token"];
  const devId = userDoc.data()["devId"];
  const userId = userDoc.data()["userId"];
  if (userId == undefined || devId == undefined) {
    throw (new Error("error: userId or DevId not set"));
  }
  const expiresAt = userDoc.data()["coros_token_expires_at"];
  if (expiresAt < Date.now()/1000) {
    // out of date token can be refreshed by Coros.
    const secretLookup = await db.collection("developers").doc(devId).get();
    const lookup = await secretLookup.data()["secret_lookup"];
    const options = {
      "headers": {"Content-Type": "application/x-www-form-urlencoded"},
      "form": {
        "client_id": configurations[lookup]["corosClientId"],
        "refresh_token": userDoc.data()["coros_refresh_token"],
        "client_secret": configurations[lookup]["corosSecret"],
        "grant_type": "refresh_token"}};
    const accessCodeResponse = await got.post("https://open.coros.com/oauth2/refresh-token", options).json();
    if (accessCodeResponse.hasOwnProperty("access_token")) {
      const accessToken = await corosStoreTokens(accessCodeResponse, userDoc);
      return accessToken;
    }
  } else {
    return userToken;
  }
}
async function corosStoreTokens(tokens, userDoc) {
  await db.collection("users").doc(userDoc.id).set({
    "coros_connected": true,
    "coros_access_token": tokens["access_token"],
    "coros_refresh_token": tokens["refresh_token"],
    "coros_token_expires_at": Date.now()/1000 + tokens["expires_in"],
    "coros_token_expires_in": tokens["expires_in"],
    "coros_id": tokens["openId"],
  }, {merge: true});
  return tokens["access_token"];
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
    return 400;
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
    return 200;
  } else {
    // call the retry functionality and increment the retry counter
    if (triesSoFar <= MaxRetries) {
      console.log("retrying sending to developer");
      await wait(waitTime[triesSoFar]);
      return await sendToDeauthoriseWebhook(userDoc, provider, triesSoFar+1);
    } else {
      // max retries email developer
      console.log("max retries on sending deauthorisation to developer reached - fail");
      return 400;
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
      await getHistoryInBox.push("garmin",
          transactionData.devId+transactionData.userId);
      const urlString = await successDevCallback(transactionData);
      res.redirect(urlString);
    }),

exports.corosCallback = functions.https.onRequest(async (req, res) => {
  const oAuthCallback = Url.parse(req.url, true).query;
  const code = oAuthCallback["code"];
  const transactionId = oAuthCallback["state"];
  const transactionData =
          await getParametersFromTransactionId(transactionId);
  const secretLookup = await db.collection("developers").doc(transactionData.devId).get();
  const lookup = await secretLookup.data()["secret_lookup"];
  const options = {
    "headers": {"Content-Type": "application/x-www-form-urlencoded"},
    "form": {
      "client_id": configurations[lookup]["corosClientId"],
      "redirect_uri": callbackBaseUrl+"/corosCallback",
      "code": code,
      "client_secret": configurations[lookup]["corosSecret"],
      "grant_type": "authorization_code"}};
  const accessTokens = await got.post("https://open.coros.com/oauth2/accesstoken?", options);
  if (accessTokens.statusCode == 200) {
    const jsonTokens = JSON.parse(accessTokens.body);
    await db.collection("users").doc(transactionData.devId + transactionData.userId).set({
      "devId": transactionData.devId,
      "userId": transactionData.userId,
      "coros_access_token": jsonTokens["access_token"],
      "coros_id": jsonTokens["openId"],
      "coros_refresh_token": jsonTokens["refresh_token"],
      "coros_expires_in": jsonTokens["expires_in"],
      "coros_connected": true,
      "coros_expires_at": (Date.now()/1000) + jsonTokens["expires_in"],
    },
    {merge: true});
  }
  await getHistoryInBox.push("coros",
      transactionData.devId + transactionData.userId);
  res.status(200);
  const urlString = await successDevCallback(transactionData);
  res.redirect(urlString);
  res.send();
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
      await getHistoryInBox.push("strava",
          transactionData.devId+transactionData.userId);
      const urlString = await successDevCallback(transactionData);
      res.redirect(urlString);
    } else {
      res.send("Error: "+response.statusCode+
         " please close this window and try again");
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
  if (!req.debug) {
    functions.logger.info("----> garmin "+req.method+" deregistration webhook event received!", {
      body: req.body,
    });
  }
  const deRegistrations = req.body["deregistrations"];
  const responses = [];
  for (let i=0; i<deRegistrations.length; i++) {
    const userQuery = await db.collection("users")
        .where("garmin_access_token",
            "==",
            deRegistrations[i]["userAccessToken"])
        .where("garmin_user_id",
            "==",
            deRegistrations[i]["userId"])
        .get();
    for (const doc of userQuery.docs) {
      const response = await deleteGarminActivity(doc, true);
      responses.push(response);
    }
  }
  if (responses.every((value) => value == 200)) {
    res.sendStatus(200);
  } else {
    res.sendStatus(400);
  }
});

exports.garminWebhook = functions.https.onRequest(async (request, response) => {
  if (!request.debug) {
    functions.logger.info("----> garmin "+request.method+" webhook event received!", {
      body: request.body,
    });
  }
  if (request.method === "POST") {
    // check the webhook token is correct
    const valid = true;
    if (!valid) { // TODO put in validation function
      console.log("Garmin Webhook event recieved that did not have the correct validation");
      response.status(401);
      response.send("NOT AUTHORISED");
      return;
    }
    // save the webhook message and asynchronously process
    try {
      const webhookDoc = await webhookInBox.push(request, "garmin");
      response.sendStatus(200);
      // now we have saved the request and returned ok to the provider
      // the message will trigger an asynchronous process
    } catch (err) {
      response.sendStatus(400);
      console.log("Error saving webhook message - returned status 400");
    }
  } else {
    response.sendStatus(401);
    console.log("unknown method from Garmin webhook");
  }
});

async function processGarminWebhook(webhookDoc) {
  const webhookBody = JSON.parse(webhookDoc.data()["body"]);
  // 1) sanatise
  let sanitisedActivities = [{}];
  sanitisedActivities = filters.garminSanitise(webhookBody.activities);

  // now for each sanitised activity send to relevent developer
  // users
  let index = 0;
  for (const sanitisedActivity of sanitisedActivities) {
    const userDocsList = [];
    const userQuery = await db.collection("users")
        .where("garmin_user_id", "==",
            webhookBody.activities[index].userId)
        .where("garmin_access_token", "==",
            webhookBody.activities[index].userAccessToken)
        .get();

    if (userQuery.docs.length == 0) {
      // there is an issue if there are no users with a userId in the DB.
      throw Error("zero users registered to garmin webhook userId "+webhookBody.activities[index].userId);
    }
    userQuery.docs.forEach((doc)=> {
      userDocsList.push(doc);
    });
    // TODO: uncomment when detail needed
    // const samples = await getDetailedActivity(userDocsList[0].data(), webhookBody.activities[index], "garmin");
    // sanitisedActivity["samples"] = samples;
    // save raw and sanitised activites as a backup for each user
    for (const userDoc of userDocsList) {
      saveAndSendActivity(userDoc,
          sanitisedActivity,
          webhookBody.activities[index]);
    }
    index=index+1;
  }
  return;
}

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

async function corosOauth(transactionData, transactionId) {
  const userId = transactionData.userId;
  const devId =transactionData.devId;
  const secretLookup = await db.collection("developers").doc(devId).get();
  const lookup = await secretLookup.data()["secret_lookup"];
  // add parameters from user onto the callback redirect.
  const parameters = {
    client_id: configurations[lookup]["corosClientId"],
    response_type: "code",
    redirect_uri: callbackBaseUrl+"/corosCallback",
    state: transactionId,
  };
  //  https://open.coros.com/oauth2/authorize?

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
  const baseUrl = "https://open.coros.com/oauth2/authorize?";
  return (baseUrl + encodedParameters);
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
      await getHistoryInBox.push("polar", devId + userId);
      const urlString = await successDevCallback(transactionData);
      res.redirect(urlString);
    } else {
      res.send("Error: "+response.statusCode+":"+body.toString()+" please close this window and try again");
      console.log(JSON.parse(body));
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
    await getHistoryInBox.push("wahoo", oauthWahoo.userDocId);
    const urlString = await successDevCallback(transactionData);
    res.redirect(urlString);
  } else {
    res.send(oauthWahoo.errorMessage);
  }
});

exports.corosWebhook = functions.https.onRequest(async (request, response) => {
  const webhookDoc = await webhookInBox.push(request, "coros", "roveLiveSecrets");
  response.status(200);
  response.send();
});

exports.corosStatus = functions.https.onRequest(async (request, response) => {
  // a service status request, which at the moment is always ok.
  response.status(200);
  response.send();
});

exports.stravaWebhook = functions.https.onRequest(async (request, response) => {
  if (!request.debug) {
    functions.logger.info("---> Strava "+request.method+" webhook event received!", {
      body: request.body,
    });
  }
  // handle subscription setup
  if (request.method === "GET") {
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
  } else if (request.method === "POST") {
    const stravaWebhook =
        configurations["stravaSubscriptions"][request.body.subscription_id];
    // check the webhook token is correct
    if (stravaWebhook == undefined) {
      console.log("Strava Webhook event recieved that did not have the correct subscription Id");
      response.status(401);
      response.send("NOT AUTHORISED");
      return;
    }
    // save the webhook message and asynchronously process
    try {
      const webhookDoc = await webhookInBox
          .push(request, "strava", stravaWebhook["secret_lookup"]);
      response.sendStatus(200);
      // now we have saved the request and returned ok to the provider
      // the message will trigger an asynchronous process
    } catch (err) {
      response.sendStatus(400);
      console.log("Error saving webhook message - returned status 400");
    }
  } else {
    response.sendStatus(401);
    console.log("unknown method from Wahoo webhook");
  }
});

async function processStravaWebhook(webhookDoc) {
  const webhookBody = JSON.parse(webhookDoc.data()["body"]);
  const lookup = webhookDoc.data()["secret_lookup"];
  const userDocsList = [];
  const devDocsList = [];

  stravaApi.config({
    "client_id": configurations[lookup]["stravaClientId"],
    "client_secret": configurations[lookup]["stravaClientSecret"],
    "redirect_uri": callbackBaseUrl+"/stravaCallback",
  });
  // get userbased on userid. (.where("id" == request.body.owner_id)).
  // if the status is a delete then do nothing.
  if (webhookBody.aspect_type == "delete") {
    return; // TODO: put in delete logic
  }
  const devQuery = await db.collection("developers")
      .where("secret_lookup", "==", lookup)
      .get();
  devQuery.docs.forEach((doc)=>{
    devDocsList.push(doc.id);
  });

  const userQuery = await db.collection("users")
      .where("strava_id", "==", webhookBody.owner_id)
      .get();

  userQuery.docs.forEach((doc)=>{
  // exclude devs that are not managed by this webhook subscription
    if (devDocsList.includes(doc.data()["devId"])) {
      userDocsList.push(doc);
    }
  });

  if (userDocsList.length == 0) {
    // there is an issue if there are no users with a userId in the DB.
    throw Error("zero users registered to strava webhook owner_id "+webhookBody.owner_id);
  }
  // now we have a list of userDoc's that are interested in this
  //  data
  // 1) get data from Strava, 2) sanatise and 3) save and send
  const userDocRef = userQuery.docs[0];
  const stravaAccessToken = userDocRef.data()["strava_access_token"];
  // check the tokens are valid
  let activity;
  let sanitisedActivity;
  if (await checkStravaTokens(userDocRef.id, db) == true) {
    // token out of date, make request for new ones.
    const payload = await stravaApi.oauth.refreshToken(userDocRef.data()["strava_refresh_token"]);
    await stravaTokenStorage(userDocRef.id, payload, db);
    const payloadAccessToken = payload["access_token"];
    if (webhookBody.aspect_type == "update") {
      // TODO process updates
      if ("authorized" in webhookBody.updates) {
        console.log("de-auth event");
        const result = await deleteStravaActivity(userDocRef, true);
        return;
      }
      return;
    }
    activity = await stravaApi.activities
        .get({"access_token": payloadAccessToken, "id": webhookBody.object_id});
    sanitisedActivity = filters.stravaSanitise([activity]);
  } else {
    if (webhookBody.aspect_type == "update") {
      // TODO process updates
      if ("authorized" in webhookBody.updates) {
        console.log("de-auth event");
        const result = await deleteStravaActivity(userDocRef, true);
        return;
      }
      return;
    }
    activity = await stravaApi.activities
        .get({"access_token": stravaAccessToken, "id": webhookBody.object_id});
    sanitisedActivity = filters.stravaSanitise([activity]);
    // TODO: uncomment when detail needed
    // const samples = await getDetailedActivity(userDocsList[0].data(), activity, "strava");
    // sanitisedActivity[0]["samples"] = samples;
  }
  for (const userDoc of userDocsList) {
    saveAndSendActivity(userDoc,
        sanitisedActivity[0],
        activity);
  }
}

exports.wahooWebhook = functions.https.onRequest(async (request, response) => {
  if (!request.debug) {
    functions.logger.info("---> Wahoo "+request.method+" webhook event received!", {
      body: request.body,
    });
  }
  // if POST, record webhook message and respond with 200
  // then process asynchronously
  if (request.method === "POST") {
    // check the webhook token is correct
    const wahooWebhook =
        configurations["wahooWebhookTokens"][request.body.webhook_token];
    if (wahooWebhook == undefined) {
      console.log("Wahoo Webhook event recieved that did not have the correct webhook token");
      response.status(401);
      response.send("NOT AUTHORISED");
      return;
    }
    // save the webhook message and asynchronously process
    try {
      const webhookDoc = await webhookInBox
          .push(request, "wahoo", wahooWebhook["secret_lookup"]);
      response.sendStatus(200);
      // now we have saved the request and returned ok to the provider
      // the message will trigger an asynchronous process
    } catch (err) {
      response.sendStatus(400);
      console.log("Error saving webhook message - returned status 400");
    }
  } else if (request.method === "GET") {
    // if GET respond to webhook initialisation request
    response.status(200);
    response.send("EVENT_RECEIVED");
  } else {
    response.sendStatus(401);
    console.log("unknown method from Wahoo webhook");
  }
});

exports.processWebhookInBox = functions.firestore
    .document("webhookInBox/{docId}")
    .onCreate(async (snap, context) => {
      console.log("processing webhook inbox written to... with doc: "+snap.id);
      // return without processing if the configuration is set to
      // switch the process off
      if (configurations.InBoxRealTimeCheck == true) {
        const webhookInBoxConfig = await db
            .collection("realTimeConfigs")
            .doc("webhookInBox")
            .get();
        if (webhookInBoxConfig.exists) {
          if (webhookInBoxConfig.data()["off"]) {
            return; // no processing should be done
          }
        } else {
          // if the realTimeConfigs is not set up then carry
          // on as normal
        }
      }
      try {
        switch (snap.data()["provider"]) {
          case "strava":
            await processStravaWebhook(snap);
            break;
          case "wahoo":
            await processWahooWebhook(snap);
            break;
          case "polar":
            await processPolarWebhook(snap);
            break;
          case "garmin":
            await processGarminWebhook(snap);
            break;
          case "coros":
            await processCorosWebhook(snap);
        }
        webhookInBox.delete(snap.ref);
      } catch (error) {
        webhookInBox.writeError(snap.ref, error);
      }
      return;
    });
async function processWahooWebhook(webhookDoc) {
  const webhookBody = JSON.parse(webhookDoc.data()["body"]);
  const lookup = webhookDoc.data()["secret_lookup"];
  const userDocsList = [];
  const devDocsList = [];

  const devQuery = await db.collection("developers")
      .where("secret_lookup", "==", lookup)
      .get();
  devQuery.docs.forEach((doc)=>{
    devDocsList.push(doc.id);
  });

  const userQuery = await db.collection("users")
      .where("wahoo_user_id", "==", webhookBody.user.id)
      .get();

  userQuery.docs.forEach((doc)=>{
    // exclude devs that are not managed by this webhook subscription
    if (devDocsList.includes(doc.data()["devId"])) {
      userDocsList.push(doc);
    }
  });

  if (userDocsList.length == 0) {
    // there is an issue if there are no users with a userId in the DB.
    console.log("error: zero users registered to wahoo webhook: " + webhookBody.owner_id);
    throw Error("zero users registered to wahoo webhook owner_id "+webhookBody.user.id);
  }

  // now we have a list of user Id's that are interested in this
  //  data
  // 1) sanatise and 2) send
  const sanitisedActivity = filters.wahooSanitise(webhookBody);
  // TODO: uncomment when detail is needed.
  // const samples = await getDetailedActivity(userDocsList[0].data(), sanitisedActivity, "wahoo");
  // sanitisedActivity["samples"] = samples;

  // save raw and sanitised activites as a backup for each user
  for (const userDoc of userDocsList) {
    await saveAndSendActivity(userDoc,
        sanitisedActivity,
        webhookBody);
  }
  return;
}

async function processCorosWebhook(webhookDoc) {
  const webhookBody = JSON.parse(webhookDoc.data()["body"]);
  const lookup = webhookDoc.data()["secret_lookup"];
  const userDocsList = [];
  const devDocsList = [];

  const devQuery = await db.collection("developers")
      .where("secret_lookup", "==", lookup)
      .get();
  devQuery.docs.forEach((doc)=>{
    devDocsList.push(doc.id);
  });

  const userQuery = await db.collection("users")
      .where("coros_user_id", "==", webhookBody.sportDataList[0].openId)
      .get();

  userQuery.docs.forEach((doc)=>{
    // exclude devs that are not managed by this webhook subscription
    if (devDocsList.includes(doc.data()["devId"])) {
      userDocsList.push(doc);
    }
  });

  if (userDocsList.length == 0) {
    // there is an issue if there are no users with a userId in the DB.
    console.log("error: zero users registered to coros webhook: " + webhookBody.sportDataList[0].openId);
    throw Error("zero users registered to coros webhook owner_id "+webhookBody.user.id);
  }

  // now we have a list of user Id's that are interested in this
  //  data
  // 1) sanatise and 2) send
  let sanitisedActivities = [];
  let currentActivity;
  // return a list of sanitisedActivities
  for (let i = 0; i<webhookBody.sportDataList.length; i++) {
    currentActivity = filters.corosSanatise(webhookBody.sportDataList[i]);
    sanitisedActivities = sanitisedActivities.concat(currentActivity);
  }
  // save raw and sanitised activites as a backup for each user
  for (const userDoc of userDocsList) {
    for (let i = 0; i<sanitisedActivities.length; i++) {
      saveAndSendActivity(userDoc,
          sanitisedActivities[i],
          webhookBody);
    }
  }
  return;
}

exports.polarWebhook = functions.https.onRequest(async (request, response) => {
  if (!request.debug) {
    functions.logger.info("----> polar "+request.method+" webhook event received!", {
      headers: request.headers,
      body: request.body,
    });
  }
  if (request.method === "POST") {
    // check the webhook token is correct
    const signature = request.headers["polar-webhook-signature"];
    const lookup = encodeparams
        .getLookupFromPolarSignature(
            request.rawBody,
            configurations.polarWebhookSecrets,
            signature);
    if (lookup == "error") { // TODO put in validation function
      console.log("Polar Webhook event recieved that did not have a valid signature");
      response.status(401);
      response.send("NOT AUTHORISED");
      return;
    }
    // save the webhook message and asynchronously process
    try {
      const webhookDoc = await webhookInBox.push(request, "polar", lookup);
      response.sendStatus(200);
      // now we have saved the request and returned ok to the provider
      // the message will trigger an asynchronous process
    } catch (err) {
      response.sendStatus(400);
      console.log("Error saving webhook message - returned status 400");
    }
  } else if (request.method === "GET") {
    // respond to the initialise message
    response.status(200);
    response.send("OK");
  } else {
    response.sendStatus(401);
    console.log("unknown method from Polar webhook");
  }
});

async function processPolarWebhook(webhookDoc) {
  const webhookBody = JSON.parse(webhookDoc.data()["body"]);
  const lookup = webhookDoc.data()["secret_lookup"];
  if (webhookBody.event === "PING") {
    console.log("polar webhook message event = PING, do nothing");
    return;
  }
  const userDocsList = [];
  const devDocsList = [];

  const devQuery = await db.collection("developers")
      .where("secret_lookup", "==", lookup)
      .get();
  devQuery.docs.forEach((doc)=>{
    devDocsList.push(doc.id);
  });

  const userQuery = await db.collection("users")
      .where("polar_user_id", "==", webhookBody.user_id)
      .get();

  userQuery.docs.forEach((doc)=>{
    // exclude devs that are not managed by this webhook subscription
    if (devDocsList.includes(doc.data()["devId"])) {
      userDocsList.push(doc);
    }
  });

  if (userDocsList.length == 0) {
    // there is an issue if there are no users with a userId in the DB.
    console.log("error: zero users registered to polar webhook: " + webhookBody.user_id);
    throw Error("zero users registered to polar webhook user_id "+webhookBody.user_id);
  }

  // request the exercise information from Polar - the access token is
  // needed for this
  const userToken = userQuery.docs[0].data()["polar_access_token"];
  if (webhookBody.event == "EXERCISE") {
    const headers1 = {
      "Accept": "application/json", "Authorization": "Bearer " + userToken,
    };
    const headers2 = {
      "Accept": "*/*", "Authorization": "Bearer " + userToken,
    };
    const options = {
      url: "https://www.polaraccesslink.com/v3/exercises/" + webhookBody.entity_id,
      method: "GET",
      headers: headers1,
    };
    const activity = await got.get(options).json();
    options.url = options.url + "/fit";
    options.headers = headers2;
    const fitFile = await got.get(options);
    const contents = fitFile.rawBody;
    // storing FIT file in bucket under activityId.fit
    const storageRef = storage.bucket();
    // live will use live storage and test will use test storage?
    await storageRef.file("public/"+webhookBody.entity_id+".fit").save(contents);
    // create signed URL for developer to download file.
    const urlOptions = {
      version: "v4",
      action: "read",
      expires: Date.now() + (1*24*60*60*1000), // 1 days in milleseconds till expiry
    };
    const downloadURL = await storageRef.file("public/"+webhookBody.entity_id+".fit").getSignedUrl(urlOptions);

    const sanitisedActivity = filters.polarSanatise(activity);
    // add fit file URL to the sanitised activity
    sanitisedActivity["file"] = downloadURL[0];
    // TODO: put back in when sanitisation of fit files is needed
    // const samples = await getDetailedActivity(userDocsList[0].data(), activity, "polar").samples;
    // sanitisedActivity["samples"] = samples;
    // write sanitised information and raw information to each user and then
    // send to developer
    for (const userDoc of userDocsList) {
      await saveAndSendActivity(userDoc, sanitisedActivity, activity);
    }
  } else {
    throw Error("Polar activity type "+webhookBody.event+" not supported");
  }
}
/**
 * checks if a duplicate and if not then
 * saves the activity to the user collection
 * then sends to the developer.
 * @param {FirebaseFirestore} userDoc
 * @param {Map} sanitisedActivity
 * @param {Map} activity
 */
async function saveAndSendActivity(userDoc,
    sanitisedActivity,
    activity) {
  // tag the sanitised activty with the userId
  sanitisedActivity["userId"] = userDoc.data()["userId"];
  // create a local copy of the activity to prevent the userId
  // being written incorrectly in this loop during async
  // firebase writes and developer sends.
  const localSanitisedActivity =
      JSON.parse(JSON.stringify(sanitisedActivity));
  const activityDoc = userDoc.ref
      .collection("activities")
      .doc(sanitisedActivity.activity_id+sanitisedActivity.provider);

  const doc = await activityDoc.get();

  if (!doc.exists) {
    await activityDoc.set({"sanitised": localSanitisedActivity, "raw": activity});
  } else {
    console.log("duplicate activity - not written or sent");
  }
}

exports.sendToDeveloper = functions
    .runWith({failurePolicy: true})
    .firestore
    .document("users/{userDocId}/activities/{activityId}")
    .onCreate(async (activitySnap, context) => {
      const userDocId = context.params.userDocId;
      const activityDocId = context.params.activityId;
      const activityDoc = await db
          .collection("users")
          .doc(userDocId)
          .collection("activities")
          .doc(activityDocId)
          .get();
      // return without processing if the configuration is set to
      // switch the process off
      if (configurations.InBoxRealTimeCheck == true) {
        const sendToDevConfig = await db
            .collection("realTimeConfigs")
            .doc("sendToDeveloper")
            .get();
        if (sendToDevConfig.exists) {
          if (sendToDevConfig.data()["off"]) {
            return; // no processing should be done
          }
        } else {
          // if the realTimeConfigs is not set up then carry
          // on as normal
        }
      }
      if (!activityDoc.exists || activityDoc.data()["status"] == "sent") {
        console.log("activity "+activityDocId+" for user "+userDocId+" has been deleted or has already been sent not sending again");
        return;
      }
      const MaxRetries = 3;
      let triesSoFar = activityDoc.data()["triesSoFar"] || 0;
      if (triesSoFar <= MaxRetries) {
        triesSoFar = triesSoFar+1;
        console.log("sending to developer - try number: "+triesSoFar);
        await activityDoc.ref
            .set({status: "sending try number.. "+triesSoFar,
              timestamp: new Date().toISOString(),
              triesSoFar: triesSoFar,
            },
            {merge: true});
      } else {
        // max retries email developer
        await activityDoc.ref
            .set({status: "error: failed to send - max retries reached.  Fix issue before trying again",
              timestamp: new Date().toISOString(),
            },
            {merge: true});
        console.log("max retries on sending activity for userDoc: "+userDocId+" - Activity "+activityDocId+" - fail");
        return;
      }
      const userDoc = await db
          .collection("users")
          .doc(userDocId)
          .get();

      const devId = userDoc.data()["devId"];
      const datastring = {"sanitised": activityDoc.data()["sanitisedActivity"], "raw": activityDoc.data()["raw"]};
      const developerDoc = await db.collection("developers").doc(devId).get();
      // if the developer document has the "suppress_webhook" field
      // set to "true" then return without sending the activity.
      if (developerDoc.data()["suppress_webhook"]) {
        // the developer does not want webhook data to be sent
        await activityDoc.ref
            .set({status: "suppressed", timestamp: new Date().toISOString()},
                {merge: true});
        return;
      }

      const endpoint = developerDoc.data()["endpoint"];
      const userData = userDoc.data();
      // check if the user is from notion.
      if (userData["userId"] == "notion") {
        notion.sendToNotionEndpoint(endpoint, developerDoc, activityDoc.data()["sanitisedActivity"]);
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

        try {
          const response = await got.post(options);
          if (response.statusCode == 200) {
          // the developer accepted the information
            await activityDoc.ref
                .set({status: "sent", timestamp: new Date().toISOString()},
                    {merge: true});
          } else {
            const error = new Error("developer sent back wrong code: "+response.statusCode);
            console.log("retrying sending to developer");
            return Promise.reject(error);
          }
        } catch (err) {
          console.log("retrying sending to developer: "+err.message);
          return Promise.reject(err);
        }
      }
    });

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

async function getStravaDetailedActivity(userDoc, activityDoc) {
  const stravaActivityId = await activityDoc["id"];
  const devId = await userDoc["devId"];
  const secretLookup = await db.collection("developers").doc(devId).get();
  const lookup = await secretLookup.data()["secret_lookup"];
  stravaApi.config({
    "client_id": configurations[lookup]["stravaClientId"],
    "client_secret": configurations[lookup]["stravaClientSecret"],
    "redirect_uri": callbackBaseUrl+"/stravaCallback",
  });

  let accessToken = userDoc["strava_access_token"];
  if (await checkStravaTokens(userDoc["devId"]+userDoc["userId"], db) == true) {
    // token out of date, make request for new ones.
    const payload = await stravaApi.oauth.refreshToken(userDoc["strava_refresh_token"]);
    await stravaTokenStorage(userDoc["devId"]+userDoc["userId"], payload, db);
    accessToken = payload["access_token"];
  }
  const streamResponse = await stravaApi.streams.activity({"access_token": accessToken, "id": stravaActivityId, "types": ["time", "distance", "latlng", "altitude", "velocity_smooth", "heartrate", "cadence", "watts", "temp", "moving", "grade_smooth"], "key_by_type": true});
  return streamResponse;
}

async function getPolarDetailedActivity(userDoc, activityDoc) {
  const exerciseId = activityDoc["id"];
  const accessToken = userDoc["polar_access_token"];
  let sanitised = {};
  const headers = {
    "Accept": "*/*", "Authorization": "Bearer " + accessToken,
  };

  try {
    const options = {
      url: "https://www.polaraccesslink.com/v3/exercises/" + exerciseId + "/fit",
      method: "GET",
      headers: headers,
    };
    const fitFile = await got.get(options);
    if (fitFile.statusCode == 200) {
      const contents = fitFile.rawBody;
      // storing FIT file in bucket under polar-exerciseId.fit
      const storageRef = storage.bucket();
      // live will use live storage and test will use test storage?
      await storageRef.file("public/polar"+exerciseId+".fit").save(contents);
      // create signed URL for developer to download file.
      const urlOptions = {
        version: "v4",
        action: "read",
        expires: Date.now() + (1*24*60*60*1000), // 1 days in milleseconds till expiry
      };
      const downloadURL = await storageRef
          .file("public/polar"+exerciseId+".fit")
          .getSignedUrl(urlOptions);
      // add fit file URL to the sanitised activity
      sanitised["file"] = downloadURL[0];
      const fitParser = new FitParser();
      fitParser.parse(fitFile.rawBody, (error, jsonRaw)=>{
        // Handle result of parse method
        if (error) {
          console.log(error);
          sanitised = error;
        } else {
          sanitised["samples"] = sanitisePolarFitFile(jsonRaw);
        }
      });
    }
    return sanitised;
  } catch (error) {
    console.log(error);
    return error;
  }
}

function sanitisePolarFitFile(fitFile) {
  const session = fitFile.sessions[0];
  let cadence;
  if (session.sport == "running") {
    cadence = "running_cadence";
  } else if (session.sport == "CYCLING") {
    cadence = "cadence";
  }
  const records = fitFile.records;
  const timerSamples = [];
  const timestampSamples = [];
  const temperatureSamples = [];
  const distanceSamples = [];
  const powerSamples = [];
  const heartRateSamples = [];
  const speedSamples = [];
  const altitudeSamples = [];
  const positionSamples = [];
  const gradientSamples = [];
  const calorieSamples = [];
  const cadenceSamples = [];
  const acentSamples = [];
  const decentSamples = [];
  records.forEach((record) => {
    timestampSamples.push((record.timestamp).toISOString());
    temperatureSamples.push(record.temperature);
    distanceSamples.push(record.distance);
    powerSamples.push(record.power);
    heartRateSamples.push(record.heart_rate);
    speedSamples.push(record.speed);
    altitudeSamples.push(record.altitude);
    positionSamples.push({"latitude": record.position_lat, "longitute": record.position_long});
    gradientSamples.push(null);
    calorieSamples.push(null);
    cadenceSamples.push(record[cadence]);
    acentSamples.push(null);
    decentSamples.push(null);
  });
  const sanitisedSamples= {
    "timestampSamples": timestampSamples,
    "distanceSamples": distanceSamples,
    "powerSamples": powerSamples,
    "heartRateSamples": heartRateSamples,
    "speedSamples": speedSamples,
    "altitudeSamples": altitudeSamples,
    "positionSamples": positionSamples,
    "gradientSamples": gradientSamples,
    "calorieSamples": calorieSamples,
    "cadenceSamples": cadenceSamples,
    "acentSamples": acentSamples,
    "decentSamples": decentSamples,
    "timerSamples": timerSamples,
  };
  for (const prop in sanitisedSamples) {
    if (Object.prototype.hasOwnProperty.call(sanitisedSamples, prop)) {
      for (let i=0; i<sanitisedSamples[prop].length; i++) {
        if (sanitisedSamples[prop][i] == undefined) {
          sanitisedSamples[prop][i] = null;
        } if (prop == "positionSamples") {
          if (sanitisedSamples[prop][i][0] == undefined) {
            sanitisedSamples[prop][i] = [null, null];
          }
        }
      }
    }
  }
  return sanitisedSamples;
}

async function getWahooDetailedActivity(userDoc, activityDoc) {
  try { // or 'https' for https:// URLs
    const fileLocation = activityDoc["file"];
    const fitFile = await got.get(fileLocation);
    const buffer = fitFile.rawBody.buffer;
    const jsonRaw = fitDecoder.fit2json(buffer);
    const json = fitDecoder.parseRecords(jsonRaw);
    const records = json.records;
    const sanitised = jsonFitSanitise(records);
    return sanitised;
  } catch (error) {
    console.log(error);
    return error;
  }
}

async function getGarminDetailedActivity(userDoc, activityDoc) {
  try {
    const url = "https://apis.garmin.com/wellness-api/rest/activityDetails";
    const devId = userDoc["devId"];
    const secretLookup = await db.collection("developers").doc(devId).get();
    const lookup = await secretLookup.data()["secret_lookup"];
    const consumerSecret = configurations[lookup]["consumerSecret"];
    const oAuthConsumerSecret = configurations[lookup]["oauth_consumer_key"];
    let startTime = activityDoc["startTimeInSeconds"];
    const endTime = startTime + 7*24*60*60;
    const activityId = activityDoc["activityId"];
    startTime += activityDoc["durationInSeconds"];
    let activity;
    while (activity == undefined && startTime < endTime) {
      const options = await encodeparams.garminCallOptions(url, "GET", consumerSecret, oAuthConsumerSecret, userDoc["garmin_access_token"], userDoc["garmin_access_token_secret"], {from: startTime, to: startTime+24*60*60});
      const response = await got.get(options);
      const activityList = JSON.parse(response.body);
      for (const _activity in activityList) {
        if (activityList[_activity]["activityId"] == activityId) {
          activity = garminDetailedSanitise(activityList[_activity]);
          return activity;
        }
      }
      startTime += 24*60*60;
    }
    // let currentActivityList = await got.get(options);
  } catch (error) {
    console.log(error);
    return error;
  }
}

function garminDetailedSanitise(activity) {
  const type = activity["summary"]["activityType"];
  let cadence;
  let aveCadence;
  if (type == "RUNNING") {
    cadence = "stepsPerMinute";
    aveCadence = "averageRunCadenceInStepsPerMinute";
  } else if (type == "CYCLING") {
    cadence = "bikeCadenceInRPM";
    aveCadence ="averageBikeCadenceInRPM";
  }
  const timerSamples = [];
  const timestampSamples = [];
  const temperatureSamples = [];
  const distanceSamples = [];
  const powerSamples = [];
  const heartRateSamples = [];
  const speedSamples = [];
  const altitudeSamples = [];
  const positionSamples = [];
  const gradientSamples = [];
  const calorieSamples = [];
  const cadenceSamples = [];
  const acentSamples = [];
  const decentSamples = [];
  activity["samples"].forEach((sample) => {
    timestampSamples.push((new Date(sample["startTimeInSeconds"]*1000)).toISOString());
    timerSamples.push(sample["timerDurationInSeconds"]);
    temperatureSamples.push(sample["airTemperatureCelcius"]);
    distanceSamples.push(sample["totalDistanceInMeters"]);
    powerSamples.push(sample["powerInWatts"]);
    heartRateSamples.push(sample["heartRate"]);
    speedSamples.push(sample["speedMetersPerSecond"]);
    altitudeSamples.push(sample["elevationInMeters"]);
    positionSamples.push({"latitude": sample["latitudeInDegree"], "longitude": sample["longitudeInDegree"]});
    gradientSamples.push(sample["grade"]);
    calorieSamples.push(sample["calories"]);
    cadenceSamples.push(sample[cadence]);
    acentSamples.push(sample["acent"]);
    decentSamples.push(sample["decent"]);
  });
  const sanitisedData = {
    "summary": {
      "start_time": (new Date(activity["summary"]["startTimeInSeconds"]*1000)).toISOString(),
      "total_elapsed_time": null,
      "activity_duration": activity["summary"]["durationInSeconds"],
      "avg_speed": activity["summary"]["averageSpeedInMetersPerSecond"],
      "max_speed": activity["summary"]["maxSpeedInMetersPerSecond"],
      "distance": activity["summary"]["distanceInMeters"],
      "min_heart_rate": null,
      "avg_heart_rate": activity["summary"]["averageHeartRateInBeatsPerMinute"],
      "max_heart_rate": activity["summary"]["maxHeartRateInBeatsPerMinute"],
      "min_altitude": null,
      "avg_altitude": null,
      "max_altitude": null,
      "max_neg_grade": null,
      "avg_grade": null,
      "max_pos_grade": null,
      "active_calories": activity["summary"]["activeKilocalories"],
      "avg_temperature": null,
      "max_temperature": null,
      "elevation_gain": activity["summary"]["totalElevationGainInMeters"],
      "elevation_loss": activity["summary"]["totalElevationLossInMeters"],
      "activity_type": activity["summary"]["activityType"],
      "num_laps": null,
      "threshold_power": null,
    },
    "samples": {
      "timestampSamples": timestampSamples,
      "distanceSamples": distanceSamples,
      "powerSamples": powerSamples,
      "heartRateSamples": heartRateSamples,
      "speedSamples": speedSamples,
      "altitudeSamples": altitudeSamples,
      "positionSamples": positionSamples,
      "gradientSamples": gradientSamples,
      "calorieSamples": calorieSamples,
      "cadenceSamples": cadenceSamples,
      "acentSamples": acentSamples,
      "decentSamples": decentSamples,
      "timerSamples": timerSamples,
    },
  };
  for (const prop in sanitisedData["samples"]) {
    if (Object.prototype.hasOwnProperty.call(sanitisedData["samples"], prop)) {
      /* let initValue = sanitisedData["samples"][prop].find((element) => element != undefined && element != [undefined, undefined]);
      if (initValue == undefined) {
        initValue = null;
      } */
      for (let i=0; i<sanitisedData["samples"][prop].length; i++) {
        if (sanitisedData["samples"][prop][i] == undefined) {
          sanitisedData["samples"][prop][i] = null;
        } if (sanitisedData["samples"][prop][i] == [undefined, undefined]) {
          sanitisedData["samples"][prop][i] = [null, null];
        }
      }
    }
  }
  return sanitisedData;
}

function jsonFitSanitise(jsonRecords) {
  const records = jsonRecords.filter((element) => element["type"] == "record");
  let summary = jsonRecords.filter((element) => element["type"] == "session");
  const events = jsonRecords.filter((element) => element["data"]["event"] == "timer");
  summary = summary[0]["data"];
  const timerSamples = [];
  const timestampSamples = [];
  const distanceSamples = [];
  const powerSamples = [];
  const heartRateSamples = [];
  const speedSamples = [];
  const altitudeSamples = [];
  const positionSamples = [];
  const gradientSamples = [];
  const calorieSamples = [];
  const cadenceSamples = [];
  const acentSamples = [];
  const decentSamples = [];
  const sanitisedData = {
    "summary": {
      "start_time": (summary["start_time"]).toISOString(),
      "total_elapsed_time": summary["total_elapsed_time"],
      "activity_duration": summary["total_timer_time"],
      "avg_speed": summary["avg_speed"],
      "max_speed": summary["max_speed"],
      "distance": summary["total_distance"],
      "min_heart_rate": summary["min_heart_rate"],
      "avg_heart_rate": summary["avg_heart_rate"],
      "max_heart_rate": summary["max_heart_rate"],
      "min_altitude": summary["min_altitude"],
      "avg_altitude": summary["avg_altitude"],
      "max_altitude": summary["max_altitude"],
      "max_negative_grade": summary["max_neg_grade"],
      "avg_grade": summary["avg_grade"],
      "max_positive_grade": summary["max_pos_grade"],
      "active_calories": summary["total_calories"],
      "avg_temperature": summary["avg_temperature"],
      "max_temperature": summary["max_temperature"],
      "elevation_gain": summary["total_ascent"],
      "elevation_loss": summary["total_descent"],
      "activity_type": summary["sport"],
      "num_laps": summary["num_laps"],
      "threshold_power": summary["threshold_power"],
    },
  };
  // assign arrays
  records.forEach((_record) => {
    const record = _record["data"];
    timestampSamples.push((record["timestamp"]).toISOString());
    distanceSamples.push(record["distance"]);
    powerSamples.push(record["power"]);
    heartRateSamples.push(record["heart_rate"]);
    speedSamples.push(record["speed"]);
    altitudeSamples.push(record["altitude"]);
    positionSamples.push({"latitude": record["position_lat"], "longitude": record["position_long"]});
    gradientSamples.push(record["grade"]);
    calorieSamples.push(record["calories"]);
    cadenceSamples.push(record["cadence"]);
    acentSamples.push(record["acent"]);
    decentSamples.push(record["decent"]);
  });
  // assign to samples
  sanitisedData["samples"]= {
    "timestampSamples": timestampSamples,
    "distanceSamples": distanceSamples,
    "powerSamples": powerSamples,
    "heartRateSamples": heartRateSamples,
    "speedSamples": speedSamples,
    "altitudeSamples": altitudeSamples,
    "positionSamples": positionSamples,
    "gradientSamples": gradientSamples,
    "calorieSamples": calorieSamples,
    "cadenceSamples": cadenceSamples,
    "acentSamples": acentSamples,
    "decentSamples": decentSamples,
  };
  // remove undefined samples
  for (const prop in sanitisedData["samples"]) {
    if (Object.prototype.hasOwnProperty.call(sanitisedData["samples"], prop)) {
      /* let initValue = sanitisedData["samples"][prop].find((element) => element != undefined);
      if (initValue == undefined) {
        initValue = null;
      } */
      for (let i=0; i<sanitisedData["samples"][prop].length; i++) {
        if (sanitisedData["samples"][prop][i] == undefined) {
          sanitisedData["samples"][prop][i] = null;
        } if (prop == "positionSamples") {
          if (sanitisedData["samples"][prop][i]["latitude"] == undefined) {
            sanitisedData["samples"][prop][i]["latitude"] = null;
          }
          if (sanitisedData["samples"][prop][i]["longitude"] == undefined) {
            sanitisedData["samples"][prop][i]["longitude"] = null;
          }
        }
      }
    }
  }
  // add timer samples
  for (let i=0; i < (events.length-1)/2; i++) {
    const currEnd = events[2*i+1]["data"]["timestamp"];
    const currStart = events[2*i]["data"]["timestamp"];
    let index = timestampSamples.findIndex((element) => element >= currStart);
    let start;
    if (index == 0) {
      start = 0;
    } else {
      start = timerSamples[index - 1];
    }
    timerSamples.push(start + 1 + (timestampSamples[index] - currStart)/1000);
    index += 1;
    while (timestampSamples[index] <= currEnd) {
      const t0 = timestampSamples[index-1];
      const t1 = timestampSamples[index];
      const t = timerSamples[index-1] + (t1 - t0)/1000;
      timerSamples.push(t);
      index += 1;
    }
  }
  return sanitisedData;
}

async function getDetailedActivity(userDoc, activityDoc, source) {
  // activityDoc is just the raw doc
  let sanitisedDetailedActivity;
  if (source == "strava") {
    sanitisedDetailedActivity = await getStravaDetailedActivity(userDoc, activityDoc);
  } else if (source == "polar") {
    sanitisedDetailedActivity = await getPolarDetailedActivity(userDoc, activityDoc);
  } else if (source == "wahoo") {
    sanitisedDetailedActivity = await getWahooDetailedActivity(userDoc, activityDoc);
  } else if (source == "garmin") {
    sanitisedDetailedActivity = await getGarminDetailedActivity(userDoc, activityDoc);
  }
  return sanitisedDetailedActivity;
}

exports.createNotionLink = functions.https.onRequest(async (req, res) => {
  const databaseId = (Url.parse(req.url, true).query)["databaseId"];
  const provider = (Url.parse(req.url, true).query)["provider"];
  const key = (Url.parse(req.url, true).query)["key"];
  // we need to create a new dev and a new user linked to this dev for the notion user.
  // the endpoint of notion should be written in.

  // create dev with secret_lookup notionUser.
  await db.collection("developers").doc(databaseId).set({
    "secret_lookup": "roveLiveSecrets",
    "callbackURL": "https://notion.so",
    "deauthorize_endpoint": "",
    "devKey": key,
    "email": "",
    "endpoint": databaseId}, {merge: true});
  // create user
  await db.collection("users").doc(databaseId+"notion").set({
    "devId": databaseId,
    "userId": "notion",
  }, {merge: true});
  // redirect the user to connectService with new dev and user credentials.
  res.redirect("/connectService?userId=notion"+"&devId="+databaseId+"&provider="+provider+"&devKey="+key);
});
exports.processGetHistoryInBox = functions.firestore
    .document("getHistoryInBox/{docId}")
    .onCreate(async (snap, context) => {
      console.log("processing getHistory inbox written to... with doc: "+snap.id);
      const provider = snap.data()["provider"];
      const userDocId = snap.data()["userDocId"];
      const providersConnected = {};
      providersConnected[provider] = true;
      const start = new Date(Date.now());
      const end = new Date(Date.now() - 30*24*60*60*1000);
      // return without processing if the configuration is set to
      // switch the process off
      if (configurations.InBoxRealTimeCheck == true) {
        const historyInBoxConfig = await db
            .collection("realTimeConfigs")
            .doc("historyInBox")
            .get();
        if (historyInBoxConfig.exists) {
          if (historyInBoxConfig.data()["off"]) {
            return; // no processing should be done
          }
        } else {
          // if the realTimeConfigs is not set up then carry
          // on as normal
        }
      }
      try {
        const userDoc = await db.collection("users")
            .doc(userDocId)
            .get();
        if (!userDoc.exists) {
          throw Error("userDocument does not exist when trying to get "+provider+" History!");
        }
        const payload =
          await requestForDateRange(
              providersConnected,
              userDoc,
              start,
              end);
        // write the docs into the database and send to the developer.
        for (let i = 0; i < payload.length; i++) {
          await saveAndSendActivity(userDoc,
              payload[i].sanitised,
              payload[i].raw);
        }
        getHistoryInBox.delete(snap.ref);
      } catch (error) {
        getHistoryInBox.writeError(snap.ref, error);
      }
      return;
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
  // TODO the access token needs to update all users with the old access code
  // and strava user id
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
  ); // dates in seconds since epoch

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


