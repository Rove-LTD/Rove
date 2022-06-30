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
//-------------TEST 2--- Test Callbacks from Strava-------
 describe("Check the Wahoo Disconnect Service works: ", () => {
  before(async () => {
    await admin.firestore()
        .collection("users")
        .doc(testUser)
        .set({
            "devId": testDev,
            "email": "paul.userTest@gmail.com",
            "strava_connected": true,
            "strava_access_token": "5aaf99adfa5a8c1c09c257b4dd892a2f56864c11",
            "strava_refresh_token": "0502b0478ab5374c578e022fb88a3ab30cfa9f88",
            "strava_id": "12972711"});

    await admin.firestore()
        .collection("users")
        .doc(testUser)
        .collection("activities")
        .doc()
        .set({raw: {field1: "somedata"},
            sanitised: {data_source: "strava"}});

  });
  it('Check that service succeeds if user authorised already', async () => {
    req = {
      url: "https://ourDomain.com",
      method: "POST",
      query:{},
      body:{"owner_id":12972711,"object_type":"athlete","aspect_type":"update","subscription_id":217520,"object_id":12972711,"updates":{"authorized":"false"},"event_time":1656517720}
    };
    res = {
      status: (code) => {
        assert.equal(code, 200);
      },
      send: (message) => {
        assert.equal(message, '')
      }
    }

    // set up stubbed functions
    testResponse = {
      json: ()=>{
        return {"success":"Application has been revoked"};
      }
    }

   //const stubbedGot = sinon.stub(got, "delete");
   //stubbedGot.onFirstCall().returns(testResponse);
    
    await myFunctions.stravaWebhook(req, res);
    // check the got function was called with the correct options
    // check the wahoo fields were deleted from the database
    // check the wahoo activities were deleted from the database only for this user
    const userDoc = await admin.firestore()
        .collection("users")
        .doc(testUser)
        .get();
      
    const activities = await admin.firestore()
        .collection("users")
        .doc(testUser)
        .collection("activities")
        .where("sanitised.data_source","==","strava")
        .get();
    
    const expectedUserResults = {
      "devId": "paulsTestDev",
      "email": "paul.userTest@gmail.com",
    };
    
    assert.deepEqual(userDoc.data(), expectedUserResults);
    assert.equal(activities.docs.length, 0);

    sinon.restore();
  })
  it('Check that service succeeds if user authorised already', async () => {
    req = {
      url: "https://ourDomain.com?devId="+testDev+"&userId="+testUser+"&provider=strava&devKey=test-key",
    };
    res = {
      status: (code) => {
        assert.equal(code, 200);
      },
      send: (message) => {
        assert.equal(message, '')
      }
    }

    // set up stubbed functions
    testResponse = {
      json: ()=>{
        return {"success":"Application has been revoked"};
      }
    }

   //const stubbedGot = sinon.stub(got, "delete");
   //stubbedGot.onFirstCall().returns(testResponse);
    
    await myFunctions.disconnectService(req, res);
    // check the got function was called with the correct options
    // check the wahoo fields were deleted from the database
    // check the wahoo activities were deleted from the database only for this user
    const userDoc = await admin.firestore()
        .collection("users")
        .doc(testUser)
        .get();
      
    const activities = await admin.firestore()
        .collection("users")
        .doc(testUser)
        .collection("activities")
        .where("sanitised.data_source","==","strava")
        .get();
    
    const expectedUserResults = {
      "devId": "paulsTestDev",
      "email": "paul.userTest@gmail.com",
    };
    
    assert.deepEqual(userDoc.data(), expectedUserResults);
    assert.equal(activities.docs.length, 0);

    sinon.restore();
  })
  // etc...

});//End TEST 2--- Test Callbacks for Strava--------------
