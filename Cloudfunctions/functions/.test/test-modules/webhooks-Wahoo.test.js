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
const webhookInBox = require('../../webhookInBox');
//-------------TEST --- webhooks-------
describe("Testing that the Wahoo Webhooks work: ", () => {
    before ('set up the userIds in the test User doc', async () => {
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

      successfulWebhookMessage = {
            provider: "wahoo",
            body: '{"user":{"id":"wahoo_test_user"},"event_type":"workout_summary","workout_summary":{"duration_active_accum":"9.0","workout":{"name":"Cycling","workout_token":"ELEMNT AE48:274","workout_type_id":0,"id":147564736,"updated_at":"2022-06-13T16:39:08.000Z","plan_id":null,"minutes":0,"starts":"2022-06-13T16:38:51.000Z","created_at":"2022-06-13T16:39:08.000Z"},"speed_avg":"0.0","duration_total_accum":"9.0","cadence_avg":"0.0","id":140473420,"work_accum":"0.0","power_bike_tss_last":null,"ascent_accum":"0.0","power_bike_np_last":null,"duration_paused_accum":"0.0","created_at":"2022-06-13T16:39:09.000Z","updated_at":"2022-06-13T16:39:09.000Z","power_avg":"0.0","file":{"url":"https://cdn.wahooligan.com/wahoo-cloud/production/uploads/workout_file/file/WpHvKL3irWsv2vHzGzGF_Q/2022-06-13-163851-ELEMNT_AE48-274-0.fit"},"distance_accum":"0.0","heart_rate_avg":"0.0","calories_accum":"0.0"},"webhook_token":"348a6fe2-3719-4647-a233-933b8c404d6b"}',
            method: "POST",
            secret_lookup: "roveLiveSecrets",
            status: "added before the tests to be successful",
        }

            unsuccessfulWebhookMessage = {
                provider: "wahoo",
                body: '{"user":{"id":"wahoo_test_user"},"event_type":"incorrect","workout_summar_nothere":{"duration_active_accum":"9.0","workout":{"name":"Cycling","workout_token":"ELEMNT AE48:274","workout_type_id":"incorrect","id":147564736,"updated_at":"2022-06-13T16:39:08.000Z","plan_id":null,"minutes":0,"starts":"2022-06-13T16:38:51.000Z","created_at":"2022-06-13T16:39:08.000Z"},"speed_avg":"0.0","duration_total_accum":"9.0","cadence_avg":"0.0","id":140473420,"work_accum":"0.0","power_bike_tss_last":null,"ascent_accum":"0.0","power_bike_np_last":null,"duration_paused_accum":"0.0","created_at":"2022-06-13T16:39:09.000Z","updated_at":"2022-06-13T16:39:09.000Z","power_avg":"0.0","file":{"url":"https://cdn.wahooligan.com/wahoo-cloud/production/uploads/workout_file/file/WpHvKL3irWsv2vHzGzGF_Q/2022-06-13-163851-ELEMNT_AE48-274-0.fit"},"distance_accum":"0.0","heart_rate_avg":"0.0","calories_accum":"0.0"},"webhook_token":"348a6fe2-3719-4647-a233-933b8c404d6b"}',
                method: "POST",
                secret_lookup: "roveLiveSecrets",
                status: "added before the tests to be unsuccessful",
            }

    });
    after('clean-up the webhookInbox documents',async ()=>{

    })
    it('Webhooks should log event and repond with status 200...', async () => {
      // set the request object with the correct provider, developerId and userId
      const req = {
          debug: true,
          url: "https://us-central1-rovetest-beea7.cloudfunctions.net/wahooWebhook",
          method: "POST",
          body:{"user":{"id":"wahoo_test_user"},"event_type":"workout_summary","workout_summary":{"duration_active_accum":"9.0","workout":{"name":"Cycling","workout_token":"ELEMNT AE48:274","workout_type_id":0,"id":147564736,"updated_at":"2022-06-13T16:39:08.000Z","plan_id":null,"minutes":0,"starts":"2022-06-13T16:38:51.000Z","created_at":"2022-06-13T16:39:08.000Z"},"speed_avg":"0.0","duration_total_accum":"9.0","cadence_avg":"0.0","id":140473420,"work_accum":"0.0","power_bike_tss_last":null,"ascent_accum":"0.0","power_bike_np_last":null,"duration_paused_accum":"0.0","created_at":"2022-06-13T16:39:09.000Z","updated_at":"2022-06-13T16:39:09.000Z","power_avg":"0.0","file":{"url":"https://cdn.wahooligan.com/wahoo-cloud/production/uploads/workout_file/file/WpHvKL3irWsv2vHzGzGF_Q/2022-06-13-163851-ELEMNT_AE48-274-0.fit"},"distance_accum":"0.0","heart_rate_avg":"0.0","calories_accum":"0.0"},"webhook_token":"348a6fe2-3719-4647-a233-933b8c404d6b"}
};
    res = {
        sendStatus: (code)=>{assert.equal(code, 200);},
    }
    // set up stubs so that WebhookInBox is not written to
    // this would trigger the function in the online environment
    const stubbedWebhookInBox = sinon.stub(webhookInBox, "push");
    stubbedWebhookInBox.onCall(0).returns("testDoc");

    await myFunctions.wahooWebhook(req, res);

    const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
    await wait(1000);
    // check the webhookInBox was called correctly
    args = stubbedWebhookInBox.getCall(0).args; //this first call
    assert(stubbedWebhookInBox.calledOnceWithExactly(req, "wahoo", "roveTestSecrets"),
            "webhookInBox called with wrong args: "+args);

    });
    it('read webhookInBox event and process it successfully...', async () => {

        const snapshot = test.firestore.makeDocumentSnapshot(successfulWebhookMessage, "webhookInBox/"+successfulWebhookMessageDoc);

        // set up stubs so that WebhookInBox is not deleted as the record
        // will not be there - it was not written
        const stubbedWebhookInBox = sinon.stub(webhookInBox, "delete");

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
       .get();
  
       const sanatisedActivity = testUserDocs.docs[0].data();
       const expectedResults = {
            sanitised: {
                userId: testUser,
                activity_id: 140473420,
                activity_name: "Cycling",
                activity_type: "BIKING",
                distance: "0.0",
                avg_speed: "0.0",
                active_calories: "0.0",
                activity_duration: "9.0",
                start_time: '2022-06-13T16:38:51.000Z',
                avg_heart_rate: "0.0",
                avg_cadence: "0.0",
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
                version: "1.0"
            },
            raw: JSON.parse(successfulWebhookMessage.body),
            "status": "sent",
            "timestamp": "not tested",
        }
       sanatisedActivity.timestamp = "not tested";
  
       assert.deepEqual(sanatisedActivity, expectedResults);
       sinon.restore();
  
      });
    it('Webhooks should repond with status 401 if method incorrect...', async () => {
    // set the request object with the correct provider, developerId and userId
    const req = {
        debug: true,
        url: "https://us-central1-rovetest-beea7.cloudfunctions.net/wahooWebhook",
        method: "DELETE",
        body:{"user":{"id": "wahoo_test_user"},"event_type":"workout_summary","workout_summary":{"duration_active_accum":"9.0","workout":{"name":"Cycling","workout_token":"ELEMNT AE48:274","workout_type_id":0,"id":147564736,"updated_at":"2022-06-13T16:39:08.000Z","plan_id":null,"minutes":0,"starts":"2022-06-13T16:38:51.000Z","created_at":"2022-06-13T16:39:08.000Z"},"speed_avg":"0.0","duration_total_accum":"9.0","cadence_avg":"0.0","id":140473420,"work_accum":"0.0","power_bike_tss_last":null,"ascent_accum":"0.0","power_bike_np_last":null,"duration_paused_accum":"0.0","created_at":"2022-06-13T16:39:09.000Z","updated_at":"2022-06-13T16:39:09.000Z","power_avg":"0.0","file":{"url":"https://cdn.wahooligan.com/wahoo-cloud/production/uploads/workout_file/file/WpHvKL3irWsv2vHzGzGF_Q/2022-06-13-163851-ELEMNT_AE48-274-0.fit"},"distance_accum":"0.0","heart_rate_avg":"0.0","calories_accum":"0.0"},"webhook_token":"348a6fe2-3719-4647-a233-933b8c404d6b"}
};
    res = {
        sendStatus: (code)=>{assert.equal(code, 401);},
    }
    // set up stubs so that WebhookInBox is not written to
    // this would trigger the function in the online environment
    const stubbedWebhookInBox = sinon.stub(webhookInBox, "push");
    stubbedWebhookInBox.onCall().returns("testDoc");
    await myFunctions.wahooWebhook(req, res);
    // check the inBox was not written to
    assert.equal(stubbedWebhookInBox.notCalled, true);
    sinon.restore();
    });
    it('Webhooks should repond with status 401 if webhook token is incorrect...', async () => {
        // set the request object with the correct provider, developerId and userId
        const req = {
            debug: true,
            url: "https://us-central1-rovetest-beea7.cloudfunctions.net/wahooWebhook",
            method: "POST",
            body:{"user":{"id": "wahoo_test_user"},"event_type":"workout_summary","workout_summary":{"duration_active_accum":"9.0","workout":{"name":"Cycling","workout_token":"ELEMNT AE48:274","workout_type_id":0,"id":147564736,"updated_at":"2022-06-13T16:39:08.000Z","plan_id":null,"minutes":0,"starts":"2022-06-13T16:38:51.000Z","created_at":"2022-06-13T16:39:08.000Z"},"speed_avg":"0.0","duration_total_accum":"9.0","cadence_avg":"0.0","id":140473420,"work_accum":"0.0","power_bike_tss_last":null,"ascent_accum":"0.0","power_bike_np_last":null,"duration_paused_accum":"0.0","created_at":"2022-06-13T16:39:09.000Z","updated_at":"2022-06-13T16:39:09.000Z","power_avg":"0.0","file":{"url":"https://cdn.wahooligan.com/wahoo-cloud/production/uploads/workout_file/file/WpHvKL3irWsv2vHzGzGF_Q/2022-06-13-163851-ELEMNT_AE48-274-0.fit"},"distance_accum":"0.0","heart_rate_avg":"0.0","calories_accum":"0.0"},"webhook_token":"incorrect"}
    };
        res = {
            send: (text)=>{assert.equal(text, "NOT AUTHORISED")},
            status: (code)=>{assert.equal(code, 401);},
        }
        // set up stubs so that WebhookInBox is not written to
        // this would trigger the function in the online environment
        const stubbedWebhookInBox = sinon.stub(webhookInBox, "push");
        stubbedWebhookInBox.onCall().returns("testDoc");
        await myFunctions.wahooWebhook(req, res);
        // check the inBox was not written to
        assert.equal(stubbedWebhookInBox.notCalled, true);
        sinon.restore();

    });
    it('read webhook message and error if sanitise fails and repond with status 200...', async () => {

        const data = unsuccessfulWebhookMessage;

        const snapshot = test.firestore.makeDocumentSnapshot(data, "webhookInBox/"+unsuccessfulWebhookMessageDoc);
        // set up stubs so that WebhookInBox is updated 
        const stubbedWebhookInBox = sinon.stub(webhookInBox, "writeError");
        wrapped = test.wrap(myFunctions.processWebhookInBox);
        await wrapped(snapshot);
        args = stubbedWebhookInBox.getCall(0).args; //this first call
        // check webhookInBox called with the correct parameters
        assert(stubbedWebhookInBox.calledOnce, "webhookInBox called too many times");
        assert.equal(args[1].message, "don't recognise the wahoo event_type: incorrect");
        assert.equal(args[0], snapshot.ref);
        sinon.restore();
    });
}); //End TEST
