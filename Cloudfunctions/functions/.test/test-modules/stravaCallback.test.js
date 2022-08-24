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
const request = require('request');
const strava = require("strava-v3");
const getHistoryInBox = require('../../getHistoryInBox');
//-------------TEST 2--- Test Callbacks from Strava-------
 describe("Testing that the strava callbacks work: ", () => {
  before(async ()=>{
    await admin.firestore()
        .collection("transactions")
        .doc("stravaTestTransaction")
        .set({
          "provider": "strava",
          "userId": testUser,
          "devId": testDev,
          "redirectUrl": null,
        });
  })
  it('strava callback should check userId and DevId and write the access tokens to the database...', async () => {
      //set up the stubbed response to mimic strava's response when called with the
      //code to get the token
      const responseObject = {
          statusCode: 200,
          headers: {
            'content-type': 'application/json'
          }
        };
        const responseBody = {
          access_token: 'test-long-access-token',
          refresh_token: 'test-refresh_token',
          expires_at: 1654014114,
          expires_in: 21600,
        };
      
      const expectedTestUserDoc = {
          devId: testDev,
          userId: testUser,
          email: devUserData.email,
          strava_id: 12345678,
          strava_access_token: 'test-long-access-token',
          strava_refresh_token: 'test-refresh_token',
          strava_token_expires_at: 1654014114,
          strava_token_expires_in: 21600,
          strava_connected: true,
      }
      const stubbedcall = sinon.stub(request, "post");
     // const stubbedgetHistory = sinon.stub(getHistoryInBox, "push");
      stubbedcall.yields(null, responseObject, JSON.stringify(responseBody));
      sinon.stub(strava.athlete, "get").returns({id: 12345678});

      // set the request object with the correct provider, developerId and userId
      const req = {url: "https://us-central1-rovetest-beea7.cloudfunctions.net/stravaCallback?transactionId=stravaTestTransaction&code=testcode&approval_prompt=force&scope=profile:read_all,activity:read_all"};
      const res = {
          send: (text) => {
              assert.equal(text, "your authorization was successful please close this window")
          },
          redirect: (url) => {
            assert.equal(url, "https://paulsTest.com/callbackURL?userId="+testUser+"&provider=strava");
          },
      }
      await myFunctions.stravaCallback(req, res);
      //check the getHistoryInBox was called with the correct parameters
      //assert(stubbedgetHistory
      //  .calledOnceWithExactly("strava", testDev+testUser));
      //now check the database was updated correctly
      testUserDoc = await admin.firestore()
      .collection("users")
      .doc(testDev+testUser)
      .get();

      assert.deepEqual(testUserDoc.data(), expectedTestUserDoc);

      await sinon.restore();

  })
});//End TEST 2--- Test Callbacks for Strava--------------
