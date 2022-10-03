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
const successfulWebhookMessageDoc = "successfulTestWebhookMessageDoc";
const successfulDailyWebhookMessageDoc = "successfulTestWebhookDailyMessageDoc";
let successfulDailyWebhookMessage;
let successfulWebhookMessage;
let unsuccessfulWebhookMessage;
const devTestData = testParameters.devTestData
const devUserData = testParameters.devUserData
const test = require('firebase-functions-test')(firebaseConfig, testParameters.testKeyFile);
const admin = require("firebase-admin");
myFunctions = require('../../index.js');
const garminRawJson = require("./garminRawWebhook.json");
const garminRawDailyJson = require("./garminRawDailyWebhook.json"); //TODO: create file with the webhook body in it
const garminRawJson3 = require("./garminRawWebhook3.json");

// -----------END INITIALISE ROVE TEST PARAMETERS----------------------------//

// ---------REQUIRE FUNCTONS TO BE STUBBED----------------------//
// include the functions that we are going to be stub in the
// testing processes - these have to have the same constant
// name as in the function we are testing
const got = require('got');
const webhookInBox = require('../../webhookInBox');
//-------------TEST --- webhooks-------
describe("Testing that the garmin Webhooks work: ", () => {
    before ('set up the userIds in the test User doc', async () => {
        await admin.firestore()
        .collection("users")
        .doc(testDev+testUser)
        .set({
            "devId": testDev,
            "userId": testUser,
            "garmin_user_id" : "eb24e8e5-110d-4a87-b976-444f40ca27d4",
            "garmin_access_token": "test_garmin_access_token",
            "garmin_client_id": "eb0a9a22-db68-4188-a913-77ee997924a8",
        });
        activityDocs = await admin.firestore()
            .collection("users")
            .doc(testDev+testUser)
            .collection("activities")
            .get();
        
        activityDocs.forEach(async (doc)=>{
            await doc.ref.delete();
        });

        activityDailyDocs = await admin.firestore()
        .collection("users")
        .doc(testDev+testUser)
        .collection("dailySummaries")
        .get();
    
        for (const doc of activityDailyDocs.docs) {
            await doc.ref.delete();
        };

        const successfulDetail = JSON.stringify(garminRawJson)
        successfulWebhookMessage = {
            provider: "garmin",
            method: "POST",
            body: successfulDetail,
            status: "added before the tests to be successful",
        }
        
        const successfulDailyDetail = JSON.stringify(garminRawDailyJson)
        successfulDailyWebhookMessage = {
            provider: "garminDailies",
            method: "POST",
            body: successfulDailyDetail,
            status: "added before the tests to be successful",
        }

        garminRawJson.activityDetails[0].userId = "incorrect_garmin_user";
        const unsuccessfulDetail = JSON.stringify(garminRawJson);
        garminRawJson.activityDetails[0].userId = "eb24e8e5-110d-4a87-b976-444f40ca27d4";

        unsuccessfulWebhookMessage = {
            provider: "garmin",
            method: "POST",
            body: unsuccessfulDetail,
            status: "added before the tests to be successful",
        }

    });
    after('clean-up the webhookInbox documents',async ()=>{

    })
    it('Webhooks should log large event and repond status 200 and then process it...', async () => {
      // set the request object with the webHook payload
      let inBoxDocs = await admin.firestore().collection("webhookInBox")
      .where("secret_lookups", "==", "d3dd1cc9-06b2-4b3e-9eb4-8a40cbd8e53f")
      .get();

      for (const doc of inBoxDocs.docs) {
        await doc.ref.delete();
      };

      const req = {
        debug: true,
        url: "https://us-central1-rovetest-beea7.cloudfunctions.net/garminWebhook",
        method: "POST",
        body: garminRawJson3
        };
        res = {
            sendStatus: (code)=>{assert.equal(code, 200);},
        }

        // set up stubs so that WebhookInBox is not written to
        // this would trigger the function in the online environment
        const spyWebhookInBox = sinon.spy(webhookInBox, "push");
        //stubbedWebhookInBox.onCall().returns("testDoc");

        await myFunctions.garminWebhook(req, res);

        // check the webhookInBox was called correctly
        assert(spyWebhookInBox.calledOnceWithExactly(req, "garmin", "d3dd1cc9-06b2-4b3e-9eb4-8a40cbd8e53f"),
                "webhookInBox called with wrong args");
        
        inBoxDocs = await admin.firestore().collection("webhookInBox")
                .where("secret_lookups", "==", "d3dd1cc9-06b2-4b3e-9eb4-8a40cbd8e53f")
                .get()
        sinon.restore();

        assert.equal(inBoxDocs.docs.length,1);
        assert.include(inBoxDocs.docs[0].data()["body"].file, "webhookBody/");
        const newWebhookMessage = inBoxDocs.docs[0].data();
        const newWebhookMessageId = inBoxDocs.docs[0].id;
        const spyWebhookInBoxDelete = sinon.spy(webhookInBox, "delete");
        const snapshot = test.firestore.makeDocumentSnapshot(newWebhookMessage, "webhookInBox/"+newWebhookMessageId);

        wrapped = test.wrap(myFunctions.processWebhookInBox);
        await wrapped(snapshot);
        // check the webhookInBox function was called with the correct args
        assert(spyWebhookInBoxDelete.calledOnceWith(snapshot), "webhookInBox called incorrectly");
        // give the sendToDeveloper function a chance to run
        const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
        await wait(1000);
         //now check the database was updated correctly
        const testUserDocs = await admin.firestore()
            .collection("users")
            .doc(testDev+testUser)
            .collection("activities")
            .where("raw.activityId", "==", 9291942332)
            .get();

        const sanatisedActivity = testUserDocs.docs[0].data();
        garminRawJson3.activityDetails[0].samples = "too much data";
        const expectedResults = { // TODO:
            sanitised: {
                "messageType": "activities",
                "active_calories": 707,
                "activity_duration": 3634,
                "activity_id": 9291942332,
                "activity_name": "Siena Running",
                "activity_type": "RUNNING",
                userId: testUser,
                distance: 9392, //float no trailing 0
                avg_speed: 2.584, //float
                start_time: '2022-09-15T05:29:14.000Z', //ISO 8601 UTC
                avg_heart_rate: 141,
                max_heart_rate_bpm: 173,
                avg_cadence: 150.79688,
                elevation_gain: 307.7665,
                elevation_loss: 302.7325,
                samples: {"file": "samples/9291942332garmin"},
                provider: "garmin",
                version: "1.0"
            },
            raw: garminRawJson3.activityDetails[0],
            "status": "not tested",
            "timestamp": "not tested",
            "triesSoFar": "not tested",
        }
        sanatisedActivity.status = "not tested";
        sanatisedActivity.timestamp = "not tested";
        sanatisedActivity.triesSoFar = "not tested";
        assert.deepEqual(sanatisedActivity, expectedResults);
        sinon.restore();

    });
    it('read webhookInBox small event and process it successfully...', async () => {

        //set up the stubbed response to mimic garmin's response when called with the
        const stubbedWebhookInBox = sinon.stub(webhookInBox, "delete");
        const snapshot = test.firestore.makeDocumentSnapshot(successfulWebhookMessage, "webhookInBox/"+successfulWebhookMessageDoc);

        wrapped = test.wrap(myFunctions.processWebhookInBox);
        await wrapped(snapshot);
        // check the webhookInBox function was called with the correct args
        assert(stubbedWebhookInBox.calledOnceWith(snapshot), "webhookInBox called incorrectly");
        // give the sendToDeveloper function a chance to run
        const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
        await wait(1000);
         //now check the database was updated correctly
        const testUserDocs = await admin.firestore()
            .collection("users")
            .doc(testDev+testUser)
            .collection("activities")
            .where("raw.activityId", "==", 9291942331)
            .get();

        const sanatisedActivity = testUserDocs.docs[0].data();
        garminRawJson.activityDetails[0].samples = "too much data";
        const expectedResults = { // TODO:
            sanitised: {
                "messageType": "activities",
                "activity_duration": 3923,
                "activity_id": 9291942331,
                "activity_name": "Newcastle upon Tyne Cycling",
                "activity_type": "CYCLING",
                userId: testUser,
                distance: 29504, //float no trailing 0
                avg_speed: 7.52, //float
                active_calories: 672,
                start_time: '2022-08-10T05:58:49.000Z', //ISO 8601 UTC
                avg_heart_rate: 138,
                max_heart_rate_bpm: 160,
                avg_cadence: 71,
                elevation_gain: 212,
                elevation_loss: 203,
                samples: {"file": "samples/9291942331garmin"},
                provider: "garmin",
                version: "1.0"
            },
            raw: garminRawJson.activityDetails[0],
            "status": "not tested",
            "timestamp": "not tested",
            "triesSoFar": "not tested",
        }
        sanatisedActivity.status = "not tested";
        sanatisedActivity.timestamp = "not tested";
        sanatisedActivity.triesSoFar = "not tested";
        assert.deepEqual(sanatisedActivity, expectedResults);
        sinon.restore();
      });
    it.only('read webhookInBox daily event and process it successfully...', async () => {

    //set up the stubbed response to mimic garmin's response when called with the
    const stubbedWebhookInBox = sinon.stub(webhookInBox, "delete");
    const snapshot = test.firestore.makeDocumentSnapshot(successfulDailyWebhookMessage, "webhookInBox/"+successfulDailyWebhookMessageDoc);

    wrapped = test.wrap(myFunctions.processWebhookInBox);
    await wrapped(snapshot);
    // check the webhookInBox function was called with the correct args
    assert(stubbedWebhookInBox.calledOnceWith(snapshot), "webhookInBox called incorrectly");
    // give the sendToDeveloper function a chance to run
    const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
    await wait(1000);
        //now check the database was updated correctly
    const testUserDocs = await admin.firestore()
        .collection("users")
        .doc(testDev+testUser)
        .collection("dailySummaries")
        .where("raw.summaryId", "==", "x35e229f-63322ef0-8520-6") //TODO: put in the summary id of the test case
        .get();
    
    // check sanitised data is correct: TODO: extend to raw data
    
    const sanatisedActivity = testUserDocs.docs[0].data();
    const expectedResults = {
        sanitised: {
            "messageType": "dailySummaries",
            "restingHeartRate": 53,
            "startTimeInSeconds": 1664233200,
            "steps": 392,
            "activeCalories": 24,
            "activeTimeSeconds": 1101,
            "aveHeartRate": 58,
            "bmrCalories": 893,
            "date": "2022-09-27",
            "distanceInMeters": 319,
            "floorsClimbed": 1,
            "id": "x35e229f-63322ef0-8520-6",
            "maxHeartRate": 138,
            "messageType": "dailySummaries",
            "minHeartRate": 46,
            "userId": "paulsTestUser",
            provider: "garmin",
            version: "1.0",
        },
        raw: garminRawDailyJson.dailies[0],
        "status": "not tested",
        "timestamp": "not tested",
        "triesSoFar": "not tested",
    }
    sanatisedActivity.status = "not tested";
    sanatisedActivity.timestamp = "not tested";
    sanatisedActivity.triesSoFar = "not tested";
    assert.deepEqual(sanatisedActivity.sanitised, expectedResults.sanitised);
    sinon.restore();
    });
    it('Webhooks should repond with status 401 if method incorrect...', async () => {
        // set the request object with the correct provider, developerId and userId
        const req = {
            debug: true,
            url: "https://us-central1-rovetest-beea7.cloudfunctions.net/garminWebhook",
            method: "Incorrect",
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
                "userAccessToken": "test_garmin_access_token",
                "userId": "eb24e8e5-110d-4a87-b976-444f40ca27d4"
              }],}
        };
        res = {
            sendStatus: (code)=>{assert.equal(code, 401);},
        }
        // set up stubs so that WebhookInBox is not written to
        // this would trigger the function in the online environment
        const stubbedWebhookInBox = sinon.stub(webhookInBox, "push");
        stubbedWebhookInBox.onCall().returns("testDoc");

        await myFunctions.garminWebhook(req, res);
        // check the inBox was not written to
        assert.equal(stubbedWebhookInBox.notCalled, true);
        sinon.restore();
    });
    it('read webhook inbox message and error if no users that match garmin_id...', async () => {

    const data = unsuccessfulWebhookMessage;

    const snapshot = test.firestore.makeDocumentSnapshot(data, "webhookInBox/"+unsuccessfulWebhookMessageDoc);
    wrapped = test.wrap(myFunctions.processWebhookInBox);
    // set up stubs so that WebhookInBox is updated 
    const stubbedWebhookInBox = sinon.stub(webhookInBox, "writeError");
    await wrapped(snapshot);
    args = stubbedWebhookInBox.getCall(0).args; //this first call
    // check webhookInBox called with the correct parameters
    assert(stubbedWebhookInBox.calledOnce, "webhookInBox called too many times");
    assert.equal(args[1].message, "zero users registered to garmin webhook userId incorrect_garmin_user");
    assert.equal(args[0], snapshot);
    sinon.restore();
    });
}); //End TEST
