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
const stravaApi = require("strava-v3");
const webhookInBox = require('../../webhookInBox');
//-------------TEST --- webhooks-------
describe("Testing that the strava Webhooks work: ", () => {
    before ('set up the userIds in the test User doc', async () => {
      await admin.firestore()
      .collection("users")
      .doc(testDev+testUser)
      .set({
          "devId": testDev,
          "userId": testUser,
          "strava_id" : "test_strava_id",
          "strava_access_token": "test_strava_access_token",
          "strava_refresh_token": "test_strava_refresh_token",
          "strava_token_expires_at": new Date().getTime()/1000 + 600,      }, {merge: true});

      activityDocs = await admin.firestore()
          .collection("users")
          .doc(testDev+testUser)
          .collection("activities")
          .get();
      
      activityDocs.forEach(async (doc)=>{
          await doc.ref.delete();
      });

      successfulWebhookMessage = {
            provider: "strava",
            method: "POST",
            secret_lookup: "roveLiveSecrets",
            body: '{"updates":{},"object_type":"activity","object_id":7345142595,"owner_id":"test_strava_id","subscription_id":217520,"aspect_type":"create","event_time":1655824005}',
            status: "added before the tests to be successful",
        }

            unsuccessfulWebhookMessage = {
                provider: "strava",
                method: "POST",
                secret_lookup: "roveLiveSecrets",
                body: '{"updates":{},"object_type":"activity","object_id":7345142595,"owner_id":"incorrect_strava_id","subscription_id":217520,"aspect_type":"create","event_time":1655824005}',
                status: "added before the tests to be successful",
            }

    });
    after('clean-up the webhookInbox documents',async ()=>{

    })
    it('Webhooks should log event and repond with status 200...', async () => {
      // set the request object with the correct provider, developerId and userId
        const req = {
            debug: true,
            url: "https://us-central1-rovetest-beea7.cloudfunctions.net/stravaWebhook",
            method: "POST",
            body: {"updates":{},"object_type":"activity","object_id":7345142595,"owner_id":"test_strava_id","subscription_id":217520,"aspect_type":"create","event_time":1655824005}
        };
        res = {
            sendStatus: (code)=>{assert.equal(code, 200);},
        }

        // set up stubs so that WebhookInBox is not written to
        // this would trigger the function in the online environment
        const stubbedWebhookInBox = sinon.stub(webhookInBox, "push");
        stubbedWebhookInBox.onCall().returns("testDoc");

        await myFunctions.stravaWebhook(req, res);

        // check the webhookInBox was called correctly
        assert(stubbedWebhookInBox.calledOnceWithExactly(req, "strava", "roveLiveSecrets"),
                "webhookInBox called with wrong args");
        sinon.restore();

    });
    it('read webhookInBox event and process it successfully...', async () => {

        //set up the stubbed response to mimic Strava's response when called with the
        const stravaExercisePayload = require('./strava.json');
        stubbedStravaCall = sinon.stub(stravaApi.activities, "get");
        stubbedStravaCall.onFirstCall().returns(stravaExercisePayload);
        const stubbedWebhookInBox = sinon.stub(webhookInBox, "delete");

        const snapshot = test.firestore.makeDocumentSnapshot(successfulWebhookMessage, "webhookInBox/"+successfulWebhookMessageDoc);

        wrapped = test.wrap(myFunctions.processWebhookInBox);
        await wrapped(snapshot);
        // give the sendToDeveloper function a chance to run
        const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
        await wait(6000);
        // check the webhookInBox function was called with the correct args
        assert(stubbedWebhookInBox.calledOnceWith(snapshot.ref), "webhookInBox called incorrectly");
        //now check the database was updated correctly
        const testUserDocs = await admin.firestore()
            .collection("users")
            .doc(testDev+testUser)
            .collection("activities")
            .where("raw.id", "==", 12345678987654321)
            .get();

        const sanatisedActivity = testUserDocs.docs[0].data()["sanitised"];
        const expectedResults = {
            userId: testUser,
            activity_id: 12345678987654321,
            activity_name: "Happy Friday",
            activity_type: "Ride",
            distance: 28099, //float no trailing 0
            avg_speed:"6.7", //float
            active_calories: 781,
            activity_duration: 4207,
            start_time: '2018-02-16T06:52:54.000Z', //ISO 8601 UTC
            avg_heart_rate: null,
            // max_heart_rate_bpm: null,
            avg_cadence: "78.5",
            elevation_gain: "446.6",
            elevation_loss:"17.2",
            provider: "strava",
            version: "1.0",
        }
        assert.deepEqual(sanatisedActivity, expectedResults);
        sinon.restore();
      });
    it('Webhooks should repond with status 401 if method incorrect...', async () => {
        // set the request object with the correct provider, developerId and userId
        const req = {
            debug: true,
            url: "https://us-central1-rovetest-beea7.cloudfunctions.net/stravaWebhook",
            method: "incorrect",
            body: {"updates":{},"object_type":"activity","object_id":7345142595,"owner_id":"test_strava_id","subscription_id":217520,"aspect_type":"create","event_time":1655824005}
        };
        res = {
            sendStatus: (code)=>{assert.equal(code, 401);},
        }
        // set up stubs so that WebhookInBox is not written to
        // this would trigger the function in the online environment
        const stubbedWebhookInBox = sinon.stub(webhookInBox, "push");
        stubbedWebhookInBox.onCall().returns("testDoc");

        await myFunctions.stravaWebhook(req, res);
        // check the inBox was not written to
        assert.equal(stubbedWebhookInBox.notCalled, true);
        sinon.restore();
    });
    it('Webhooks should repond with status 401 if webhook token is incorrect...', async () => {
        // set the request object with the correct provider, developerId and userId
        const req = {
            debug: true,
            url: "https://us-central1-rovetest-beea7.cloudfunctions.net/stravaWebhook",
            method: "POST",
            body: {"updates":{},"object_type":"activity","object_id":7345142595,"owner_id":"test_strava_id","subscription_id":"not correct","aspect_type":"create","event_time":1655824005}
    };
        res = {
            send: (text)=>{assert.equal(text, "NOT AUTHORISED")},
            status: (code)=>{assert.equal(code, 401);},
        }
        // set up stubs so that WebhookInBox is not written to
        // this would trigger the function in the online environment
        const stubbedWebhookInBox = sinon.stub(webhookInBox, "push");
        stubbedWebhookInBox.onCall().returns("testDoc");
        await myFunctions.stravaWebhook(req, res);
        // check the inBox was not written to
        assert.equal(stubbedWebhookInBox.notCalled, true);
        sinon.restore();
    });
    it('read webhook inbox message and error if no users that match strava_id...', async () => {

    const data = unsuccessfulWebhookMessage;

    const snapshot = test.firestore.makeDocumentSnapshot(data, "webhookInBox/"+unsuccessfulWebhookMessageDoc);
    wrapped = test.wrap(myFunctions.processWebhookInBox);
    // set up stubs so that WebhookInBox is updated 
    const stubbedWebhookInBox = sinon.stub(webhookInBox, "writeError");
    await wrapped(snapshot);
    args = stubbedWebhookInBox.getCall(0).args; //this first call
    // check webhookInBox called with the correct parameters
    assert(stubbedWebhookInBox.calledOnce, "webhookInBox called too many times");
    assert.equal(args[1].message, "zero users registered to strava webhook owner_id incorrect_strava_id");
    assert.equal(args[0], snapshot.ref);
    sinon.restore();
    });
}); //End TEST
