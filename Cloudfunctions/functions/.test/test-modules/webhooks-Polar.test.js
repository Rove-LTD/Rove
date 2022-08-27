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
const successfulPINGMessageDoc = "successfulTestPINGMessageDoc";
let successfulWebhookMessage;
let successfulPINGMessage;
let unsuccessfulWebhookMessage;
const devTestData = testParameters.devTestData
const devUserData = testParameters.devUserData
const test = require('firebase-functions-test')(firebaseConfig, testParameters.testKeyFile);
myFunctions = require('../../index.js');
// -----------END INITIALISE ROVE TEST PARAMETERS----------------------------//

// ---------REQUIRE FUNCTONS TO BE STUBBED----------------------//
// include the functions that we are going to be stub in the
// testing processes - these have to have the same constant
// name as in the function we are testing
const got = require('got');
const admin = require('firebase-admin');
const webhookInBox = require('../../webhookInBox');
//-------------TEST --- webhooks-------
describe("Testing that the Polar Webhooks work: ", () => {
    before ('set up the userIds in the test User doc', async () => {
      await admin.firestore()
      .collection("users")
      .doc(testDev+testUser)
      .set({
          "devId": testDev,
          "userId": testUser,
          "polar_user_id" : "polar_test_user",
          "polar_access_token": "test_polar_access_token",
        }, {merge: true});

      activityDocs = await admin.firestore()
          .collection("users")
          .doc(testDev+testUser)
          .collection("activities")
          .get();
      
      activityDocs.forEach(async (doc)=>{
          await doc.ref.delete();
      });

      successfulWebhookMessage = {
        provider: "polar",
        method: "POST",
        secret_lookups: ["roveLiveSecrets"],
        body: '{"event": "EXERCISE","user_id": "polar_test_user","entity_id": "aQlC83","timestamp": "2018-05-15T14:22:24Z","url": "https://www.polaraccesslink.com/v3/exercises/aQlC83"}',
        status: "added before the tests to be successful",
      }

      successfulPINGMessage = {
          provider: "polar",
          method: "POST",
          secret_lookups: ["roveLiveSecrets"],
          body: '{"timestamp":"2022-08-09T17:18:32.696Z","event":"PING"}',
          status: "added before the tests to be successful",
      }

        unsuccessfulWebhookMessage = {
            provider: "polar",
            method: "POST",
            secret_lookups: ["roveLiveSecrets"],
            body: '{"event": "EXERCISE","user_id": "incorrect_test_user","entity_id": "aQlC83","timestamp": "2018-05-15T14:22:24Z","url": "https://www.polaraccesslink.com/v3/exercises/aQlC83"}',
            status: "added before the tests to be successful",
        }

    });
    after('clean-up the webhookInbox documents',async ()=>{

    })
    it('Webhooks should log event and repond with status 200...', async () => {
      // set the request object with the correct provider, developerId and userId
      const req = {
        debug: true,
        url: "https://us-central1-rovetest-beea7.cloudfunctions.net/polarWebhook",
        method: "POST",
        headers: {
            "polar-webhook-signature": "cebdf4cbe1317a77e2ca3bdcb741314b0b26c903583a06dddd4b6909d01a6a6f",
        },
        rawBody: new Buffer.from(JSON.stringify({
            "event": "EXERCISE",
            "user_id": "polar_test_user",
            "entity_id": "aQlC83",
            "timestamp": "2018-05-15T14:22:24Z",
            "url": "https://www.polaraccesslink.com/v3/exercises/aQlC83"
          })) //in the real message the rawBody is a buffer with the payload
    };
        res = {
            sendStatus: (code)=>{assert.equal(code, 200);},
        }

        // set up stubs so that WebhookInBox is not written to
        // this would trigger the function in the online environment
        const stubbedWebhookInBox = sinon.stub(webhookInBox, "push");
        stubbedWebhookInBox.onCall().returns("testDoc");

        await myFunctions.polarWebhook(req, res);

        // check the webhookInBox was called correctly
        args = stubbedWebhookInBox.getCall(0).args;
        assert(stubbedWebhookInBox.calledOnceWithExactly(req, "polar", ["roveTestSecrets"]),
                "webhookInBox called with wrong args: "+args);
        sinon.restore();

    });
    it('read webhookInBox event and process it successfully...', async () => {

        //set up the stubbed response to mimic Polar's response when called with the
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
        const fitFilePayload = {
            rawBody: Buffer.from("this file stuff"),
         }; // TODO: make this an actual fit file payload
        stubbedPolarCall = sinon.stub(got, "get");
        stubbedPolarCall.onFirstCall().returns(polarExercisePayload);
        const stubbedWebhookInBox = sinon.stub(webhookInBox, "delete");
        stubbedPolarCall.onSecondCall().returns(fitFilePayload);
        stubbedSaveFile = sinon.stub(admin.storage(), "bucket").returns({
          file: sinon.stub().returnsThis(),
          save: sinon.stub().returns("fileData"),
          getSignedUrl: sinon.stub().returns(["someURL"])
        });
        const snapshot = test.firestore.makeDocumentSnapshot(successfulWebhookMessage, "webhookInBox/"+successfulWebhookMessageDoc);

        wrapped = test.wrap(myFunctions.processWebhookInBox);
        await wrapped(snapshot);
        // give the sendToDeveloper function a chance to run
        const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
        await wait(1000);
        // check the webhookInBox function was called with the correct args
        assert(stubbedWebhookInBox.calledOnceWith(snapshot.ref), "webhookInBox called incorrectly");
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
              distance: 1600, //float no trailing 0
              avg_speed: null, //float
              active_calories: 530,
              activity_duration: 9840,
              start_time: '2008-10-13T10:40:02.000Z', //ISO 8601 UTC
              avg_heart_rate: 129,
              max_heart_rate_bpm: 147,
              avg_cadence: null,
              elevation_gain: null,
              elevation_loss: null,
              provider: "polar",
              file: "someURL",
              version: "1.0"
          },
          raw: polarExercisePayload.json(),
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
    it('read webhookInBox PING event and process it successfully...', async () => {

        const spyConsoleLog = sinon.spy(console, "log");
        const snapshot = test.firestore.makeDocumentSnapshot(successfulPINGMessage, "webhookInBox/"+successfulPINGMessageDoc);

        wrapped = test.wrap(myFunctions.processWebhookInBox);
        await wrapped(snapshot);
        calledArgs = spyConsoleLog.getCall(1).args;
        assert.equal(calledArgs[0],"polar webhook message event = PING, do nothing");
        sinon.restore();
    });
    it('Webhooks should repond with status 401 if method incorrect...', async () => {
        // set the request object with the correct provider, developerId and userId
        const req = {
            debug: true,
            url: "https://us-central1-rovetest-beea7.cloudfunctions.net/polarWebhook",
            method: "Incorrect",
            headers: {
                "Polar-Webhook-Signature": "ef8381ea1709c8097cb3e203eae2b6caacb699580fe9636763fac7ef742d5413",
            },
            body: {
                "event": "EXERCISE",
                "user_id": "polar_test_user",
                "entity_id": "aQlC83",
                "timestamp": "2018-05-15T14:22:24Z",
                "url": "https://www.polaraccesslink.com/v3/exercises/aQlC83"
              }
        };
        res = {
            sendStatus: (code)=>{assert.equal(code, 401);},
        }
        // set up stubs so that WebhookInBox is not written to
        // this would trigger the function in the online environment
        const stubbedWebhookInBox = sinon.stub(webhookInBox, "push");
        stubbedWebhookInBox.onCall().returns("testDoc");

        await myFunctions.polarWebhook(req, res);
        // check the inBox was not written to
        assert.equal(stubbedWebhookInBox.notCalled, true);
        sinon.restore();
    });
    it('Webhooks should repond with status 200 if signature correct...', async () => {
        // set the request object with the correct provider, developerId and userId
        const req = {
            debug: true,
            url: "https://us-central1-rovetest-beea7.cloudfunctions.net/polarWebhook",
            method: "POST",
            headers: {"polar-webhook-event":"EXERCISE","polar-webhook-signature":"929160c429a65f5f8cb762e3708430a8adee7ce5783a5ab1229c18e23be6cbab"},
            body: {"entity_id":"5AvdOL3n","user_id":58633784,"event":"EXERCISE","timestamp":"2022-08-12T15:27:40.1Z","url":"https://polaraccesslink.com/v3/exercises/5AvdOL3n"},
            rawBody: '{"entity_id":"5AvdOL3n","user_id":58633784,"event":"EXERCISE","timestamp":"2022-08-12T15:27:40.1Z","url":"https://polaraccesslink.com/v3/exercises/5AvdOL3n"}'
        };
        res = {
            sendStatus: (code)=>{assert.equal(code, 200);},
        }
        // set up stubs so that WebhookInBox is not written to
        // this would trigger the function in the online environment
        const stubbedWebhookInBox = sinon.stub(webhookInBox, "push");
        stubbedWebhookInBox.onCall().returns("testDoc");

        await myFunctions.polarWebhook(req, res);
        // check the inBox was written to
        assert(stubbedWebhookInBox.calledOnceWithExactly(req, "polar", ["roveTestSecrets"]),
                "webhookInBox called with wrong args");        sinon.restore();
    });
    it('read webhook inbox message and error if no users that match polar_id...', async () => {

    const data = unsuccessfulWebhookMessage;

    const snapshot = test.firestore.makeDocumentSnapshot(data, "webhookInBox/"+unsuccessfulWebhookMessageDoc);
    wrapped = test.wrap(myFunctions.processWebhookInBox);
    // set up stubs so that WebhookInBox is updated 
    const stubbedWebhookInBox = sinon.stub(webhookInBox, "writeError");
    await wrapped(snapshot);
    args = stubbedWebhookInBox.getCall(0).args; //this first call
    // check webhookInBox called with the correct parameters
    assert(stubbedWebhookInBox.calledOnce, "webhookInBox called too many times");
    assert.equal(args[1].message, "zero users registered to polar webhook user_id incorrect_test_user");
    assert.equal(args[0], snapshot.ref);
    sinon.restore();
    });
    it.skip('NO STUBBS so SKIPPED - read a specific webhookInBox event and process it without stubbing...', async () => {
        const testDocId = "JtDTxPWIFBj55FcTQEEX";
        webhookDoc = await admin.firestore()
            .collection("webhookInBox")
            .doc(testDocId)
            .get();
        
        webhookDocData = webhookDoc.data();
        
        const snapshot = test.firestore.makeDocumentSnapshot(webhookDocData, "webhookInBox/"+webhookDoc.id);

        wrapped = test.wrap(myFunctions.processWebhookInBox);
        await wrapped(snapshot);
        sinon.restore();
      });
}); //End TEST
