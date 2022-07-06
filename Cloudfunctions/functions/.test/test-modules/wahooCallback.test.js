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
describe("Testing that the Wahoo callbacks work: ", () => {
  before(async () => {
    // reset the user doc before testing polar
    await admin.firestore()
      .collection("users")
      .doc(testUser)
      .set(devUserData);
  });
  it('wahoo callback should check userId and DevId and write the access tokens to the database...', async () => {
      //set up the stubbed response to mimic wahoo's response when
      //called with the code to get the token
      const responseObject1 = {
          json() { return {
              access_token: 'test-wahoo-access-token',
              refresh_token: 'test-wahoo-refresh-token',
              expires_in: 7200,  
              created_at: 1656940968,  
          }
        }
      }
      const responseObject2 = {
          json() { return  {
              "id": 60462,
              "height": "2.0",
              "weight": "80.0",
              "first": "Bob",
              "last": "Smith",
              "email": "sample@test-domain.com",
              "birth": "1980-10-02",
              "gender": 1,
              "created_at": "2018-10-23T15:38:23.000Z",
              "updated_at": "2018-10-24T20:46:40.000Z"
            }
        }
      }
      const expectedTestUserDoc = {
          devId: devUserData.devId,
          email: devUserData.email,
          wahoo_access_token: 'test-wahoo-access-token',
          wahoo_refresh_token: 'test-wahoo-refresh-token',
          wahoo_token_expires_in: 7200,
          wahoo_token_expires_at: 1656948168,
          wahoo_created_at: 1656940968,
          wahoo_user_id: 60462,
          wahoo_connected: true,
      }

      const stubbedpost = sinon.stub(got, "post");
      const stubbedget = sinon.stub(got, "get");
      stubbedpost.onFirstCall().returns(responseObject1);
      stubbedget.onFirstCall().returns(responseObject2);

      // set the request object with the correct provider, developerId and userId
      const req = {url: "https://us-central1-rove-26.cloudfunctions.net/wahooCallback?state="+testUser+":"+testDev+"&code=testcode",
      debug: true
      };
      const res = {
          send: (text) => {
              assert.equal(text, "your authorization was successful please close this window")
          },
          redirect: (url) => {
            assert.equal(url, "https://paulsTest.com/callbackURL");
          },
      }
      await myFunctions.wahooCallback(req, res);

      //now check the database was updated correctly
      testUserDoc = await admin.firestore()
      .collection("users")
      .doc(testUser)
      .get();
      // check called with the right arguments
      accessCodeOptions =  {
          url: 'https://api.wahooligan.com/oauth/token?code=testcode&client_id=iA2JRS_dBkikcb0uEnHPtb6IDt1vDYNbityEEhp801I&client_secret=w4FvDllcO0zYrnV1-VKR-T2gJ4mYUOiFJuwx-8C-C2I&grant_type=authorization_code&redirect_uri=https://us-central1-rove-26.cloudfunctions.net/wahooCallback?state='+testUser+':'+testDev,
          method: 'POST',
          headers: {
            "Content-Type": 'application/json',
            "Accept": 'application/json;charset=UTF-8'
          }
        }

      assert.deepEqual(testUserDoc.data(), expectedTestUserDoc);
      assert(stubbedpost.calledWith(accessCodeOptions), "the call to wahoo had the wrong arguments");
      sinon.restore();

  })
});//End TEST 2--- Test Callbacks for Strava--------------
