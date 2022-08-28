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
 describe("Check the Polar Disconnect Service works: ", () => {
  before(async () => {
    await admin.firestore()
        .collection("users")
        .doc(testDev+testUser)
        .set({
            "devId": testDev,
            "userId": testUser,
            "email": "paul.userTest@gmail.com",
            "polar_connected": true,
            "polar_access_token": "test_access_token",
            "polar_client_id": "test client ID",
            "polar_refresh_token": "test_refresh_token",
            "polar_token_expires_in": 1100,
            "polar_token_type": "bearer",
            "polar_user_id": "test_id"});

    await admin.firestore()
        .collection("users")
        .doc(testDev+testUser)
        .collection("activities")
        .doc()
        .set({raw: {field1: "somedata"},
            sanitised: {provider: "polar"}});

  });
  it('Check that service returns with error if user is not already authorised', async () => {
    req = {
      url: "https://ourDomain.com?devId="+testDev+"&userId="+testUser+"&provider=polar&devKey=test-key",
    };
    res = {
      status: (code) => {
        assert.equal(code, 400);
      },
      send: (message) => {
        assert.equal(message, "error: unexpected problem");
      }
    }

    // set up stubbed functions
    testResponse = {
      json: ()=>{
        return {"error":"Access Token not authorised"};
      }
    }

   const stubbedGot = sinon.stub(got, "delete");
   stubbedGot.onFirstCall().returns(testResponse);
    
    await myFunctions.disconnectService(req, res);
    // check the got function was called with the correct options
    // check the polar fields were deleted from the database
    // check the wahoo activities were deleted from the database only for this user
    const userDoc = await admin.firestore()
        .collection("users")
        .doc(testDev+testUser)
        .get();
      
    const activities = await admin.firestore()
        .collection("users")
        .doc(testDev+testUser)
        .collection("activities")
        .where("sanitised.provider","==","polar")
        .get();
    
    const expectedUserResults = {
      "devId": testDev,
      "userId": testUser,
      "email": "paul.userTest@gmail.com",
      "polar_connected": true,
      "polar_access_token": "test_access_token",
      "polar_client_id": "test client ID",
      "polar_refresh_token": "test_refresh_token",
      "polar_token_expires_in": 1100,
      "polar_token_type": "bearer",
      "polar_user_id": "test_id"
    };
    
    assert.deepEqual(userDoc.data(), expectedUserResults);
    assert.isAbove(activities.docs.length, 0);

    sinon.restore();
  });
  it('Check that service succeeds if user authorised already', async () => {
    req = {
      url: "https://ourDomain.com?devId="+testDev+"&userId="+testUser+"&provider=polar&devKey=test-key",
    };
    res = {
      status: (code) => {
        assert.equal(code, 200);
      },
      send: (message) => {
        assert.equal(message, '{"status":"disconnected"}')
      }
    }

    // set up stubbed functions
    testResponse = {
      statusCode: 204,
      json: ()=>{
        return {"success":"Application has been revoked"};
      }
    }

    const stubbedGot = sinon.stub(got, "delete");
    stubbedGot.onFirstCall().returns(testResponse);
    
    await myFunctions.disconnectService(req, res);
    // check the got function was called with the correct options
    // check the polar fields were deleted from the database
    // check the polar activities were deleted from the database only for this user
    const userDoc = await admin.firestore()
        .collection("users")
        .doc(testDev+testUser)
        .get();
      
    const activities = await admin.firestore()
        .collection("users")
        .doc(testDev+testUser)
        .collection("activities")
        .where("sanitised.provider","==","polar")
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
  // etc...

});//End TEST 2--- Test Callbacks for Strava--------------
