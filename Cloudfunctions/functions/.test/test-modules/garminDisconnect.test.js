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
describe("Check the garmin Disconnect Service works: ", () => {
  const now = new Date()/1000;
  const tokenFutureExpiryDate = now+1000;
  const tokenPastExpiryDate = now-1000;
  beforeEach(async () => {
    await admin.firestore()
        .collection("users")
        .doc(testDev+testUser)
        .set({
            "devId": testDev,
            "userId": testUser,
            "email": "paul.userTest@gmail.com",
            "garmin_connected": true,
            "garmin_access_token": "test_access_token",
            "garmin_client_id":  "d3dd1cc9-06b2-4b3e-9eb4-8a40cbd8e53f",
            "garmin_user_id": "test_user_id",
            "garmin_access_token_secret": "test_access_token_secret",
        });

      await admin.firestore()
      .collection("users")
      .doc(testDev+"secondTestUser")
      .set({
          "devId": testDev,
          "userId": "secondTestUser",
          "email": "paul.userTest@gmail.com",
          "garmin_connected": true,
          "garmin_access_token": "test_access_token",
          "garmin_client_id":  "d3dd1cc9-06b2-4b3e-9eb4-8a40cbd8e53f",
          "garmin_user_id": "test_user_id",
          "garmin_access_token_secret": "test_access_token_secret"
        });

    await admin.firestore()
        .collection("users")
        .doc(testDev+testUser)
        .collection("activities")
        .doc()
        .set({raw: {field1: "somedata"},
            sanitised: {provider: "garmin"}});

  });
  it('Check that service returns with error if user is not already authorised', async () => {
    // for this the test data needs to be 
    await admin.firestore()
    .collection("users")
    .doc(testDev+testUser)
    .set({
        "devId": testDev,
        "userId": testUser,
        "email": "paul.userTest@gmail.com",});

    await admin.firestore()
    .collection("users")
    .doc(testDev+"secondTestUser")
    .delete();

    req = {
      url: "https://us-central1-rovetest-beea7.cloudfunctions.net/disconnectService?devId="+testDev+"&userId="+testUser+"&provider=garmin&devKey=test-key",
    };
    res = {
      status: (code) => {
        assert.equal(code, 400);
      },
      send: (message) => {
        assert.equal(message, "error: the userId was not authorised for this provider");
      },
      set: (accessControl, star)=>{
        assert.equal(accessControl, "Access-Control-Allow-Origin");
        assert.equal(star, "*");
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
    // check the garmin fields were deleted from the database
    // check the garmin activities were deleted from the database only for this user
    const userDoc = await admin.firestore()
        .collection("users")
        .doc(testDev+testUser)
        .get();
      
    const activities = await admin.firestore()
        .collection("users")
        .doc(testDev+testUser)
        .collection("activities")
        .where("sanitised.provider","==","garmin")
        .get();
    
    const expectedUserResults = {
      "devId": testDev,
      "userId": testUser,
      "email": "paul.userTest@gmail.com",
    };
    
    assert.deepEqual(userDoc.data(), expectedUserResults);
    assert.isAbove(activities.docs.length, 0);

    sinon.restore();
  });
  it('Check that service returns with error if garmin reports an error', async () => {
    // for this the second test user should not exist data needs to be 

    await admin.firestore()
    .collection("users")
    .doc(testDev+"secondTestUser")
    .delete();

    req = {
      url: "https://us-central1-rovetest-beea7.cloudfunctions.net/disconnectService?devId="+testDev+"&userId="+testUser+"&provider=garmin&devKey=test-key",
    };
    res = {
      status: (code) => {
        assert.equal(code, 400);
      },
      send: (message) => {
        assert.equal(message, "error: unexpected problem");
      },
      set: (accessControl, star)=>{
        assert.equal(accessControl, "Access-Control-Allow-Origin");
        assert.equal(star, "*");
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
    // check the garmin fields were deleted from the database
    // check the garmin activities were deleted from the database only for this user
    const userDoc = await admin.firestore()
        .collection("users")
        .doc(testDev+testUser)
        .get();
      
    const activities = await admin.firestore()
        .collection("users")
        .doc(testDev+testUser)
        .collection("activities")
        .where("sanitised.provider","==","garmin")
        .get();
    
    const expectedUserResults = {
      "devId": testDev,
      "userId": testUser,
      "email": "paul.userTest@gmail.com",
      "garmin_connected": true,
      "garmin_access_token": "test_access_token",
      "garmin_client_id":  "d3dd1cc9-06b2-4b3e-9eb4-8a40cbd8e53f",
      "garmin_user_id": "test_user_id",
      "garmin_access_token_secret": "test_access_token_secret",
    };
    
    assert.deepEqual(userDoc.data(), expectedUserResults);
    assert.isAbove(activities.docs.length, 0);

    sinon.restore();
  });
  it('Check that service succeeds if user authorised already but not the last one', async () => {
    req = {
      url: "https://us-central1-rovetest-beea7.cloudfunctions.net/disconnectService?devId="+testDev+"&userId="+testUser+"&provider=garmin&devKey=test-key",
    };
    res = {
      status: (code) => {
        assert.equal(code, 200);
      },
      send: (message) => {
        assert.equal(message, '{"status":"disconnected"}')
      },
      set: (accessControl, star)=>{
        assert.equal(accessControl, "Access-Control-Allow-Origin");
        assert.equal(star, "*");
      }
    }

    // set up stubbed functions
    testResponse = {
      json: ()=>{
        return {"success":"Application has been revoked"};
      }
    }

   const stubbedGot = sinon.stub(got, "delete");
   stubbedGot.onFirstCall().returns(testResponse);
    
    await myFunctions.disconnectService(req, res);
    // check the got function was called with the correct options
    // check the garmin fields were deleted from the database
    // check the garmin activities were deleted from the database only for this user
    const userDoc = await admin.firestore()
        .collection("users")
        .doc(testDev+testUser)
        .get();
      
    const activities = await admin.firestore()
        .collection("users")
        .doc(testDev+testUser)
        .collection("activities")
        .where("sanitised.provider","==","garmin")
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
  it('Check that service succeeds if user authorised already and IS the last one', async () => {
    // get rid of the second to last user
    await admin.firestore()
      .collection("users")
      .doc(testDev+"secondTestUser")
      .delete();

    req = {
      url: "https://us-central1-rovetest-beea7.cloudfunctions.net/disconnectService?devId="+testDev+"&userId="+testUser+"&provider=garmin&devKey=test-key",
    };
    res = {
      status: (code) => {
        assert.equal(code, 200);
      },
      send: (message) => {
        assert.equal(message, '{"status":"disconnected"}')
      },
      set: (accessControl, star)=>{
        assert.equal(accessControl, "Access-Control-Allow-Origin");
        assert.equal(star, "*");
      }
    }

    // set up stubbed functions
    testResponse = {
      body: ()=>{
        return {"success":"Application has been revoked"};
      },
      statusCode: 204,
    }

   const stubbedGot = sinon.stub(got, "delete");
   stubbedGot.onFirstCall().returns(testResponse);
    
    await myFunctions.disconnectService(req, res);
    // check the got function was called with the correct options
    // check the garmin fields were deleted from the database
    // check the garmin activities were deleted from the database only for this user
    const userDoc = await admin.firestore()
        .collection("users")
        .doc(testDev+testUser)
        .get();
      
    const activities = await admin.firestore()
        .collection("users")
        .doc(testDev+testUser)
        .collection("activities")
        .where("sanitised.provider","==","garmin")
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
  it('Check that the deregistration webhook works', async () => {
    // get rid of the second to last user
    await admin.firestore()
      .collection("users")
      .doc(testDev+"secondTestUser")
      .delete();

    req = {
      debug: true,
      url: "https://us-central1-rovetest-beea7.cloudfunctions.net/garminDeregistrations",
      body: {"deregistrations": [{"userAccessToken": "test_access_token", "userId":"test_user_id"}]},
    };
    res = {

      sendStatus: (code) => {
        assert.equal(code, 200);
      },
      set: (accessControl, star)=>{
        assert.equal(accessControl, "Access-Control-Allow-Origin");
        assert.equal(star, "*");
      },
      set: (accessControl, star)=>{
        assert.equal(accessControl, "Access-Control-Allow-Origin");
        assert.equal(star, "*");
      }
    }

    // set up stubbed functions
    testResponse = {
      body: ()=>{
        return {"success":"Application has been revoked"};
      },
      statusCode: 204,
    }

   const stubbedGot = sinon.stub(got, "delete");
   stubbedGot.onFirstCall().returns(testResponse);
    
    await myFunctions.garminDeregistrations(req, res);
    // check the got function was called with the correct options
    // check the garmin fields were deleted from the database
    // check the garmin activities were deleted from the database only for this user
    const userDoc = await admin.firestore()
        .collection("users")
        .doc(testDev+testUser)
        .get();
      
    const activities = await admin.firestore()
        .collection("users")
        .doc(testDev+testUser)
        .collection("activities")
        .where("sanitised.provider","==","garmin")
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
});//End TEST 2