// Follow the instructions in README.md for running these tests.
// Visit https://firebase.google.com/docs/functions/unit-testing to learn more
// about using the `firebase-functions-test` SDK.

// -----------------------COMMON TEST SETUP---------------------------//
// Chai is a commonly used library for creating unit test suites. It is easily 
// extended with plugins.
const chai = require('chai');
const assert = chai.assert;
// Sinon is a library used for mocking or verifying function calls in JavaScript.
const sinon = require('sinon');
// -------------------END COMMON TEST SETUP---------------------------//

// -----------INITIALISE THE ROVE TEST PARAMETERS----------------------------//
const testParameters = require('../testParameters.json');
const firebaseConfig = testParameters.firebaseConfig;
const testUser = testParameters.testNotionUser
const testDev = testParameters.testNotionDev
const devTestData = testParameters.devTestData
const devUserData = testParameters.devUserData
const test = require('firebase-functions-test')(firebaseConfig, testParameters.testKeyFile);
const admin = require("firebase-admin");
myFunctions = require('../../index.js');
// -----------END INITIALISE ROVE TEST PARAMETERS----------------------------//
const got = require('got');
const stravaApi = require("strava-v3");

// ---------REQUIRE FUNCTONS TO BE STUBBED----------------------//
// include the functions that we are going to be stub in the
// testing processes - these have to have the same constant
// name as in the function we are testing
const request = require('request');
const strava = require("strava-v3");
const notion = require('../../notion');
//-------------TEST 2--- Test Callbacks from Strava-------
 describe.only("Check the notion functions are writing activites to the notion endpoint.", () => {
  before ('set up the userIds in the test User doc', async () => {
    await admin.firestore()
    .collection("users")
    .doc(testDev+testUser)
    .set({
        "devId": testDev,
        "userId": testUser,
        "strava_id" : "notion_test_strava_id",
        "strava_access_token": "test_strava_access_token",
        "strava_refresh_token": "test_strava_refresh_token",
        "strava_token_expires_at": new Date().getTime()/1000 + 60,
        "garmin_access_token" :"garmin-test-access-token",
    }, {merge: true});

    activityDocs = await admin.firestore()
        .collection("users")
        .doc(testDev+testUser)
        .collection("activities")
        .get();
    
    activityDocs.forEach(async (doc)=>{
        await doc.ref.delete();
    });
});
  it('Webhooked activities should be written to the notion endpoint...', async () => {
    //set up the stubbed response to mimic polar's response when called with the
    const stravaExercisePayload = require('./strava.json');
    stubbedStravaCall = sinon.stub(stravaApi.activities, "get");
    stubbedStravaCall.onFirstCall().returns(stravaExercisePayload);
    // set the request object with the correct provider, developerId and userId
    const req = {
        debug: true,
        url: "https://us-central1-rove-26.cloudfunctions.net/stravaWebhook",
        method: "POST",
        "body":{"updates":{},"object_type":"activity","object_id":7345142595,"owner_id":"notion_test_strava_id","subscription_id":217520,"aspect_type":"create","event_time":1655824005}
    };
    res = {
        send: (text)=> {assert.equal(text, "OK!");},
        status: (code)=>{assert.equal(code, 200);},
    }

    await myFunctions.stravaWebhook(req, res);
    // check polar was called with the right arguments
    // assert(stubbedPolarCall.calledWith(), "polar arguments");
    const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
    await wait(1000);
    //now check the database was updated correctly
   const testUserDocs = await admin.firestore()
        .collection("users")
        .doc(testDev+testUser)
        .collection("activities")
        .where("raw.id", "==", 12345678987654321)
        .get();

   const sanatisedActivity = testUserDocs.docs[0].data()["sanitised"];
   const expectedResults = { // TODO:
        userId: "notion",
        activity_id: 12345678987654321,
        activity_name: "Happy Friday",
        activity_type: "Ride",
        distance_in_meters: 28099, //float no trailing 0
        average_pace_in_meters_per_second:"6.7", //float
        active_calories: 781,
        activity_duration_in_seconds: 4207,
        start_time: '2018-02-16T06:52:54.000Z', //ISO 8601 UTC
        average_heart_rate_bpm: null,
       // max_heart_rate_bpm: null,
        average_cadence: "78.5",
        elevation_gain: "446.6",
        elevation_loss:"17.2",
        data_source: "strava",
    }
   assert.deepEqual(sanatisedActivity, expectedResults);
   sinon.restore();
})
});//End TEST 2--- Test Callbacks for Strava--------------
