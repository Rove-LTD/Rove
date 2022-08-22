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
describe("Check the coros Disconnect Service works: ", () => {
  const now = Date.now()/1000;
  const tokenFutureExpiryDate = now+1000;
  const tokenPastExpiryDate = now-1000;
  // possible issues with Wahoo tests,
   // the two docs interfere with token testing if it's in the past.
   // the before block on the later testing doesn't work before the tests.
  beforeEach(async () => {
    await admin.firestore()
        .collection("users")
        .doc(testDev+testUser)
        .set({
            "devId": testDev,
            "userId": testUser,
            "email": "paul.userTest@gmail.com",
            "coros_connected": true,
            "coros_access_token": "rg2-6ee918c0c7d3347aeaa1eae04a78d926",
            "coros_refresh_token": "rg2-b725c123e2494d58e8576642fdef6833",
            "coros_token_expires_at": tokenFutureExpiryDate,
            "coros_token_expires_in": 7200,
            "coros_id": "4211cf484d264f75935047b0d709d76c"});

      await admin.firestore()
      .collection("users")
      .doc(testDev+"secondTestUser")
      .set({
          "devId": testDev,
          "userId": "secondTestUser",
          "email": "paul.userTest@gmail.com",
          "coros_connected": true,
          "coros_access_token": "rg2-6ee918c0c7d3347aeaa1eae04a78d926",
          "coros_refresh_token": "rg2-b725c123e2494d58e8576642fdef6833",
          "coros_token_expires_at": tokenFutureExpiryDate,
          "coros_token_expires_in": 7200,
          "coros_id": "4211cf484d264f75935047b0d709d76c"});

    await admin.firestore()
        .collection("users")
        .doc(testDev+testUser)
        .collection("activities")
        .doc()
        .set({raw: {field1: "somedata"},
            sanitised: {provider: "coros"}});

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
      url: "https://us-central1-rovetest-beea7.cloudfunctions.net/disconnectService?devId="+testDev+"&userId="+testUser+"&provider=coros&devKey=test-key",
    };
    res = {
      status: (code) => {
        assert.equal(code, 400);
      },
      send: (message) => {
        assert.equal(message, "error: the userId was not authorised for this provider");
      }
    }

    // set up stubbed functions
    testResponse = {
      json: ()=>{
        return 1005;
      }
    }

   const stubbedGot = sinon.stub(got, "post");
   stubbedGot.onFirstCall().returns(testResponse);
    
    await myFunctions.disconnectService(req, res);
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
        .where("sanitised.provider","==","coros")
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
  it('Check that service returns with error if coros reports and error', async () => {
    // for this the second test user should not exist data needs to be 

    await admin.firestore()
    .collection("users")
    .doc(testDev+"secondTestUser")
    .delete();

    req = {
      url: "https://us-central1-rovetest-beea7.cloudfunctions.net/disconnectService?devId="+testDev+"&userId="+testUser+"&provider=coros&devKey=test-key",
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
        return "1005";
      }
    }

   const stubbedGot = sinon.stub(got, "post");
   stubbedGot.onFirstCall().returns(testResponse);
    
    await myFunctions.disconnectService(req, res);
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
        .where("sanitised.provider","==","coros")
        .get();
    
    const expectedUserResults = {
      "devId": testDev,
      "userId": testUser,
      "email": "paul.userTest@gmail.com",
      "coros_connected": true,
      "coros_access_token": "rg2-6ee918c0c7d3347aeaa1eae04a78d926",
      "coros_refresh_token": "rg2-b725c123e2494d58e8576642fdef6833",
      "coros_token_expires_at": tokenFutureExpiryDate,
      "coros_token_expires_in": 7200,
      "coros_id": "4211cf484d264f75935047b0d709d76c"
    };
    
    assert.deepEqual(userDoc.data(), expectedUserResults);
    assert.isAbove(activities.docs.length, 0);

    sinon.restore();
  });
  it('Check that service succeeds if user authorised already', async () => {
    req = {
      url: "https://us-central1-rovetest-beea7.cloudfunctions.net/disconnectService?devId="+testDev+"&userId="+testUser+"&provider=coros&devKey=test-key",
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
      json: ()=>{
        return {"result": "0000","message": "OK"};
      }
    }

   const stubbedGot = sinon.stub(got, "post");
   stubbedGot.onFirstCall().returns(testResponse);
    
    await myFunctions.disconnectService(req, res);
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
        .where("sanitised.provider","==","coros")
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
    it('Check that service succeeds if user authorised already and refresh code needed', async () => {

      await admin.firestore()
      .collection("users")
      .doc(testDev+"secondTestUser")
      .delete();

      await admin.firestore()
      .collection("users")
      .doc(testDev+testUser)
      .set({
          "coros_token_expires_at": tokenPastExpiryDate},
          {merge: true});

      req = {
        url: "https://ourDomain.com?devId="+testDev+"&userId="+testUser+"&provider=coros&devKey=test-key",
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
      testResponseDelete = {
        json: ()=>{
          return {"result": "0000","message": "OK"};
        }
      }
      testResponsePost = {
        json() { return {
          "expires_in":2592000,
          "refresh_token":"test-coros-refresh",
          "access_token":"test-coros-access",
          "openId":"test-coros-id"
      }
      }
      }

      const stubbedPost = sinon.stub(got, "post");
      stubbedPost.onFirstCall().returns(testResponsePost);
      stubbedPost.onSecondCall().returns(testResponseDelete);
      
      await myFunctions.disconnectService(req, res);

      const userDoc = await admin.firestore()
          .collection("users")
          .doc(testDev+testUser)
          .get();
        
      const activities = await admin.firestore()
          .collection("users")
          .doc(testDev+testUser)
          .collection("activities")
          .where("sanitised.provider","==","coros")
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
});//End TEST 2