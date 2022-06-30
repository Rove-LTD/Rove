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
    //-------------TEST 2--- Test Callbacks for Polar-------
    describe("Testing the polar callback...", async () => {
      it('polar callback should report error if user already registered', async () => {
          //set up the stubbed response to mimic polar's response when called with the
          //code to get the token
          const responseObject1 = {
              statusCode: 200,
              headers: {
                'content-type': 'application/json'
              }
            };
          const responseBody1 = {
              access_token: 'test-polar-access-token',
              token_type: 'bearer',
              expires_in: 21600,
              x_user_id: '123456polar',
            };
          const responseObject2 = {
              statusCode: 409,
              headers: {
                'content-type': 'application/json'
              }
            };
          const responseBody2 = {};
          
          const expectedTestUserDoc = {
              devId: devUserData.devId,
              email: devUserData.email,
              strava_id: 12345678,
              polar_access_token: 'test-polar-access-token',
              polar_token_type: 'bearer',
              polar_token_expires_in: 21600,
              polar_connected: true,
              polar_user_id: '123456polar',
              strava_access_token: 'test-long-access-token',
              strava_refresh_token: 'test-refresh_token',
              strava_token_expires_at: 1654014114,
              strava_token_expires_in: 21600,
              strava_connected: true,
          }

          const clientIdClientSecret =
              "654623e7-7191-4cfe-aab5-0bc24785fdee"+
              ":"+
              "f797c0e1-a39d-4b48-a2d9-89c2baea9005";
          const buffer = new Buffer.from(clientIdClientSecret); // eslint-disable-line
          const base64String = buffer.toString("base64");
          const dataString = "code=testcode"+
          "&grant_type=authorization_code"+
          "&redirect_uri=https://us-central1-rove-26.cloudfunctions.net/polarCallback";
          options = {
              url: "https://polarremote.com/v2/oauth2/token",
              method: "POST",
              headers: {
                "Content-Type": "application/x-www-form-urlencoded",
                "Accept": "application/json;charset=UTF-8",
                "Authorization": "Basic "+base64String,
              },
              body: dataString,
            };

          const stubbedcall = sinon.stub(request, "post")
          stubbedcall.onFirstCall().yields(null, responseObject1, JSON.stringify(responseBody1));
          stubbedcall.onSecondCall().yields(null, responseObject2, JSON.stringify(responseBody2));

          // set the request object with the correct provider, developerId and userId
          const req = {url: "https://us-central1-rove-26.cloudfunctions.net/polarCallback?state="+testUser+":"+testDev+"&code=testcode"};
          const res = {
              send: (text) => {
                  assert.equal(text, "your authorization was successful please close this window: you are already registered with Polar - there is no need to re-register")
              },
              redirect: (url) => {
                assert.equal(url, "https://paulsTest.com/callbackURL");
              },
          }
          await myFunctions.polarCallback(req, res);

          //now check the database was updated correctly
          testUserDoc = await admin.firestore()
          .collection("users")
          .doc(testUser)
          .get();

          assert.deepEqual(testUserDoc.data(), expectedTestUserDoc);
          assert(stubbedcall.calledWith(options), "the call to polar had the wrong arguments");

          await sinon.restore();

      });
      it('polar callback should check userId and DevId and write the access tokens to the database...', async () => {
          //set up the stubbed response to mimic polar's response when called with the
          //code to get the token
          const responseObject1 = {
              statusCode: 200,
              headers: {
                'content-type': 'application/json'
              }
            };
          const responseBody1 = {
              access_token: 'test-polar-access-token',
              token_type: 'bearer',
              expires_in: 21600,
              x_user_id: '123456polar',
            };
          const responseObject2 = {
              statusCode: 200,
              headers: {
                'content-type': 'application/json'
              }
            };
          const responseBody2 = {
              "polar-user-id": "123456polar",
              "member-id": testUser,
              "registration-date": "2011-10-14T12:50:37.000Z",
              "first-name": "Eka",
              "last-name": "Toka",
              "birthdate": "1985-09-06",
              "gender": "MALE",
              "weight": 66,
              "height": 170,
              "extra-info": [
                {
                  "value": "2",
                  "index": 0,
                  "name": "number-of-children"
                }
              ]
            };
          
          const expectedTestUserDoc = {
              devId: devUserData.devId,
              email: devUserData.email,
              strava_id: 12345678,
              polar_access_token: 'test-polar-access-token',
              polar_token_type: 'bearer',
              polar_token_expires_in: 21600,
              polar_connected: true,
              polar_registration_date: "2011-10-14T12:50:37.000Z",
              polar_user_id: '123456polar',
              strava_access_token: 'test-long-access-token',
              strava_refresh_token: 'test-refresh_token',
              strava_token_expires_at: 1654014114,
              strava_token_expires_in: 21600,
              strava_connected: true,
          }

          const stubbedcall = sinon.stub(request, "post")
          stubbedcall.onFirstCall().yields(null, responseObject1, JSON.stringify(responseBody1));
          stubbedcall.onSecondCall().yields(null, responseObject2, JSON.stringify(responseBody2));

          // set the request object with the correct provider, developerId and userId
          const req = {url: "https://us-central1-rove-26.cloudfunctions.net/polarCallback?state="+testUser+":"+testDev+"&code=testcode"};
          const res = {
              send: (text) => {
                  assert.equal(text, "your authorization was successful please close this window: ")
              },
              redirect: (url) => {
                assert.equal(url, "https://paulsTest.com/callbackURL");
              },
          }
          await myFunctions.polarCallback(req, res);

          //now check the database was updated correctly
          testUserDoc = await admin.firestore()
          .collection("users")
          .doc(testUser)
          .get();

          assert.deepEqual(testUserDoc.data(), expectedTestUserDoc);

          await sinon.restore();

      })
  });// END TEST