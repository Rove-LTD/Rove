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
describe("Testing that the Garmin callbacks work: ", () => {
  before(async () => {
    // reset the user doc before testing polar
    await admin.firestore()
      .collection("users")
      .doc(testDev+testUser)
      .set(devUserData);

    await admin.firestore()
    .collection("transactions")
    .doc("garminTestTransaction")
    .set({
      "provider": "garmin",
      "userId": testUser,
      "devId": testDev,
      "redirectUrl": "https://redirectedURI?state=withMyState",
    });
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
          body: '{"userId": "test-garmin-user-id"}',
      };

      const expectedTestUserDoc = {
          devId: testDev,
          userId: testUser,
          email: devUserData.email,
          garmin_access_token: "garmin-access-token",
          garmin_client_id: "d3dd1cc9-06b2-4b3e-9eb4-8a40cbd8e53f",
          garmin_access_token_secret: "garmin-test-secret",
          garmin_user_id: "test-garmin-user-id",
          garmin_connected: true,
      }

      const stubbedPostcall = sinon.stub(got, "post");
      //const stubbedgetHistory = sinon.stub(getHistoryInBox, "push");
      stubbedPostcall.onFirstCall().returns(responseObject1);
      const stubbedGetCall = sinon.stub(got, "get").returns(responseObject2);

      // set the request object with the correct provider, developerId and userId
      const req = {url: "https://us-central1-rovetest-beea7.cloudfunctions.net/oauthCallbackHandlerGarmin?oauth_token_secret=testcode-transactionId=garminTestTransaction&oauth_verifier=test-verifyer&oauth_token=test-token",
          debug: true
      };

      const res = {
          send: (text) => {
              assert.equal(text, "THANKS, YOU CAN NOW CLOSE THIS WINDOW")
          },
          redirect: (url) => {
            assert.equal(url, "https://redirectedURI?state=withMyState&userId="+testUser+"&provider=garmin");
          },
      }
      await myFunctions.oauthCallbackHandlerGarmin(req, res);
      //check the getHistoryInBox was called with the correct parameters
      //assert(stubbedgetHistory
      //  .calledOnceWithExactly("garmin", testDev+testUser));
      // check the got.post used the right parameters
      const postArgs = stubbedPostcall.getCall(0).args;

      assert.include(postArgs[0], "https://connectapi.garmin.com/oauth-service/oauth/access_token?oauth_consumer_key=d3dd1cc9-06b2-4b3e-9eb4-8a40cbd8e53f&oauth_nonce=");
      assert.include(postArgs[0], "&oauth_signature_method=HMAC-SHA1&oauth_timestamp=");
      assert.include(postArgs[0], "&oauth_signature=");
      assert.include(postArgs[0], "&oauth_verifier=test-verifyer&oauth_token=test-token&oauth_version=1.0");
      const getArgs = stubbedGetCall.getCall(0).args;

      assert.equal(getArgs[0].url,"https://apis.garmin.com/wellness-api/rest/user/id");
      assert.equal(getArgs[0].method,"GET");
      assert.include(getArgs[0].headers.Authorization, "OAuth oauth_consumer_key=\"d3dd1cc9-06b2-4b3e-9eb4-8a40cbd8e53f\",oauth_nonce=");
      assert.include(getArgs[0].headers.Authorization, ",oauth_signature=");
      assert.include(getArgs[0].headers.Authorization, "oauth_signature_method=\"HMAC-SHA1\",oauth_timestamp=\"");
      assert.include(getArgs[0].headers.Authorization, "oauth_token=\"garmin-access-token\",oauth_version=\"1.0\"");

      //now check the database was updated correctly
      testUserDoc = await admin.firestore()
      .collection("users")
      .doc(testDev+testUser)
      .get();


      //now check the database was updated correctly
      testUserDoc = await admin.firestore()
      .collection("users")
      .doc(testDev+testUser)
      .get();
      // cant check called with the right arguments as signiture is always different

      assert.deepEqual(testUserDoc.data(), expectedTestUserDoc);
      sinon.restore();

  })
});