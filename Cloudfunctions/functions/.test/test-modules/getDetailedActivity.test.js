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
const fs = require("fs");
const wahooActivity = require("./wahooDetailed.json")

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
            "strava_id": 7995810,
            "polar_access_token" : "d717dd39d09b91939f835d66a640927d",
            "polar_connected": true,
            "polar_token_expires_at": 2120725270,
            "polar_token_expires_in": 461375999,
            "polar_token_type": "bearer",
            "polar_user_id": 45395466,
        });
    await admin.firestore()
        .collection("users")
        .doc(testDev+testUser)
        .collection("activities")
        .doc("stravaActivity")
        .set({
            "sanitised": {"provider": "strava"},
            "raw": {"id": 7530448332}
        });
    await admin.firestore()
        .collection("users")
        .doc(testDev+testUser)
        .collection("activities")
        .doc("polarActivity")
        .set({
            "sanitised": {"provider": "polar"},
            "raw": {"start_time": "2022-08-10T11:18:42"}
        });
    await admin.firestore()
        .collection("users")
        .doc(testDev+testUser)
        .collection("activities")
        .doc("wahooActivity")
        .set({
            "sanitised": {
                "id": "wahooActivityId",
                "provider": "wahoo"
            },
            "raw": {"file": {"url": "https://cdn.wahooligan.com/wahoo-cloud/production/uploads/workout_file/file/0KNBLnbwOndDYh5MhonDZw/2022-07-07-071356-ELEMNT_AE48-282-0.fit"}}
        });
    });
    it("Check Get Detailed Strava Activity Works.", async () => {
        req = {
            debug: true,
            url: "https://ourDomain.com",
            method: "POST",
            query:{},
            body:{"devId": testDev, "devKey": "test-key", "userId": testDev+testUser, "activityId": "stravaActivity"},
        }
        res = {
            status: (code) => {
                assert.equal(code, 200);
            },
            send: (message) => {
                assert.equal(message,"Complete")
            }
        }

        await myFunctions.getDetailedActivity(req, res);
    })
    it("Check Get Wahoo Detailed Activity Works.", async () => {
        req = {
            debug: true,
            url: "https://ourDomain.com",
            method: "POST",
            query:{},
            body:{"devId": testDev, "devKey": "test-key", "userId": testDev+testUser, "activityId": "wahooActivity"},
        }
        res = {
            status: (code) => {
                assert.equal(code, 200);
            },
            send: (message) => {
                assert.equal(message, "Complete")
            }
        }

        const sanitisedActivityJson = JSON.stringify(await myFunctions.getDetailedActivity(req, res));
        const expectedResult = JSON.stringify(wahooActivity)
        assert.deepEqual(sanitisedActivityJson, expectedResult);
        
    })
    it.skip("Check Get Polar Detailed Activity Works.", async () => {
        req = {
            debug: true,
            url: "https://ourDomain.com",
            method: "POST",
            query:{},
            body:{"devId": testDev, "devKey": "test-key", "userId": testDev+testUser, "activityId": "polarActivity"},
        }
        res = {
            status: (code) => {
                assert.equal(code, 200);
            },
            send: (message) => {
                assert.equal(message, 'complete')
            }
        }

        const activity = await myFunctions.getDetailedActivity(req, res);
        console.log(activity);
    })
})