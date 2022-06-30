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
//-------------TEST --- Test Callbacks from Garmin-------
describe("Testing that the Garmin callbacks work: ", () => {
  before(async () => {
    // reset the user doc before testing polar
    await admin.firestore()
      .collection("users")
      .doc(testUser)
      .set(devUserData);
  });
  it('Garmin callback should check userId and DevId and write the access tokens to the database...', async () => {
      //set up the stubbed response to mimic polar's response when called with the
      //code to get the token
      const responseObject1 = {
          statusCode: 200,
          headers: {
            'content-type': 'application/json'
          },
          body: "token=garmin-access-token&secret=garmin-test-secret",
          expires_in: 21600,
      };
      const responseObject2 = {
          statusCode: 200,
          body: {"userId": "d3315b1072421d0dd7c8f6b8e1de4df8"},
      };

      const expectedTestUserDoc = {
          devId: devUserData.devId,
          email: devUserData.email,
          garmin_access_token: "garmin-access-token",
          garmin_access_token_secret: "garmin-test-secret",
      }

      const stubbedcall = sinon.stub(got, "post");
      stubbedcall.onFirstCall().returns(responseObject1);
      //sinon.stub(got, "get").returns(responseObject2);

      // set the request object with the correct provider, developerId and userId
      const req = {url: "https://us-central1-rove-26.cloudfunctions.net/wahooCallback?oauth_token_secret=testcode-userId="+testUser+"-devId="+testDev+"&oauth_verifier=test-verifyer&oauth_token=test-token"};
      const res = {
          send: (text) => {
              assert.equal(text, "THANKS, YOU CAN NOW CLOSE THIS WINDOW")
          },
          redirect: (url) => {
            assert.equal(url, "https://paulsTest.com/callbackURL");
          },
      }
      await myFunctions.oauthCallbackHandlerGarmin(req, res);

      //now check the database was updated correctly
      testUserDoc = await admin.firestore()
      .collection("users")
      .doc(testUser)
      .get();
      // cant check called with the right arguments as signiture is always different

      assert.deepEqual(testUserDoc.data(), expectedTestUserDoc);
      sinon.restore();

  })
});