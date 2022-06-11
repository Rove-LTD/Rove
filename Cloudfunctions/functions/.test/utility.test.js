
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
const test = require('firebase-functions-test')(firebaseConfig, '.test/keys/rove-26-firebase-adminsdk-key.json');


const admin = require("firebase-admin");
const request = require('request');
const got = require('got');
const strava = require("strava-v3");

//------------------------Set Up of Test Data Project Complete ---------------//

describe('ROVE Functions - Integration Tests', () => {
    let myFunctions;
    let testUser = "paulsTestDevUser";
    let testDev = "paulsTestDev";
    let devTestData = {email: "paul.testDev@gmail.com", devKey: "test-key"};
    let devUserData = {devId: testDev, email: "paul.userTest@gmail.com"};
    let recievedGarminUrl = "";
    let recievedStravaUrl = "";
    let recievedPolarUrl = "";

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
            .set(devTestData);
                
    }); //end before

    after(async () => {
        // Do cleanup tasks.
        // TODO: PV delete the test developer data
        sinon.restore();
        test.cleanup();
    }); //end after

//-------TEST 1------ test connectService() ------------
    describe("Testing that the developer can set up polar webhook", () => {
        it('should get error if the provider is not correct...', async () => {
            // set the request object with the incorrect provider, correct developerId, devKey and userId
            const req = {url: 'https//test.com/?devId='+testDev+"&action=register"};
            // set the assertions for the expected response object
            const res = {
                send: (url) => {
                    assert.equal(url, "error: the provider was badly formatted, missing or not supported");
                }
            }
            function stubbedGot (url) {
                return "test";
            }
            
            stubbedGot = sinon.stub(got);

            await myFunctions.polarWebhookSetup(req, res);

        });

    }); // End TEST 1------ test connectService() ------------

});