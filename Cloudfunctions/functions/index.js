/* eslint-disable guard-for-in */
/* eslint-disable require-jsdoc */
/* eslint-disable max-len */
const functions = require("firebase-functions");
// The Firebase Admin SDK to access Firestore.
const admin = require("firebase-admin");
const Url = require("url");
const crypto = require("crypto");
const encodeparams = require("./encodeparams");
const got = require("got");
const request = require("request");
const strava = require("strava-v3");

strava.config({
  "client_id": "72486",
  "client_secret": "b0d500111e3d1774903da1f067b5b7adf38ca726",
  "redirect_uri": "https://us-central1-rove-26.cloudfunctions.net/stravaCallback",
});


admin.initializeApp();
const db = admin.firestore();

// INTEGRATION FOR APP:
// get url response and go through onboarding flow.
// we recieve auth token from strava to stravaCallBack.
// tokens stored under userId

exports.connectService = functions.https.onRequest(async (req, res) => {
  // When dev calls this url with parameters: user-id, dev-id, and service to authenticate.
  // TODO: create authorization with dev-secret keys and dev-id.

  // in form:  us-central1-rove.cloudfunctions.net/authenticateStrava?userId=***&devId=***&provider=***
  const provider = (Url.parse(req.url, true).query)["provider"];
  let url = "";
  // stravaOauth componses the request url for the user.
  if (provider == "strava") {
    url = stravaOauth(req);
  } else if (provider == "garmin") {
    // TODO: Make the garmin request async and returnable.
    url = await garminOauth(req);
  } else {
    //the request was badly formatted with incorrect provider parameter
    url = "error: the provider was badly formatted, missing or not supported";
  }
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
  await request(options, async (error, response, body) => {
    if (!error && response.statusCode == 200) {
      // this is where the tokens come back.
      stravaStoreTokens(userId, devId, JSON.parse(body), db);
      getStravaAthleteId(userId, JSON.parse(body), db);
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
  await userRef.set(parameters, {merge: true});
  // assign userId for devId.
  // const devRef = db.collection("developers").doc(devId);
  // write resultant message to dev endpoint.
  return;
}
async function getStravaAthleteId(userId, data, db) {
  // get athlete id from strava.
  const parameters = {
    "access_token": data["access_token"],
  };
  // set tokens for userId doc.
  const athleteSummary = await strava.athlete.get(parameters);
  const userRef = db.collection("users").doc(userId);
  await userRef.set(athleteSummary, {merge: true});
  return;
}

function stravaOauth(req) {
  const clientId = 72486;
  const appQuery = Url.parse(req.url, true).query;
  const userId = appQuery["userId"];
  const devId = appQuery["devId"];
  // add parameters from user onto the callback redirect.
  // PV: TOTO add check that parameters are valid
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

async function garminOauth(req) {
  const oauthNonce = crypto.randomBytes(10).toString("hex");
  // console.log(oauth_nonce);
  const oauthTimestamp = Math.round(new Date().getTime()/1000);
  // console.log(oauth_timestamp);
  const consumerSecret = "ffqgs2OxeJkFHUM0c3pGysdCp1Znt0tnc2s";
  const parameters = {
    oauth_nonce: oauthNonce,
    oauth_consumer_key: "eb0a9a22-db68-4188-a913-77ee997924a8",
    oauth_timestamp: oauthTimestamp,
    oauth_signature_method: "HMAC-SHA1",
    oauth_version: "1.0",
  };
  const encodedParameters = encodeparams.collectParams(parameters);
  const baseUrl = "https://connectapi.garmin.com/oauth-service/oauth/request_token";
  const baseString = encodeparams.baseStringGen(encodedParameters, "GET", baseUrl);
  const encodingKey = consumerSecret + "&";
  const signature = crypto.createHmac("sha1", encodingKey).update(baseString).digest().toString("base64");
  const encodedSignature = encodeURIComponent(signature);
  const url = "https://connectapi.garmin.com/oauth-service/oauth/request_token?oauth_consumer_key=eb0a9a22-db68-4188-a913-77ee997924a8&oauth_nonce="+oauthNonce.toString()+"&oauth_signature_method=HMAC-SHA1&oauth_timestamp="+oauthTimestamp.toString()+"&oauth_signature="+encodedSignature+"&oauth_version=1.0";
  try {
    const response = await got(url, {json: true});
    console.log(response.body);
    return response.body;
  } catch (error) {
    console.log(error.response.body);
    return error.response.body;
  }
  /*
  await fetchData(url, function(data) {
    // this url should be returned
    console.log(data);
  });
  async function fetchData(url, fn) {
    request(
        {method: "GET",
          uri: url,
          gzip: true,
        }
        , function decompressed(err, response, responseBody) {
          fn(responseBody);
        },
    );
  }
  return;*/
}


exports.stravaWebhook = functions.https.onRequest((request, response) => {
  if (request.method === "POST") {
    functions.logger.info("webhook event received!", {
      query: request.query,
      body: request.body,
    });
    // TODO: Get strava activity and sanatize
    strava.activities.get({"id": request.body.object_id}, (result)=>{
      console.log(result);
    });
    // TODO: Send the information to an endpoint specified by the dev registered to a user.
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
