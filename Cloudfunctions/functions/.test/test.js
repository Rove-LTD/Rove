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
const testParameters = require('./testParameters.json');
const firebaseConfig = testParameters.firebaseConfig;
const testUser = testParameters.testUser
const testDev = testParameters.testDev
const testNotionUser = testParameters.testNotionUser
const testNotionDev = testParameters.testNotionDev
const devTestData = testParameters.devTestData
const devUserData = testParameters.devUserData
const devTestNotionData = testParameters.devTestNotionData
const devUserNotionData = testParameters.devUserNotionData
const test = require('firebase-functions-test')(firebaseConfig, testParameters.testKeyFile);
const admin = require("firebase-admin");
const WahooService = require('../.utilities/wahooService');
// -----------END INITIALISE ROVE TEST PARAMETERS----------------------------//

describe('ROVE full integration test scripts', () => {

    before(async() => {
        //set up the database
        //insert the developer ID and data
        //this clears down any existing developer data
        await admin.firestore()
            .collection("developers")
            .doc(testDev)
            .set(devTestData);

            await admin.firestore()
            .collection("developers")
            .doc(testNotionDev)
            .set(devTestNotionData);
        
        await admin.firestore()
            .collection("users")
            .doc(testDev+testUser)
            .set(devUserData);
    
        await admin.firestore()
            .collection("users")
            .doc(testNotionDev+testNotionUser)
            .set(devUserNotionData);
                
    }); //end before

    after(() => {
        // Do cleanup tasks and
        // restore any stubbed functions
        sinon.restore();
        test.cleanup();
    }); //end after

    afterEach(() => {
      sinon.restore();
    })

    require ('./test-modules/connectService.test.js');
    require ('./test-modules/stravaCallback.test.js');
    require ('./test-modules/polarCallback.test.js');
    require ('./test-modules/wahooCallback.test.js');
    require ('./test-modules/garminCallback.test.js');
    require ('./test-modules/webhooks.test.js');
    require ('./test-modules/webhooks-Wahoo.test.js');
    //require ('./test-modules/webhooks-Strava.test.js');
    //require ('./test-modules/webhooks-Garmin.test.js');
    //require ('./test-modules/webhooks-Polar.test.js');
    require ('./test-modules/utility.test.js');
    require ('./test-modules/disconnectServiceFailure.test.js');
    require ('./test-modules/wahooDisconnect.test.js');
    require ('./test-modules/stravaDisconnect.test.js');
    require ('./test-modules/polarDisconnect.test.js');
    require ('./test-modules/garminDisconnect.test.js');
    require ('./test-modules/notion.test.js');
    //require ('./test-modules/getActivityList.test.js');
});
