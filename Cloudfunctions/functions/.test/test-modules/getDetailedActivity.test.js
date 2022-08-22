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
const garminActivity = require("./garminDetailed.json")
const db = admin.firestore();

myFunctions = require('../../index.js');
// -----------END INITIALISE ROVE TEST PARAMETERS----------------------------//

// ---------REQUIRE FUNCTONS TO BE STUBBED----------------------//
// include the functions that we are going to be stub in the
// testing processes - these have to have the same constant
// name as in the function we are testing
const got = require('got');
const { default: strava } = require('strava-v3');
const { deleteBlock } = require('@notionhq/client/build/src/api-endpoints');
let userDoc;
let stravaDoc;
let garminDoc;
let polarDoc;
let wahooDoc;
describe("Check the get detailed activity service works: ", () => {
    before(async() => {
    nowInSeconds = new Date()/1000
    notExpiredDate = nowInSeconds+1000;
    userDoc = {
            "devId": testDev,
            "userId": testUser,
            "email": "will.userTest@gmail.com",
            "garmin_access_token": "32ada6ab-e5fe-46a7-bd82-5bad6158d6eb",
            "garmin_access_token_secret": "boxYMolukwHGCyk9kTBIBCmvL8Wm3y2rFq4",
            "garmin_user_id": "eb24e8e5-110d-4a87-b976-444f40ca27d4",
            "strava_connected": true,
            "strava_access_token": "6763bdab406b0d30a8a9f4694e7716e04e0ed20d",
            "strava_refresh_token": "922dd204d91e03515b003fe8f5516d99563d9f0c",
            "strava_token_expires_at": Date.now()/1000,
            "strava_id": 7995810,
            "polar_access_token" : "04c9315a4da52c91cc43aace5630e65b",
            "polar_connected": true,
            "polar_token_expires_at": 2120725270,
            "polar_token_expires_in": 461375999,
            "polar_token_type": "bearer",
            "polar_user_id": 26925145,
        };
    await db.collection("users").doc(testDev+testUser).set(userDoc);
    stravaDoc = {"id": 7530448332};
    polarDoc = {"id": "yNZpdMNq"};
    wahooDoc = {"file": {"url": "https://cdn.wahooligan.com/wahoo-cloud/production/uploads/workout_file/file/0KNBLnbwOndDYh5MhonDZw/2022-07-07-071356-ELEMNT_AE48-282-0.fit"}};
    garminDoc = {
                "activityId": 9377961249,
                "startTimeInSeconds": 1660111129,
                "durationInSeconds": 3923,
            };
    })
    it.only("Check Get Detailed Strava Activity Works.", async () => {
        sanitisedActivityJson = await myFunctions.getDetailedActivity(userDoc, stravaDoc, "strava");
        assert.deepEqual(sanitisedActivityJson, "shite")
    })
    it.only("Check Get Wahoo Detailed Activity Works.", async () => {
        const sanitisedActivityJson = await myFunctions.getDetailedActivity(userDoc, wahooDoc, "wahoo");
        // await fs.promises.writeFile('./wahooDetailed.json', JSON.stringify(sanitisedActivityJson));
        const expectedResult = wahooActivity;
        assert.deepEqual(sanitisedActivityJson, expectedResult);
    })
    it.only("Check Get Polar Detailed Activity Works.", async () => {
        const activity = await myFunctions.getDetailedActivity(userDoc, polarDoc, "polar");
        assert.deepEqual(activity, "shite")
    })
    it.only("Check Get Garmin detailed Activity Works.", async () => {
        const sanitisedActivityJson = await myFunctions.getDetailedActivity(userDoc, garminDoc, "garmin");
        // await fs.promises.writeFile('./garminDetailed.json', JSON.stringify(sanitisedActivityJson));
        const expectedResult = garminActivity
        assert.deepEqual(sanitisedActivityJson, expectedResult);
    })
})