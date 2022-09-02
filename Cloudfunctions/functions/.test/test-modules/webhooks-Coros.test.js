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
const corosPush = JSON.stringify(require("./coros.json"));
const corosPushBad = JSON.stringify(require("./corosBad.json"));
// -----------END INITIALISE ROVE TEST PARAMETERS----------------------------//

// ---------REQUIRE FUNCTONS TO BE STUBBED----------------------//
// include the functions that we are going to be stub in the
// testing processes - these have to have the same constant
// name as in the function we are testing
const got = require('got');
const webhookInBox = require('../../webhookInBox');
//-------------TEST --- webhooks-------
describe("Testing that the Coros Webhooks work: ", () => {
    before ('set up the userIds in the test User doc', async () => {
      await admin.firestore()
      .collection("users")
      .doc(testDev+testUser)
      .set({
          "devId": testDev,
          "userId": testUser,
          "coros_user_id": "42dbb958c5a146f29ce9f89e05e5195a",
          "coros_client_id": "e8925760066a490b9d26187f731020f8",
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
            provider: "coros",
            body: corosPush,
            method: "POST",
            secret_lookups: "e8925760066a490b9d26187f731020f8",
            status: "added before the tests to be successful",
        }

        unsuccessfulWebhookMessage = {
            provider: "coros",
            body: corosPushBad,
            method: "POST",
            secret_lookups: "e8925760066a490b9d26187f731020f8",
            status: "added before the tests to be unsuccessful",
        }

    });
    after('clean-up the webhookInbox documents',async ()=>{

    })
    it('Webhooks should log event and repond with status 200...', async () => {
      // set the request object with the correct provider, developerId and userId
      const req = {
          url: "https://us-central1-rovetest-beea7.cloudfunctions.net/corosWebhook",
          method: "POST",
          headers: {
            "client": "e8925760066a490b9d26187f731020f8",
            "secret": "3fec831e956045db9ec000d2083fa056"
          },
          body: corosPush
    };
    res = {
        status: (code)=>{assert.equal(code, 200);},
        send: (text)=>{assert.deepEqual(text, {"message": "ok", "result": "0000"})},
    }
    // set up stubs so that WebhookInBox is not written to
    // this would trigger the function in the online environment
    const stubbedWebhookInBox = sinon.stub(webhookInBox, "push");
    stubbedWebhookInBox.onCall(0).returns("testDoc");

    await myFunctions.corosWebhook(req, res);

    const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
    await wait(1000);
    // check the webhookInBox was called correctly
    args = stubbedWebhookInBox.getCall(0).args; //this first call
    
    assert(stubbedWebhookInBox.calledOnceWith(req, "coros", "e8925760066a490b9d26187f731020f8"),
            "webhookInBox called with wrong args: "+args);
    });
    it('read webhookInBox event and process it successfully...', async () => {

        const snapshot = test.firestore.makeDocumentSnapshot(successfulWebhookMessage, "webhookInBox/"+successfulWebhookMessageDoc);

        // set up stubs so that WebhookInBox is not deleted as the record
        // will not be there - it was not written
        const stubbedWebhookInBox = sinon.stub(webhookInBox, "delete");
        const stubbedWebhookInBoxWriteError = sinon.stub(webhookInBox, "writeError");

        wrapped = test.wrap(myFunctions.processWebhookInBox);
        await wrapped(snapshot);

        const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
        await wait(1000);
        // check the webhookInBox function was called with the correct args
        const deleteCall = stubbedWebhookInBox.getCall(0);
        const writeErrorCall = stubbedWebhookInBoxWriteError.getCall(0);
        assert(stubbedWebhookInBox.calledOnceWith(snapshot.ref), "webhookInBox called incorrectly with: "+deleteCall.args);
        //now check the database was updated correctly
       const sampleActivityDoc = await admin.firestore()
       .collection("users")
       .doc(testDev+testUser)
       .collection("activities")
       .doc("418173292602490880coros")
       .get();

        //now check 3 records where written correctly
        const testActivityDocs = await admin.firestore()
        .collection("users")
        .doc(testDev+testUser)
        .collection("activities")
        .get();
  
       const sanatisedActivity = sampleActivityDoc.data();
       const expectedResults = {
            raw: JSON.parse(successfulWebhookMessage.body),
            sanitised: {"activity_id": "418173292602490880",
                "active_calories": 220000,
                "activity_duration_in_seconds": 2200,
                "activity_name": "Coros Multisport",
                "activity_type": 1,
                "average_pace_in_meters_per_second": 0,
                "distance_in_meters": 22000,
                "file": {"url": null},
                "provider": "coros",
                "start_time": "2018-04-01T09:49:38.000Z",
                "userId": testParameters.testUser,
            },
            "status": "not tested",
            "timestamp": "not tested",
            "triesSoFar": "not tested",
        }
        sanatisedActivity.status = "not tested";
        sanatisedActivity.timestamp = "not tested";
        sanatisedActivity.triesSoFar = "not tested";
        assert.deepEqual(sanatisedActivity, expectedResults);
        assert.equal(testActivityDocs.docs.length, 3, "not enough activity records written");
       sinon.restore();
      });
    it.skip('NOT IMPLEMENTED YET - Webhooks should repond with status 401 if method incorrect...', async () => {
    // set the request object with the correct provider, developerId and userId
    const req = {
        debug: true,
        url: "https://us-central1-rovetest-beea7.cloudfunctions.net/corosWebhook",
        method: "DELETE",
        body: corosPush
    };
    res = {
        send: (text)=>{assert.equal(text, "Method not Valid")},
        status: (code)=>{assert.equal(code, 401);},
    }
    // set up stubs so that WebhookInBox is not written to
    // this would trigger the function in the online environment
    const stubbedWebhookInBox = sinon.stub(webhookInBox, "push");
    stubbedWebhookInBox.onCall().returns("testDoc");
    await myFunctions.corosWebhook(req, res);
    // check the inBox was not written to
    assert.equal(stubbedWebhookInBox.notCalled, true);
    sinon.restore();
    });
    it.skip('NOT IMPLEMENTED YET - Webhooks should repond with status 401 if webhook token is incorrect...', async () => {
        // set the request object with the correct provider, developerId and userId
        const req = {
            debug: true,
            url: "https://us-central1-rovetest-beea7.cloudfunctions.net/wahooWebhook",
            method: "POST",
            body: corosPush
        };
        res = {
            send: (text)=>{assert.equal(text, "NOT AUTHORISED")},
            status: (code)=>{assert.equal(code, 401);},
        }
        // set up stubs so that WebhookInBox is not written to
        // this would trigger the function in the online environment
        const stubbedWebhookInBox = sinon.stub(webhookInBox, "push");
        stubbedWebhookInBox.onCall().returns("testDoc");
        await myFunctions.corosWebhook(req, res);
        // check the inBox was not written to
        assert.equal(stubbedWebhookInBox.notCalled, true);
        sinon.restore();

    });
    it('read webhook message and error if sanitise fails...', async () => {

        const data = unsuccessfulWebhookMessage;

        const snapshot = test.firestore.makeDocumentSnapshot(data, "webhookInBox/"+unsuccessfulWebhookMessageDoc);
        // set up stubs so that WebhookInBox is updated 
        const stubbedWebhookInBox = sinon.stub(webhookInBox, "writeError");
        wrapped = test.wrap(myFunctions.processWebhookInBox);
        await wrapped(snapshot);
        args = stubbedWebhookInBox.getCall(0).args; //this first call
        // check webhookInBox called with the correct parameters
        assert(stubbedWebhookInBox.calledOnce, "webhookInBox called too many times");
        assert.equal(args[1].message, "Cant sanitise message: Cannot read properties of undefined (reading '0')");
        assert.equal(args[0], snapshot.ref);
        sinon.restore();
    });
}); //End TEST
