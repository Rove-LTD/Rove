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
        secret_lookup: "roveLiveSecrets",
        body: '{"event": "EXERCISE","user_id": "polar_test_user","entity_id": "aQlC83","timestamp": "2018-05-15T14:22:24Z","url": "https://www.polaraccesslink.com/v3/exercises/aQlC83"}',
        status: "added before the tests to be successful",
      }

      successfulPINGMessage = {
          provider: "polar",
          method: "POST",
          secret_lookup: "roveLiveSecrets",
          body: '{"timestamp":"2022-08-09T17:18:32.696Z","event":"PING"}',
          status: "added before the tests to be successful",
      }

        unsuccessfulWebhookMessage = {
            provider: "polar",
            method: "POST",
            secret_lookup: "roveLiveSecrets",
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
            sendStatus: (code)=>{assert.equal(code, 200);},
        }

        // set up stubs so that WebhookInBox is not written to
        // this would trigger the function in the online environment
        const stubbedWebhookInBox = sinon.stub(webhookInBox, "push");
        stubbedWebhookInBox.onCall().returns("testDoc");

        await myFunctions.polarWebhook(req, res);

        // check the webhookInBox was called correctly
        args = stubbedWebhookInBox.getCall(0).args;
        assert(stubbedWebhookInBox.calledOnceWithExactly(req, "polar", "roveTestSecrets"),
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
        const fitFilePayload = "longStringofFitFile";
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
              file: {"url": "someURL"}
          },
          raw: polarExercisePayload.json(),
          "status": "sent",
          "timestamp": "not tested",
      }
     sanatisedActivity.timestamp = "not tested";
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
            headers: {"x-datadog-sampling-priority":"-1","x-cloud-trace-context":"fb19a10dd0e1ccd345f14ae444b5f1b4/1357503526931563120;o=1","function-execution-id":"zzgtxg83i83m","host":"us-central1-rovetest-beea7.cloudfunctions.net","x-appengine-https":"on","transfer-encoding":"chunked","x-appengine-request-log-id":"62f3c7be00ff0b7a77344d3bc80001737e7834363763316439303439373637396336702d7470000130663130326533633638383535646137313763626631643837616465623433353a3334000100","x-appengine-timeout-ms":"599999","content-type":"application/json","x-appengine-region":"d","x-appengine-default-version-hostname":"x467c1d90497679c6p-tp.appspot.com","polar-webhook-event":"EXERCISE","connection":"close","x-forwarded-for":"52.212.18.54","forwarded":"for=\"52.212.18.54\";proto=https","x-datadog-parent-id":"2594929423869901867","x-forwarded-proto":"https","x-appengine-user-ip":"52.212.18.54","x-appengine-appversionid":"s~x467c1d90497679c6p-tp/0f102e3c68855da717cbf1d87adeb435:34.445641353158191059","x-datadog-trace-id":"2258606105194993868","polar-webhook-signature":"4e9d196f83f0f163cd12917d09725904e1183f5fc7950a38d9c5659976fc430d","x-appengine-citylatlong":"53.349805,-6.260310","x-appengine-country":"IE","traceparent":"00-fb19a10dd0e1ccd345f14ae444b5f1b4-12d6d243f0188270-01","user-agent":"Apache-HttpClient/4.5.13 (Java/1.8.0_312)","x-appengine-city":"dublin","accept-encoding":"gzip,deflate"},
            body:{"event":"EXERCISE","entity_id":"PnKxMgEl","url":"https://polaraccesslink.com/v3/exercises/PnKxMgEl","timestamp":"2022-08-10T14:59:10.463Z","user_id":58633784}
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
        assert(stubbedWebhookInBox.calledOnceWithExactly(req, "polar", "roveTestSecrets"),
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
}); //End TEST
