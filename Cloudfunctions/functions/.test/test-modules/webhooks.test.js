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
const testUser = testParameters.testUser
const testDev = testParameters.testDev
const devTestData = testParameters.devTestData
const devUserData = testParameters.devUserData
const test = require('firebase-functions-test')(firebaseConfig, testParameters.testKeyFile);
const admin = require("firebase-admin");
myFunctions = require('../../index.js');
// -----------END INITIALISE ROVE TEST PARAMETERS----------------------------//

// ---------REQUIRE FUNCTONS TO BE STUBBED----------------------//
// include the functions that we are going to be stub in the
// testing processes - these have to have the same constant
// name as in the function we are testing
const got = require('got');
//const stravaApi = require("strava-v3");
//-------------TEST --- webhooks-------
describe("Testing that the Webhooks work: ", () => {
  before ('set up the userIds in the test User doc', async () => {
      await admin.firestore()
      .collection("users")
      .doc(testDev+testUser)
      .set({
          "devId": testDev,
          "userId": testUser,
          "wahoo_user_id": "wahoo_test_user",
          "polar_user_id": "45395466",
          "polar_access_token": "d717dd39d09b91939f835d66a640927d",
          "polar_token_expires_at": 2120383593,
          "strava_id" : "test_strava_id",
          "strava_access_token": "test_strava_access_token",
          "strava_refresh_token": "test_strava_refresh_token",
          "strava_token_expires_at": new Date().getTime()/1000 + 600,
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
  it.only('Polar Webhook should get event, sanatise, save and repond with status 200...', async () => {
      //set up the stubbed response to mimic polar's response when called with the
      const polarExercisePayload = {
          json() { return {
                  "id": 1937529874,
                  "upload_time": "2008-10-13T10:40:02Z",
                  "polar_user": "https://www.polaraccesslink/v3/users/1",
                  "transaction_id": 179879,
                  "device": "Polar M400",
                  "device_id": "1111AAAA",
                  "start_time": "2008-10-13T10:40:02Z",
                  "start_time_utc_offset": 180,
                  "duration": "PT2H44M",
                  "calories": 530,
                  "distance": 1600,
                  "heart_rate": {
                  "average": 129,
                  "maximum": 147
                  },
                  "training_load": 143.22,
                  "sport": "OTHER",
                  "has_route": true,
                  "club_id": 999,
                  "club_name": "Polar Club",
                  "detailed_sport_info": "WATERSPORTS_WATERSKI",
                  "fat_percentage": 60,
                  "carbohydrate_percentage": 38,
                  "protein_percentage": 2
              }
          }
      }
      // stubbedPolarCall = sinon.stub(got, "get");
      // stubbedPolarCall.onFirstCall().returns(polarExercisePayload);
      // set the request object with the correct provider, developerId and userId
      const req = {
          debug: true,
          url: "https://us-central1-rovetest-beea7.cloudfunctions.net/wahooWebhook",
          method: "POST",
          body: {
              "event": "EXERCISE",
              "user_id": "45395466",
              "entity_id": "ymeoBNZw",
              "timestamp": "2018-05-15T14:22:24Z",
              "url": "https://www.polaraccesslink.com/v3/exercises/aQlC83"
            }
      };
      res = {
          send: (text)=> {assert.equal(text, "OK");},
          status: (code)=>{assert.equal(code, 200);},
      }

      await myFunctions.polarWebhook(req, res);
      // check polar was called with the right arguments
      // assert(stubbedPolarCall.calledWith(), "polar arguments");
      const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
      await wait(1000);
      //now check the database was updated correctly
     const testUserDocs = await admin.firestore()
     .collection("users")
     .doc(testDev+testUser)
     .collection("activities")
     .where("raw.id", "==", 1937529874)
     .get();

     const sanatisedActivity = testUserDocs.docs[0].data();
     const expectedResults = { // TODO:
          sanitised: {
              userId: testUser,
              activity_id: 1937529874,
              activity_name: "WATERSPORTS_WATERSKI",
              activity_type: "OTHER",
              distance_in_meters: 1600, //float no trailing 0
              average_pace_in_meters_per_second: null, //float
              active_calories: 530,
              activity_duration_in_seconds: 9840,
              start_time: '2008-10-13T10:40:02.000Z', //ISO 8601 UTC
              average_heart_rate_bpm: 129,
              max_heart_rate_bpm: 147,
              average_cadence: null,
              elevation_gain: null,
              elevation_loss: null,
              provider: "polar",
          },
          raw: polarExercisePayload.json(),
          "status": "sent",
          "timestamp": "not tested",
      }
     sanatisedActivity.timestamp = "not tested";
     assert.deepEqual(sanatisedActivity, expectedResults);
     sinon.restore();
  })
  it('Garmin Webhook should get event, sanatise, save and repond with status 200...', async () => {

      // set the request object with the webHook payload
      const req = {
          debug: true,
          url: "https://us-central1-rovetest-beea7.cloudfunctions.net/garminWebhook",
          method: "POST",
          body: {"activities":[{
              "activeKilocalories": 391,
              "activityId": 7698241609,
              "activityName": "Indoor Cycling",
              "activityType": "INDOOR_CYCLING",
              "averageHeartRateInBeatsPerMinute": 139,
              "deviceName": "forerunner935",
              "durationInSeconds": 1811,
              "maxHeartRateInBeatsPerMinute": 178,
              "startTimeInSeconds": 1634907261,
              "startTimeOffsetInSeconds": 3600,
              "summaryId": "7698241609",
              "userAccessToken": "garmin-test-access-token",
              "userId": "eb24e8e5-110d-4a87-b976-444f40ca27d4"
            }],}
      };
      res = {
          send: (text)=> {assert.equal(text, "EVENT_RECEIVED");},
          status: (code)=>{assert.equal(code, 200);},
      }

      await myFunctions.garminWebhook(req, res);
      // check polar was called with the right arguments
      // assert(stubbedPolarCall.calledWith(), "polar arguments");
      const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
      await wait(1000);
      //now check the database was updated correctly
     const testUserDocs = await admin.firestore()
     .collection("users")
     .doc(testDev+testUser)
     .collection("activities")
     .where("raw.activityId", "==", 7698241609)
     .get();

     const sanatisedActivity = testUserDocs.docs[0].data();
     const expectedResults = { // TODO:
          sanitised: {
              userId: testUser,
              activity_id: 7698241609,
              activity_name: "Indoor Cycling",
              activity_type: "INDOOR_CYCLING",
              distance_in_meters: null, //float no trailing 0
              average_pace_in_meters_per_second: null, //float
              active_calories: 391,
              activity_duration_in_seconds: 1811,
              start_time: '2021-10-22T12:54:21.000Z', //ISO 8601 UTC
              average_heart_rate_bpm: 139,
              max_heart_rate_bpm: 178,
              average_cadence: null,
              elevation_gain: null,
              elevation_loss: null,
              provider: "garmin",
          },
          raw: {
              "activeKilocalories": 391,
              "activityId": 7698241609,
              "activityName": "Indoor Cycling",
              "activityType": "INDOOR_CYCLING",
              "averageHeartRateInBeatsPerMinute": 139,
              "deviceName": "forerunner935",
              "durationInSeconds": 1811,
              "maxHeartRateInBeatsPerMinute": 178,
              "startTimeInSeconds": 1634907261,
              "startTimeOffsetInSeconds": 3600,
              "summaryId": "7698241609",
              "userAccessToken": "garmin-test-access-token",
              "userId": "eb24e8e5-110d-4a87-b976-444f40ca27d4"
            },
          "status": "sent",
          "timestamp": "not tested",
      }
     sanatisedActivity.timestamp = "not tested";
     assert.deepEqual(sanatisedActivity, expectedResults);
     sinon.restore();
  })
}); //End TEST
