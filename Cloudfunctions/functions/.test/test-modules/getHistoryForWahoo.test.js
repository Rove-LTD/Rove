// Follow the instructions in README.md for running these tests.
// Visit https://firebase.google.com/docs/functions/unit-testing to learn more
// about using the `firebase-functions-test` SDK.

// -----------------------COMMON TEST SETUP---------------------------//
// Chai is a commonly used library for creating unit test suites. It is easily 
// extended with plugins.
const chai = require('chai');
const assert = chai.assert;
const fs = require('fs').promises;

// Sinon is a library used for mocking or verifying function calls in JavaScript.
const sinon = require('sinon');
// -------------------END COMMON TEST SETUP---------------------------//

// -----------INITIALISE THE ROVE TEST PARAMETERS----------------------------//
const testParameters = require('../testParameters.json');
const firebaseConfig = testParameters.firebaseConfig;
const testUser = testParameters.testUser
const testDev = testParameters.testDev
const test = require('firebase-functions-test')(firebaseConfig, testParameters.testKeyFile);
const admin = require("firebase-admin");
const myFunctions = require('../../index.js');
const startTime = "2022-07-22T07:15:33.000Z";
const endTime = "2022-07-23T09:15:33.000Z"

// -----------END INITIALISE ROVE TEST PARAMETERS----------------------------//

// -----------------INCLUDE ANY FUNCTIONS TO STUB-----------------------//
// include the functions that we are going to be stub in the
// testing processes - these have to have the same constant
// name as in the function we are testing
const got = require('got');
const { onStabilityDigestPublished } = require('firebase-functions/v2/alerts/crashlytics');

// import {stravaResponse, garminResponse} from './getActivityResponses'
// ------------------------END OF STUB FUNCTIONS----------------------------//

// --------------START CONNECTSERVICE TESTS----------------------------------//
describe("Testing that the get History inBox processing works for wahoo: ", () => {
    before ('set up the userIds in the test User doc', async () => {
        await admin.firestore()
        .collection("users")
        .doc(testDev+testUser)
        .set({
            "devId": testDev,
            "userId": testUser,
            "wahoo_user_id": 1510441,
            "wahoo_access_token": "91XIohhVI_VVDyfKz9wX_1zrCWzLSLA7Vt1H4hHhow4",
            "wahoo_client_id":  "iA2JRS_dBkikcb0uEnHPtb6IDt1vDYNbityEEhp801I",
            "wahoo_refresh_token": "G8jSOlN6m49aQ_ZGrGs61PPixJ8beN6mn1t3QS7bKeo",
            "wahoo_token_expires_at": new Date()/1000+6000,
            "wahoo_token_expires_in": "7200",
            "wahoo_connected": true
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

  it('Should not return a list of activities from db when developer get_history flag not set...', async () => {
    // set the request object with the correct provider, developerId and userId
    response1 = require("./wahooListPayload1.js")
    response2 = require("./wahooListPayload2.js")
    response3 = require("./wahooListPayload3.js")
    historyInBox = {
      "provider": "wahoo",
      "timestamp": "2022-09-06T11:02:09.768Z",
      "userDocId": testDev+testUser,
    };
    await admin.firestore()
        .collection("getHistoryInBox")
        .doc("wahooTestHistoryInBoxDoc")
        .set(historyInBox);
    
    await admin.firestore()
      .collection("developers")
      .doc(testDev)
      .set({"get_history": false}, {merge: true});

    const stubbedGot = sinon.stub(got, "get");
    stubbedGot.onCall(0).returns({body: JSON.stringify(response1.body)});
    stubbedGot.onCall(1).returns({body: JSON.stringify(response2.body)});
    stubbedGot.onCall(2).returns({body: JSON.stringify(response3.body)});
    stubbedGot.onCall(3).returns("stop")
    const snapshot = test.firestore.makeDocumentSnapshot(historyInBox, "getHistoryInBox/wahooTestHistoryInBoxDoc");
    wrapped = test.wrap(myFunctions.processGetHistoryInBox);
    await wrapped(snapshot, {params: {docId: "wahooTestHistoryInBoxDoc"}});

    const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
    await wait(1000);
    //now check the database was updated correctly
   const testUserDocs = await admin.firestore()
   .collection("users")
   .doc(testDev+testUser)
   .collection("activities")
   .get();

   const NumberOfActivities = testUserDocs.docs.length;
   assert.equal(NumberOfActivities, 0, "too many Activities written");

   sinon.restore();
  })
  it('Should return a list of activities from db...', async () => {
    // set the request object with the correct provider, developerId and userId
    response1 = require("./wahooListPayload1.js")
    response2 = require("./wahooListPayload2.js")
    response3 = require("./wahooListPayload3.js")
    historyInBox = {
      "provider": "wahoo",
      "timestamp": "2022-09-06T11:02:09.768Z",
      "userDocId": testDev+testUser,
    };
    await admin.firestore()
        .collection("getHistoryInBox")
        .doc("wahooTestHistoryInBoxDoc")
        .set(historyInBox);
    
    await admin.firestore()
      .collection("developers")
      .doc(testDev)
      .set({"get_history": true}, {merge: true});

    const stubbedGot = sinon.stub(got, "get");
    stubbedGot.onCall(0).returns({body: JSON.stringify(response1.body)});
    stubbedGot.onCall(1).returns({body: JSON.stringify(response2.body)});
    stubbedGot.onCall(2).returns({body: JSON.stringify(response3.body)});
    stubbedGot.onCall(3).returns("stop")
    const snapshot = test.firestore.makeDocumentSnapshot(historyInBox, "getHistoryInBox/wahooTestHistoryInBoxDoc");
    wrapped = test.wrap(myFunctions.processGetHistoryInBox);
    await wrapped(snapshot, {params: {docId: "wahooTestHistoryInBoxDoc"}});

    const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
    await wait(1000);
    //now check the database was updated correctly
   const testUserDocs = await admin.firestore()
   .collection("users")
   .doc(testDev+testUser)
   .collection("activities")
   .get();

   const sampleDoc = await admin.firestore()
   .collection("users")
   .doc(testDev+testUser)
   .collection("activities")
   .doc("100118152wahoo")
   .get();

   const NumberOfActivities = testUserDocs.docs.length;
   assert.equal(NumberOfActivities, 174, "too many/few Activities written");

   const expectedResults = {
      "raw": {
        "created_at": "2021-08-28T16:22:22.000Z",
        "id": 105208521,
        "minutes": 0,
        "name": "KICKR",
        "plan_id": null,
        "starts": "2021-08-28T16:21:07.000Z",
        "updated_at": "2021-08-28T16:22:22.000Z",
        "workout_summary": {
          "ascent_accum": "0.0",
          "cadence_avg": "74.17",
          "calories_accum": "700.28",
          "created_at": "2021-08-28T17:22:13.000Z",
          "distance_accum": "218524.85",
          "duration_active_accum": "3657.0",
          "duration_paused_accum": "0.0",
          "duration_total_accum": "3657.0",
          "file": {
            "url": "https://cdn.wahooligan.com/wahoo-cloud/production/uploads/workout_file/file/7hZEAg9pAKNWl_JKOC2LGA/2021-08-28-162107-ELEMNT_AE48-209-0.fit"
          },
          "files": [
            {
              "url": "https://cdn.wahooligan.com/wahoo-cloud/production/uploads/workout_file/file/7hZEAg9pAKNWl_JKOC2LGA/2021-08-28-162107-ELEMNT_AE48-209-0.fit"
            }
          ],
          "heart_rate_avg": "129.62",
          "id": 100118152,
          "power_avg": "191.46",
          "power_bike_np_last": "200.71",
          "power_bike_tss_last": "44.84",
          "speed_avg": "59.76",
          "updated_at": "2022-02-05T09:30:51.000Z",
          "work_accum": "700283.87"
        },
        "workout_token": "ELEMNT AE48:209",
        "workout_type_id": 61,
      },
      "sanitised": {
        "active_calories": "700.28",
        "activity_duration": "3657.0",
        "activity_id": 100118152,
        "activity_name": "KICKR",
        "activity_type": "BIKING_INDOOR_TRAINER",
        "ascent_accum": "0.0",
        "avg_cadence": "74.17",
        "avg_heart_rate": "129.62",
        "avg_speed": "59.76",
        "created_at": "2021-08-28T17:22:13.000Z",
        "distance": "218524.85",
        "duration_paused_accum": "0.0",
        "elevation_gain": "0.0",
        "elevation_loss": null,
        "file": "https://cdn.wahooligan.com/wahoo-cloud/production/uploads/workout_file/file/7hZEAg9pAKNWl_JKOC2LGA/2021-08-28-162107-ELEMNT_AE48-209-0.fit",
        "power_avg": "191.46",
        "power_bike_np_last": "200.71",
        "power_bike_tss_last": "44.84",
        "provider": "wahoo",
        "start_time": "2021-08-28T16:21:07.000Z",
        "updated_at": "2022-02-05T09:30:51.000Z",
         "userId": "paulsTestUser",
        "version": "1.0",
       },
      "status": "send",
     }

   assert.deepEqual(sampleDoc.data(), expectedResults);
  })

});

