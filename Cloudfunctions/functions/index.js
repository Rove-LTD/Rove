/* eslint-disable guard-for-in */
/* eslint-disable require-jsdoc */
/* eslint-disable max-len */
const functions = require("firebase-functions");
// The Firebase Admin SDK to access Firestore.
const admin = require("firebase-admin");
const Url = require("url");
const request = require("request");
admin.initializeApp();
const db = admin.firestore();

// INTEGRATION FOR APP:
// get url response and go through onboarding flow.
// we recieve auth token from strava to stravaCallBack.
// tokens stored under userId

exports.authenticateStrava = functions.https.onRequest((req, res) => {
  // When dev calls this url with parameters: user-id, dev-id, and service to authenticate.
  // TODO: create authorization with dev-secret keys and dev-id.

  // in form:  us-central1-rove.cloudfunctions.net/authenticateStrava?userId=***&devId=***.

  // stravaOauth componses the request url for the user.
  const url = stravaOauth(req);
  // send back URL to user device.
  res.send(url);
});

// callback from strava with token in
exports.stravaCallback = functions.https.onRequest(async (req, res) => {
  // this comes from strava
  // create authorization for user completing oAuth flow.
  const oAuthCallback = (Url.parse(req.url, true).query)["userId"].split(":"); // little bit jank.
  const code = (Url.parse(req.url, true).query)["code"];
  const userId = oAuthCallback[0];
  const devId = oAuthCallback[1];
  res.send("This goes back to the user." + "\n devId: " + devId + "\n userId: " + userId);
  const dataString = "client_id=72486&client_secret=b0d500111e3d1774903da1f067b5b7adf38ca726&code="+code+"&grant_type=authorization_code"; // PV TODO: should this secret be in a config file and secret?
  const options = {
    url: "https://www.strava.com/api/v3/oauth/token",
    method: "POST",
    body: dataString,
  };
  // make request to strava for tokens after auth flow and store credentials.
  console.log(code);
  request(options, async (error, response, body) => {
    if (!error && response.statusCode == 200) {
      // this is where the tokens come back.
      await stravaStoreTokens(userId, devId, JSON.parse(body), db);
      // send a response now to endpoint for devId confirming success
      // await sendDevSuccess(devId); //TODO: create dev success post.
      // userResponse = "Some good redirect.";
    } else {
      console.log(JSON.parse(body));
      // send an error response to dev.
      // TODO: create dev fail post.
      // userResponse = "Some bad redirect";
    }
  });
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
  userRef.set(parameters, {merge: true});
  // assign userId for devId.
  const devRef = db.collection("developers").doc(devId);
  devRef.update({users: admin.firestore.FieldValue.arrayUnion(userId)});
  return;
}

function stravaOauth(req) {
  const clientId = 72486;
  const appQuery = Url.parse(req.url, true).query;
  const userId = appQuery["userId"];
  const devId = appQuery["devId"];
  // add parameters from user onto the callback redirect.
  const parameters = {
    client_id: clientId,
    response_type: "code",
    redirect_uri: "https://us-central1-rove-26.cloudfunctions.net/stravaCallback?userId="+userId + ":" + devId,
    approval_prompt: "force",
    scope: "profile:read_all,activity:read_all",
  };
  let encodedParameters = "";
  let k = 0;
  for (k in parameters) {
    const encodedValue = parameters[k];
    const encodedKey = k;
    if (encodedParameters === "") {
      encodedParameters += `${encodedKey}=${encodedValue}`;
    } else {
      encodedParameters += `&${encodedKey}=${encodedValue}`;
    }
  }
  const baseUrl = "https://www.strava.com/oauth/authorize?";
  return (baseUrl + encodedParameters);
}


exports.stravaWebhook = functions.https.onRequest((request, response) => {
  if (request.method === "POST") {
    functions.logger.info("webhook event received!", {
      query: request.query,
      body: request.body,
    });
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
