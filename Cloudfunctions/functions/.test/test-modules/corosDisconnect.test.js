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
            "coros_client_id":  "e8925760066a490b9d26187f731020f8",
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
          "coros_client_id":  "e8925760066a490b9d26187f731020f8",
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
    assert(stubbedGot.notCalled);
    // check the coros fields were deleted from the database
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
    assert(stubbedGot.calledOnce);
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
      "coros_client_id":  "e8925760066a490b9d26187f731020f8",
      "coros_refresh_token": "rg2-b725c123e2494d58e8576642fdef6833",
      "coros_token_expires_at": tokenFutureExpiryDate,
      "coros_token_expires_in": 7200,
      "coros_id": "4211cf484d264f75935047b0d709d76c"
    };
    
    assert.deepEqual(userDoc.data(), expectedUserResults);
    assert.isAbove(activities.docs.length, 0);

    sinon.restore();
  });
  it('Check that service succeeds if user authorised already and not the last user authorised', async () => {
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
    assert(stubbedGot.notCalled, "user deauthorisation was called and shouldnt have been");
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
  it('Check that service succeeds if user authorised already and the last user authorized', async () => {
    // set the second user to a different client ID 
    // second user so there is only one left with the original clientID
    await admin.firestore()
    .collection("users")
    .doc(testDev+"secondTestUser")
    .set({
        "coros_client_id":  "different client Id",
    }, {"merge": true});

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
    options = {
      url: "https://open.coros.com/oauth2/deauthorize?token=" + "rg2-6ee918c0c7d3347aeaa1eae04a78d926",
      method: "POST",
    }
    args = stubbedGot.getCall(0).args;
    assert.deepEqual(args[0], options, "arguments on the deauthorize call incorrect");

    // check the wahoo fields were deleted from the database
    // check the wahoo activities were deleted from the database only for this user
    const userDoc1 = await admin.firestore()
        .collection("users")
        .doc(testDev+testUser)
        .get();
      
        const userDoc2 = await admin.firestore()
        .collection("users")
        .doc(testDev+"secondTestUser")
        .get();

    const activities = await admin.firestore()
        .collection("users")
        .doc(testDev+testUser)
        .collection("activities")
        .where("sanitised.provider","==","coros")
        .get();
    
    const expectedUserResults1 = {
      "devId": testDev,
      "userId": testUser,
      "email": "paul.userTest@gmail.com",
    };
    const expectedUserResults2 = {
      "devId": testDev,
      "userId": "secondTestUser",
      "email": "paul.userTest@gmail.com",
      "coros_connected": true,
      "coros_access_token": "rg2-6ee918c0c7d3347aeaa1eae04a78d926",
      "coros_client_id":  "different client Id",
      "coros_refresh_token": "rg2-b725c123e2494d58e8576642fdef6833",
      "coros_token_expires_at": tokenFutureExpiryDate,
      "coros_token_expires_in": 7200,
      "coros_id": "4211cf484d264f75935047b0d709d76c"
    };
    assert.deepEqual(userDoc1.data(), expectedUserResults1);
    assert.deepEqual(userDoc2.data(), expectedUserResults2);
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
      // check the calls to got were called with the right
      // arguments
      expectedCallArgs = [[
        "https://open.coros.com/oauth2/refresh-token",
        {
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
          form: {
            client_id: "e8925760066a490b9d26187f731020f8",
            refresh_token: "rg2-b725c123e2494d58e8576642fdef6833",
            client_secret: "w4FvDllcO0zYrnV1-VKR-T2gJ4mYUOiFJuwx-8C-C2I",
            grant_type: "refresh_token",
          },
        }],
        [{
          url: "https://open.coros.com/oauth2/deauthorize?token=test-coros-access",
          method: "POST",
        }]];
      const calls = stubbedPost.getCalls();
      assert.deepEqual(calls[0].args, expectedCallArgs[0], "arguments on the refresh call incorrect");
      assert.deepEqual(calls[1].args, expectedCallArgs[1], "arguments on the deauthorize call incorrect");
  
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