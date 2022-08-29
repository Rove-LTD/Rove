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
const getHistoryInBox = require('../../getHistoryInBox');
//-------------TEST --- Test Callbacks from Garmin-------
describe("Testing that the Coros callbacks work: ", () => {
  before(async () => {
    // reset the user doc before testing polar
    await admin.firestore()
      .collection("users")
      .doc(testDev+testUser)
      .set(devUserData);

    await admin.firestore()
    .collection("transactions")
    .doc("corosTestTransaction")
    .set({
      "provider": "coros",
      "userId": testUser,
      "devId": testDev,
      "redirectUrl": "https://bbc.co.uk",
    });
  });
  it('Coros callback should request and store tokens for connected user...', async () => {
      //set up the stubbed response to mimic Coros' response when called with the
      //code to get the token
      /* {
    "access_token": "rg2-6ee918c0c7d3347aeaa1eae04a78d926",
    "refresh_token": "rg2-b725c123e2494d58e8576642fdef6833",
    "openId": "4211cf484d264f75935047b0d709d76c",
    "expires_in": 2592000
      } */
      const responseObject1 = {
          statusCode: 200,
          headers: {
            'content-type': 'application/json'
          },
          body: JSON.stringify({
            "access_token": "rg2-6ee918c0c7d3347aeaa1eae04a78d926",
            "refresh_token": "rg2-b725c123e2494d58e8576642fdef6833",
            "openId": "4211cf484d264f75935047b0d709d76c",
            "expires_in": 2592000
            }),
      };
      const testDate = Date.now();
      const expectedTestUserDoc = {
          devId: testDev,
          userId: testUser,
          email: devUserData.email,
          "coros_access_token": "rg2-6ee918c0c7d3347aeaa1eae04a78d926",
          "coros_client_id": "e8925760066a490b9d26187f731020f8",
          "coros_id": "4211cf484d264f75935047b0d709d76c",
          "coros_refresh_token": "rg2-b725c123e2494d58e8576642fdef6833",
          "coros_token_expires_in": 2592000,
          "coros_token_expires_at": testDate/1000 + 2592000,
          "coros_connected": true,
      }

      const stubbedcall = sinon.stub(got, "post");
      //const stubbedgetHistory = sinon.stub(getHistoryInBox, "push");
      stubbedcall.onFirstCall().returns(responseObject1);

      // set the request object with the correct provider, developerId and userId
      const req = {url: 'https://us-central1-rove-26.cloudfunctions.net/corosCallback?code=rg2-106ffa603f751dc87dfdae8e1f7de41d&state=corosTestTransaction',
          debug: true
      };

      const res = {
          send: (text) => {},
          status: (code) => {assert.equal(code, 200)},
          redirect: (url) => {
            assert.equal(url, "https://bbc.co.uk?userId="+testUser+"&provider=coros");
          },
      }
      await myFunctions.corosCallback(req, res);
      //check the getHistoryInBox was called with the correct parameters
      //assert(stubbedgetHistory
      //  .calledOnceWithExactly("coros", testDev+testUser));
      const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
      await wait(1000);

      //now check the database was updated correctly
      testUserDoc = await admin.firestore()
      .collection("users")
      .doc(testDev+testUser)
      .get();
      expectedTestUserDoc.coros_token_expires_at = testUserDoc.data()["coros_token_expires_at"];
      // cant check called with the right arguments as signiture is always different

      assert.deepEqual(testUserDoc.data(), expectedTestUserDoc);
      sinon.restore();

  })
});