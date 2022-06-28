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
const stravaApi = require("strava-v3");
//-------------TEST --- webhooks-------
describe("Testing that the Webhooks work: ", () => {
  before ('set up the userIds in the test User doc', async () => {
      await admin.firestore()
      .collection("users")
      .doc(testUser)
      .set({
          "wahoo_user_id": "wahoo_test_user",
          "polar_user_id": "polar_test_user",
          "polar_access_token": "polar_test_access_token",
          "strava_id" : "test_strava_id",
          "strava_access_token": "test_strava_access_token",
          "strava_refresh_token": "test_strava_refresh_token",
          "strava_token_expires_at": new Date().getTime()/1000 + 60,
          "garmin_access_token" :"garmin-test-access-token",
      }, {merge: true});

      activityDocs = await admin.firestore()
          .collection("users")
          .doc(testUser)
          .collection("activities")
          .get();
      
      activityDocs.forEach(async (doc)=>{
          await doc.ref.delete();
      });
  });
  it('Webhooks should log event and repond with status 200...', async () => {
      // set the request object with the correct provider, developerId and userId
      const req = {
          url: "https://us-central1-rove-26.cloudfunctions.net/wahooWebhook",
          method: "POST",
          body:{"user":{"id": "wahoo_test_user"},"event_type":"workout_summary","workout_summary":{"duration_active_accum":"9.0","workout":{"name":"Cycling","workout_token":"ELEMNT AE48:274","workout_type_id":0,"id":147564736,"updated_at":"2022-06-13T16:39:08.000Z","plan_id":null,"minutes":0,"starts":"2022-06-13T16:38:51.000Z","created_at":"2022-06-13T16:39:08.000Z"},"speed_avg":"0.0","duration_total_accum":"9.0","cadence_avg":"0.0","id":140473420,"work_accum":"0.0","power_bike_tss_last":null,"ascent_accum":"0.0","power_bike_np_last":null,"duration_paused_accum":"0.0","created_at":"2022-06-13T16:39:09.000Z","updated_at":"2022-06-13T16:39:09.000Z","power_avg":"0.0","file":{"url":"https://cdn.wahooligan.com/wahoo-cloud/production/uploads/workout_file/file/WpHvKL3irWsv2vHzGzGF_Q/2022-06-13-163851-ELEMNT_AE48-274-0.fit"},"distance_accum":"0.0","heart_rate_avg":"0.0","calories_accum":"0.0"},"webhook_token":"97661c16-6359-4854-9498-a49c07b6ec11"}
};
      res = {
          send: (text)=> {assert.equal(text, "EVENT_RECEIVED");},
          status: (code)=>{assert.equal(code, 200);},
      }


      await myFunctions.wahooWebhook(req, res);
      const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
      await wait(1000);
      //now check the database was updated correctly
     const testUserDocs = await admin.firestore()
     .collection("users")
     .doc(testUser)
     .collection("activities")
     .get();

     const sanatisedActivity = testUserDocs.docs[0].data();
     const expectedResults = {
          sanitised: {
              userId: "paulsTestDevSecondUser",
              activity_id: 140473420,
              activity_name: "Cycling",
              activity_type: "BIKING",
              distance_in_meters: "0.0",
              average_pace_in_meters_per_second: "0.0",
              active_calories: "0.0",
              activity_duration_in_seconds: "9.0",
              start_time: '2022-06-13T16:38:51.000Z',
              average_heart_rate_bpm: "0.0",
              average_cadence: "0.0",
              elevation_gain: "0.0",
              elevation_loss: null,
              data_source: "wahoo",
              work_accum: "0.0",
              power_bike_tss_last: null,
              ascent_accum: "0.0",
              power_bike_np_last: null,
              duration_paused_accum: "0.0",
              created_at: "2022-06-13T16:39:09.000Z",
              updated_at: "2022-06-13T16:39:09.000Z",
              power_avg: "0.0",
              file: {
                  "url":"https://cdn.wahooligan.com/wahoo-cloud/production/uploads/workout_file/file/WpHvKL3irWsv2vHzGzGF_Q/2022-06-13-163851-ELEMNT_AE48-274-0.fit"
              },
          },
          raw: req.body,
      }

     assert.deepEqual(sanatisedActivity, expectedResults);


  })
  it('Polar Webhook should get event, sanatise, save and repond with status 200...', async () => {
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
      stubbedPolarCall = sinon.stub(got, "get");
      stubbedPolarCall.onFirstCall().returns(polarExercisePayload);
      // set the request object with the correct provider, developerId and userId
      const req = {
          url: "https://us-central1-rove-26.cloudfunctions.net/wahooWebhook",
          method: "POST",
          body: {
              "event": "EXERCISE",
              "user_id": "polar_test_user",
              "entity_id": "aQlC83",
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
     .doc(testUser)
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
              data_source: "polar",
          },
          raw: polarExercisePayload.json(),
      }
     assert.deepEqual(sanatisedActivity, expectedResults);
     sinon.restore();
  })
  it('Strava Webhook should get event, sanatise, save and repond with status 200...', async () => {
      //set up the stubbed response to mimic polar's response when called with the
      const stravaExercisePayload = require('./strava.json');
      stubbedStravaCall = sinon.stub(stravaApi.activities, "get");
      stubbedStravaCall.onFirstCall().returns(stravaExercisePayload);
      // set the request object with the correct provider, developerId and userId
      const req = {
          url: "https://us-central1-rove-26.cloudfunctions.net/stravaWebhook",
          method: "POST",
          "body":{"updates":{},"object_type":"activity","object_id":7345142595,"owner_id":"test_strava_id","subscription_id":217520,"aspect_type":"create","event_time":1655824005}
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
     .doc(testUser)
     .collection("activities")
     .where("raw.id", "==", 12345678987654321)
     .get();

     const sanatisedActivity = testUserDocs.docs[0].data()["sanitised"];
     const expectedResults = { // TODO:
          userId: testUser,
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
  it('Garmin Webhook should get event, sanatise, save and repond with status 200...', async () => {

      // set the request object with the webHook payload
      const req = {
          url: "https://us-central1-rove-26.cloudfunctions.net/garminWebhook",
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
     .doc(testUser)
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
              data_source: "garmin",
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
      }
     assert.deepEqual(sanatisedActivity, expectedResults);
     sinon.restore();
  })
}); //End TEST