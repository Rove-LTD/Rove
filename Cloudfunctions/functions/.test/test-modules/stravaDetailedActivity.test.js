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
describe("Check the get detailed activity service works: ", () => {
    before(async() => {
    nowInSeconds = new Date()/1000
    notExpiredDate = nowInSeconds+1000;
    await admin.firestore()
        .collection("users")
        .doc(testDev+testUser)
        .set({
            "devId": testDev,
            "userId": testUser,
            "email": "will.userTest@gmail.com",
            "strava_connected": true,
            "strava_access_token": "3f1f6d3da1057cf458ffffde0ee70eccb610c468",
            "strava_refresh_token": "922dd204d91e03515b003fe8f5516d99563d9f0c",
            "strava_token_expires_at": nowInSeconds,
            "strava_id": 7995810});
    await admin.firestore()
        .collection("users")
        .doc(testDev+testUser)
        .collection("activities")
        .doc("activity")
        .set({
            sanitised: {data_source: "strava"},
            raw: {id: 7530448332}
        });
    });
    it.only("Check Get Detailed Activity Works.", async () => {
        req = {
            debug: true,
            url: "https://ourDomain.com",
            method: "POST",
            query:{},
            body:{"devId": testDev, "devKey": "test-key", "userId": testDev+testUser, "activityId": "activity"},
        }
        res = {
            status: (code) => {
                assert.equal(code, 200);
            },
            send: (message) => {
                assert.equal(message,)
            }
        }

        await myFunctions.getDetailedActivity(req, res);
        
    })
})