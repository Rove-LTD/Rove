
// Follow the instructions in README.md for running these tests.
// Visit https://firebase.google.com/docs/functions/unit-testing to learn more
// about using the `firebase-functions-test` SDK.

// Chai is a commonly used library for creating unit test suites. It is easily extended with plugins.
const chai = require('chai');
const assert = chai.assert;

// Sinon is a library used for mocking or verifying function calls in JavaScript.
const sinon = require('sinon');
// Require and initialize firebase-functions-test in "online mode" with your project's
// credentials and service account key.
const firebaseConfig = {
    apiKey: "AIzaSyCVM54BYAKS9vXqRdK_a3yAt4By-CZByCA",
    authDomain: "rove-26.firebaseapp.com",
    projectId: "rove-26",
    storageBucket: "rove-26.appspot.com",
    messagingSenderId: "945964823577",
    appId: "1:945964823577:web:11b548bf6c322bf6d5a688",
    measurementId: "G-ESZ9SQS6ZX"
};
const test = require('firebase-functions-test')(firebaseConfig, 'test/keys/rove-26-firebase-adminsdk-key.json');


const admin = require("firebase-admin");
//------------------------Set Up of Test Data Project Complete ---------------//


describe('ROVE Functions - Integration Tests', () => {
    let myFunctions;
    let testUser = "paulsTestDev";
    let testDev = "paulsTestDevTestUser";
    let devTestData = {email: "paul.ventisei@gmail.com"}
  
    before(async() => {
        // Require index.js and save the exports inside a namespace called myFunctions.
        // This includes our cloud functions, which can now be accessed at eg. myFunctions.createPlan

        myFunctions = require('../index.js');
        testDeveloperData = {}; //PV TODO put in developer data here

        //set up the database
        //insert the developer ID and data
        await admin.firestore()
            .collection("developers")
            .doc(testDev)
            .set(testDeveloperData);
                
    }); //end before

    after(async () => {
        // Do cleanup tasks.
        // TODO: PV delete the test developer data
        test.cleanup();
    }); //end after

//-------TEST 1------ Create a new Test User ------------

    describe("Testing that the developer can call API to get a strava authentication redirection URL: ", () => {
        it('should get error if the provider is not correct...', async () => {
            // set the request object with the correct provider, developerId and userId
            const req = {url: 'https//test.com/?devId='+testDev+'&userId='+testUser+'&provider=badFormat'};
            // set the assertions for the expected response object
            const res = {
                send: (url) => {
                    assert.equal(url, "error: the provider was badly formatted, missing or not supported");
                }
            }

            await myFunctions.connectService(req, res);

        })
        it('should get a properly formatted strava redirect url...', async () => {
            // set the request object with the correct provider, developerId and userId
            const req = {url: 'https//test.com/?devId='+testDev+'&userId='+testUser+'&provider=strava'};
            // set the assertions for the expected response object
            const res = {
                send: (url) => {
                    assert.equal(url, "https://www.strava.com/oauth/authorize?client_id=72486&response_type=code&redirect_uri=https://us-central1-rove-26.cloudfunctions.net/stravaCallback?userId="+testUser+":"+testDev+"&approval_prompt=force&scope=profile:read_all,activity:read_all");
                }
            }

            await myFunctions.connectService(req, res);

        })
        it('should get a properly formatted garmin redirect url...', async () => {
            // set the request object with the correct provider, developerId and userId
            const req = {url: 'https//test.com/?devId='+testDev+'&userId='+testUser+'&provider=garmin'};
            // set the assertions for the expected response object
            const res = {
                send: (url) => {
                    assert.equal(url, "to work out the expected result");
                    console.log(url);
                }
            }

            await myFunctions.connectService(req, res);

        })

    }); //End Test 1
}); //end Integration TEST

