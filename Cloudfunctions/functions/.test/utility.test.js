
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
    apiKey: "AIzaSyCiMcMwrKgSKu6w5XW8hdCrWnLeI8CtGY4",
    authDomain: "rovetest-beea7.firebaseapp.com",
    databaseURL: "https://rovetest-beea7-default-rtdb.firebaseio.com",
    projectId: "rovetest-beea7",
    storageBucket: "rovetest-beea7.appspot.com",
    messagingSenderId: "1020717595214",
    appId: "1:1020717595214:web:3767a026d5bc2101b7211f",
    measurementId: "G-C9DDQXGVGD"
  };
  const test = require('firebase-functions-test')(firebaseConfig, '.test/keys/rovetest-beea7-firebase-adminsdk-key.json');


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
        beforeEach( () => {
            // stub out the got functions.
            const getExampleResponse = {
                body: JSON.stringify({
                    "data": {
                        "id": "abdf33",
                        "events": "EXERCISE, SLEEP",
                        "url": "https://myapp.example.com/acl_webhook"
                    }
                }),
                statusCode: 200

            };
            const deleteExampleResponse = {
                body: JSON.stringify({
                    "timestamp": "2019-08-24T14:15:22Z",
                    "status": 0,
                    "errorType": "string",
                    "message": "string",
                    "corrId": "string"
                }),
                statusCode: 204,
            };
            const postExampleResponse = {
                body: JSON.stringify({
                "data": {
                    "id": "abdf33",
                    "events": "EXERCISE, SLEEP",
                    "url": "https://myapp.example.com/acl_webhook",
                    "signature_secret_key": "abe1f3ae-fd33-11e8-8eb2-f2801f1b9fd1"
                    },                  
                }),
                statusCode: 201,
            };
        
 
            const stubbedGet = sinon.stub(got, "get");
            const stubbedDelete = sinon.stub(got, "delete");
            const stubbedPost = sinon.stub(got, "post");
            stubbedGet.returns(getExampleResponse);
            stubbedDelete.returns(deleteExampleResponse);
            stubbedPost.returns(postExampleResponse);
        });
        afterEach( () => {
            // restore the got functions
            sinon.restore();
        });

        it('should register up polar webhook correctly...', async () => {
            // set the request object with the incorrect provider, correct developerId, devKey and userId
            const req = {url: 'https//test.com/?devId='+testDev+"&action=register"};
            // set the assertions for the expected response object
            const res = {
                send: (url) => {
                    assert.equal(url, 'webhook created successfully{"data":{"id":"abdf33","events":"EXERCISE, SLEEP","url":"https://myapp.example.com/acl_webhook","signature_secret_key":"abe1f3ae-fd33-11e8-8eb2-f2801f1b9fd1"}}');
                }
            };

            await myFunctions.polarWebhookSetup(req, res);

        });
        it('should delete a polar webhook correctly...', async () => {
            // set the request object with the incorrect provider, correct developerId, devKey and userId
            const req = {url: 'https//test.com/?devId='+testDev+"&action=delete&webhookId=abdf33"};
            // set the assertions for the expected response object
            const res = {
                send: (url) => {
                    assert.equal(url, "webhook deleted successfully");
                }
            };
            
            await myFunctions.polarWebhookSetup(req, res);

        });
        it('should get up polar webhook correctly...', async () => {
            // set the request object with the incorrect provider, correct developerId, devKey and userId
            const req = {url: 'https//test.com/?devId='+testDev+"&action=get"};
            // set the assertions for the expected response object
            const res = {
                send: (url) => {
                    assert.equal(url, 'webhook: {"data":{"id":"abdf33","events":"EXERCISE, SLEEP","url":"https://myapp.example.com/acl_webhook"}}');
                }
            };
            
            await myFunctions.polarWebhookSetup(req, res);

        });

    }); // End TEST 1------ test connectService() ------------

});