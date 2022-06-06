const functions = require("firebase-functions");
// The Firebase Admin SDK to access Firestore.
const admin = require("firebase-admin");
const Url = require("url");
const request = require("request");
admin.initializeApp();
const db = admin.firestore();


exports.stravaDeauth = functions.https.onRequest(async (req, res) => {
  // requires userId & devId
  const reqData = Url.parse(req.url, true).query;
  const userId = reqData["userId"];
  // const devId = req["devId"];
  console.log(userId);
  const userRef = db.collection("users").doc(userId);
  const userDoc = await userRef.get();
  const userAccessToken = userDoc["strava_access_token"];
  const dataString = "access_token=" + userAccessToken;
  const options = {
    url: "https://www.strava.com/oauth/deauthorize",
    method: "POST",
    body: dataString,
  };
  request(options, async (error, response, body) => {
    if (!error && response.statusCode) {
      await userRef.delete();
      // await sendDevSuccess(devId);
    } else {
      console.log(JSON.parse(body));
      // send an error response to dev
      // TODO create dev fail post
    }
  });
});
