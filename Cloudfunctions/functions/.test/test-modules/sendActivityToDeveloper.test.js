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
const unsuccessfulWebhookMessageDoc = "unsuccessfulTestWebhookMessageDoc";
const successfulWebhookMessageDoc1 = "successfulTestWebhookMessageDoc1";
const successfulWebhookMessageDoc2 = "successfulTestWebhookMessageDoc2";
let successfulWebhookMessage;
let unsuccessfulWebhookMessage;
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
const webhookInBox = require('../../webhookInBox');
const sampleFile = require("./samples-7509571698strava");
//-------------TEST --- webhooks-------
describe("Testing that sending webhook messages to developers work: ", () => {
    before ('set up the userIds and activity records in the test User doc', async () => {
      await admin.firestore()
      .collection("users")
      .doc(testDev+testUser)
      .set({
          "devId": testDev,
          "userId": testUser,
          "wahoo_user_id": "wahoo_test_user",
      }, {merge: true});

    activityDocs = await admin.firestore()
          .collection("users")
          .doc(testDev+testUser)
          .collection("activities")
          .get();
      
      activityDocs.forEach(async (doc)=>{
          await doc.ref.delete();
      });
      const successfulWebhookMessage1 = {
        provider: "wahoo",
        body: '{"user":{"id":"wahoo_test_user"},"event_type":"workout_summary","workout_summary":{"duration_active_accum":"9.0","workout":{"name":"Cycling","workout_token":"ELEMNT AE48:274","workout_type_id":0,"id":147564736,"updated_at":"2022-06-13T16:39:08.000Z","plan_id":null,"minutes":0,"starts":"2022-06-13T16:38:51.000Z","created_at":"2022-06-13T16:39:08.000Z"},"speed_avg":"0.0","duration_total_accum":"9.0","cadence_avg":"0.0","id":140473420,"work_accum":"0.0","power_bike_tss_last":null,"ascent_accum":"0.0","power_bike_np_last":null,"duration_paused_accum":"0.0","created_at":"2022-06-13T16:39:09.000Z","updated_at":"2022-06-13T16:39:09.000Z","power_avg":"0.0","file":{"url":"https://cdn.wahooligan.com/wahoo-cloud/production/uploads/workout_file/file/WpHvKL3irWsv2vHzGzGF_Q/2022-06-13-163851-ELEMNT_AE48-274-0.fit"},"distance_accum":"0.0","heart_rate_avg":"0.0","calories_accum":"0.0"},"webhook_token":"348a6fe2-3719-4647-a233-933b8c404d6b"}',
        method: "POST",
        secret_lookups: "IGQW1vInhei9CE_tEyoso2V4COhNOn53AfYGsTx96oA",
        status: "added before the tests to be successful",
      }
      activityDoc1 = {
        sanitised: {
            userId: testUser,
            activity_id: 140473422,
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
            provider: "wahoo",
            power_bike_tss_last: null,
            power_bike_np_last: null,
            ascent_accum: "0.0",
            duration_paused_accum: "0.0",
            created_at: "2022-06-13T16:39:09.000Z",
            updated_at: "2022-06-13T16:39:09.000Z",
            power_avg: "0.0",
            file: {
                "url":"https://cdn.wahooligan.com/wahoo-cloud/production/uploads/workout_file/file/WpHvKL3irWsv2vHzGzGF_Q/2022-06-13-163851-ELEMNT_AE48-274-0.fit"
            },
        },
        raw: JSON.parse(successfulWebhookMessage1.body),
      }
      activityDoc2 = {
        sanitised: {
            userId: testUser,
            activity_id: 140473426,
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
            provider: "wahoo",
            power_bike_tss_last: null,
            power_bike_np_last: null,
            ascent_accum: "0.0",
            duration_paused_accum: "0.0",
            created_at: "2022-06-13T16:39:09.000Z",
            updated_at: "2022-06-13T16:39:09.000Z",
            power_avg: "0.0",
            file: {
                "url":"https://cdn.wahooligan.com/wahoo-cloud/production/uploads/workout_file/file/WpHvKL3irWsv2vHzGzGF_Q/2022-06-13-163851-ELEMNT_AE48-274-0.fit"
            },
        },
        raw: JSON.parse(successfulWebhookMessage1.body),
      }

    });
    after('clean-up the developer documents',async ()=>{
        await admin.firestore()
        .collection("developers")
        .doc(testDev)
        .set({
            "suppress_webhook": false
        }, {merge: true});
    })
    it('Check sending webhook message to developers works...', async ()=>{
      // set up the activities in the database
      await admin.firestore()
          .collection("users")
          .doc(testDev+testUser)
          .collection("activities")
          .doc(activityDoc1.sanitised.activity_id+"wahoo")
          .set(activityDoc1);

        const snapshot = test.firestore.makeDocumentSnapshot(activityDoc1, "users/"+testDev+testUser+"/activities/"+activityDoc1.sanitised.activity_id+"wahoo");
        gotPostSpy = sinon.spy(got, "post");
        wrapped = test.wrap(myFunctions.sendToDeveloper);
        await wrapped(snapshot, {params: {userDocId: testDev+testUser, activityId: activityDoc1.sanitised.activity_id+"wahoo"}});
        // now check the got call was correct information
        let args = gotPostSpy.getCall(0).args[0]
        args.body = JSON.parse(args.body);
        expectedOptions = {
            method: "POST",
            url: devTestData.endpoint,
            headers: {
            "Accept": "application/json",
            "Content-type": "application/json",
            },
            body: activityDoc1,
        };
        assert.deepEqual(args, expectedOptions, "the wrong info was sent to the developer endpoint");
        //now check the database was updated correctly
       const testUserDoc = await admin.firestore()
          .collection("users")
          .doc(testDev+testUser)
          .collection("activities")
          .doc(activityDoc1.sanitised.activity_id+"wahoo")
          .get();
  
       // actual results
       const sanatisedActivity = testUserDoc.data();
       sanatisedActivity.timestamp = "not tested";
       // expected results
       activityDoc1.status = "sent";
       activityDoc1.timestamp = "not tested";
       activityDoc1.triesSoFar = 1;

      assert.deepEqual(sanatisedActivity, activityDoc1);
      sinon.restore();
    })
    it('Check that webhook messages are suppressed ...', async () => {

        await admin.firestore()
            .collection("developers")
            .doc(testDev)
            .set({
                "suppress_webhook": true
            }, {merge: true});
        
        await admin.firestore()
        .collection("users")
        .doc(testDev+testUser)
        .collection("activities")
        .doc(activityDoc2.sanitised.activity_id+"wahoo")
        .set(activityDoc2);
  

        const snapshot = test.firestore.makeDocumentSnapshot(activityDoc2, "users/"+testDev+testUser+"/activities/"+activityDoc2.sanitised.activity_id+"wahoo");
        wrapped = test.wrap(myFunctions.sendToDeveloper);
        await wrapped(snapshot, {params: {userDocId: testDev+testUser, activityId: activityDoc2.sanitised.activity_id+"wahoo"}});

        //now check the database was updated correctly
        const testUserDoc = await admin.firestore()
          .collection("users")
          .doc(testDev+testUser)
          .collection("activities")
          .doc(activityDoc2.sanitised.activity_id+"wahoo")
          .get();

        // actual results
        const sanatisedActivity = testUserDoc.data();
        sanatisedActivity.timestamp = "not tested";
        // expected results
        activityDoc2.status = "suppressed"
        activityDoc2.timestamp = "not tested";
        activityDoc2.triesSoFar = 1;

        assert.deepEqual(sanatisedActivity, activityDoc2);
        sinon.restore();
    });
}); //End TEST
