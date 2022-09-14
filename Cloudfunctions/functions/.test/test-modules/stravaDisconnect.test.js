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
const webhookInBox = require('../../webhookInBox');
//-------------TEST 2--- Test Callbacks from Strava-------
 describe("Check the Strava Disconnect Service works: ", () => {
  const now = new Date()/1000;
  const tokenFutureExpiryDate = now+1000;
  const tokenPastExpiryDate = now-1000;
  beforeEach(async () => {
    nowInSeconds = new Date()/1000
    await admin.firestore()
        .collection("users")
        .doc(testDev+testUser)
        .set({
            "devId": testDev,
            "userId": testUser,
            "email": "paul.userTest@gmail.com",
            "strava_connected": true,
            "strava_access_token": "4c68a65e19eb899b8f68aa21e760b074bf035a95",
            "strava_client_id": 72486,
            "strava_refresh_token": "78ba71c103106141ea7030ce60ff1ee3d599b7ba",
            "strava_token_expires_at": tokenFutureExpiryDate,
            "strava_id": 12972711});

    await admin.firestore()
        .collection("users")
        .doc(testDev+testUser)
        .collection("activities")
        .doc()
        .set({raw: {field1: "somedata"},
            sanitised: {provider: "strava"}});

  });
  it('Check Strava De-auth webhook saves to the InBox.', async () => {
    req = {
      debug: true,
      url: "https://ourDomain.com",
      method: "POST",
      query:{},
      body:{"owner_id":12972711,"object_type":"athlete","aspect_type":"update","subscription_id":217520,"object_id":12972711,"updates":{"authorized":"false"},"event_time":1656517720}
    };
    res = {
      sendStatus: (code)=> {assert.equal(code, 200);},
      set: (accessControl, star)=>{
        assert.equal(accessControl, "Access-Control-Allow-Origin");
        assert.equal(star, "*");
      }
    }

    // set up stubbed functions - we dont write to the inBox

    const stubbedWebhookInBox = sinon.stub(webhookInBox, "push");
    stubbedWebhookInBox.returns("testDoc");
    
    await myFunctions.stravaWebhook(req, res);
    const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
    await wait(1000);
    // check the got function was called with the correct options
    // check the wahoo fields were deleted from the database
    // check the wahoo activities were deleted from the database only for this user
    assert(stubbedWebhookInBox.calledWithExactly(req, "strava", 72486), "wrong arguments in call");

    sinon.restore();
  })
  it('Check Strava De-auth webhook processes the InBox.', async () => {
    
    //TODO: turn inboxData to snapshot
    // set up stubbed functions
    testResponse = {
      access_token: "4c68a65e19eb899b8f68aa21e760b074bf035a95"
    }

    // set up stubs.  dont delete the webhookInBox and don't really deauthorise
    const stubbedGot = sinon.stub(stravaApi.oauth, "deauthorize");
    const stubbedWebhookInBox = sinon.stub(webhookInBox, "delete");
    stubbedGot.onFirstCall().returns(testResponse);
    
    //wrap function with snapshot input
    inboxData = {
      provider: "strava",
          status: "new",
          method: "POST",
          secret_lookups: 72486,
          body: JSON.stringify({"owner_id":12972711,"object_type":"athlete","aspect_type":"update","subscription_id":217520,"object_id":12972711,"updates":{"authorized":"false"},"event_time":1656517720})
    };
    const snapshot = test.firestore.makeDocumentSnapshot(inboxData, "webhookInBox/testWebhookMessageDocId");

    wrapped = test.wrap(myFunctions.processWebhookInBox);
    await wrapped(snapshot);

    const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
    await wait(1000);
    // check the webhookInBox function was called with the correct args
    assert(stubbedWebhookInBox.calledOnceWith(snapshot.ref), "webhookInBox called incorrectly");
    // check the wahoo fields were deleted from the database
    // check the wahoo activities were deleted from the database only for this user
    const userDoc = await admin.firestore()
        .collection("users")
        .doc(testDev+testUser)
        .get();
      
    const activities = await admin.firestore()
        .collection("users")
        .doc(testDev+testUser)
        .collection("activities")
        .where("sanitised.provider","==","strava")
        .get();
    
    const expectedUserResults = {
      "devId": testDev,
      "userId": testUser,
      "email": "paul.userTest@gmail.com",
    };
    
    assert.deepEqual(userDoc.data(), expectedUserResults);
    assert.equal(activities.docs.length, 0);

    sinon.restore();
  })
  it('Check Strava de-auth http works.', async () => {
    req = {
      debug: true,
      url: "https://ourDomain.com?devId="+testDev+"&userId="+testUser+"&provider=strava&devKey=test-key",
    };
    res = {
      status: (code) => {
        assert.equal(code, 200);
      },
      send: (message) => {
        assert.equal(message, '')
      },
      set: (accessControl, star)=>{
        assert.equal(accessControl, "Access-Control-Allow-Origin");
        assert.equal(star, "*");
      }
    }

    // set up stubbed functions
    testResponse = {
      access_token: "4c68a65e19eb899b8f68aa21e760b074bf035a95"
    };

    const stubbedGot = sinon.stub(stravaApi.oauth, "deauthorize");
    stubbedGot.onFirstCall().returns(testResponse);
    
    await myFunctions.disconnectService(req, res);
    const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
    await wait(1000);
    // check the got function was called with the correct options
    // check the wahoo fields were deleted from the database
    // check the wahoo activities were deleted from the database only for this user
    const userDoc = await admin.firestore()
        .collection("users")
        .doc(testDev+testUser)
        .get();
      
    const activities = await admin.firestore()
        .collection("users")
        .doc(testDev+testUser)
        .collection("activities")
        .where("sanitised.provider","==","strava")
        .get();
    
    const expectedUserResults = {
      "devId": testDev,
      "userId": testUser,
      "email": "paul.userTest@gmail.com",
    };
    
    assert.deepEqual(userDoc.data(), expectedUserResults);
    assert.equal(activities.docs.length, 0);

    sinon.restore();
  })
  describe("test with the token expiry date in the past", ()=>{
    beforeEach(async ()=> {
      // set the expiry date for the token in the past
      await admin.firestore()
      .collection("users")
      .doc(testDev+testUser)
      .set({
        "strava_token_expires_at": tokenPastExpiryDate
        },
        {merge: true});
    });
    it('Check that service succeeds if user authorised already and refresh code needed', async () => {

      req = {
        debug: true,
        url: "https://ourDomain.com?devId="+testDev+"&userId="+testUser+"&provider=strava&devKey=test-key",
      };
      res = {
        status: (code) => {
          assert.equal(code, 200);
        },
        send: (message) => {
          assert.equal(message, '')
        },
        set: (accessControl, star)=>{
          assert.equal(accessControl, "Access-Control-Allow-Origin");
          assert.equal(star, "*");
        }
      }

      // set up stubbed functions
    // set up stubbed functions
    testResponse = {
      access_token: "test-strava-refreshed-access-token"
    };
    testResponseRefresh = {
      access_token: 'test-strava-refreshed-access-token',
      refresh_token: 'test-strava-new-refresh-token',
      expires_at: tokenFutureExpiryDate,
      expires_in: 7200
    }

      const stubbedGot = sinon.stub(stravaApi.oauth, "deauthorize");
      const stubbedRefresh = sinon.stub(stravaApi.oauth, "refreshToken");
      stubbedGot.onFirstCall().returns(testResponse);
      stubbedRefresh.onFirstCall().returns(testResponseRefresh);
      
      await myFunctions.disconnectService(req, res);
      // check the got function was called with the correct options
      // check the wahoo fields were deleted from the database
      // check the wahoo activities were deleted from the database only for this user
      // got function call checks
      //stubbedDelete.calledOnceWith("deleteArgs");
      //stubbedPost.calledOnceWith("postArgs");
      const userDoc = await admin.firestore()
          .collection("users")
          .doc(testDev+testUser)
          .get();
        
      const activities = await admin.firestore()
          .collection("users")
          .doc(testDev+testUser)
          .collection("activities")
          .where("sanitised.provider","==","strava")
          .get();
      
      const expectedUserResults = {
        "devId": testDev,
        "userId": testUser,
        "email": "paul.userTest@gmail.com",
      };
      
      assert.deepEqual(userDoc.data(), expectedUserResults);
      assert.equal(activities.docs.length, 0);

      sinon.restore();
    });
  });
  // etc...

});//End TEST 2--- Test Callbacks for Strava--------------
