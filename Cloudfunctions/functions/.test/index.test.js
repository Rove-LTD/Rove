
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
const request = require('request');
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
        
        await admin.firestore()
            .collection("users")
            .doc(testUser)
            .set(devUserData);
                
    }); //end before

    after(async () => {
        // Do cleanup tasks.
        // TODO: PV delete the test developer data
        test.cleanup();
    }); //end after

//-------TEST 1------ test connectService() ------------

    describe("Testing that the developer can call API to connectService() and receive redirection URL: ", () => {
        it('should get error if the provider is not correct...', async () => {
            // set the request object with the incorrect provider, correct developerId, devKey and userId
            const req = {url: 'https//test.com/?devId='+testDev+'&userId='+testUser+'&devKey=test-key&provider=badFormat'};
            // set the assertions for the expected response object
            const res = {
                send: (url) => {
                    assert.equal(url, "error: the provider was badly formatted, missing or not supported");
                }
            }

            await myFunctions.connectService(req, res);

        });

        it("Should get an error if the devID is not correctly formatted or missing", async () => {
            // set the request object with the correct provider, incorrect developerId and correct userId
            const req = {url: 'https//test.com/?devId='+"incorrectDev"+'&userId='+testUser+'&provider=strava'};
            // set the assertions for the expected response object
            const res = {
                send: (url) => {
                    assert.equal(url, "error: the developerId was badly formatted, missing or not authorised");
                }
            }

            await myFunctions.connectService(req, res);
        });

        it("Should get an error if the developer is not correctly authorised", async () => {
            // set the request object with the correct provider, developerId and userId
            const req = {url: 'https//test.com/?devId='+testDev+'&userId='+testUser+'&devKey=wrong-key&provider=strava'};
            // set the assertions for the expected response object
            const res = {
                send: (url) => {
                    assert.equal(url, "error: the developerId was badly formatted, missing or not authorised");
                }
            }

            await myFunctions.connectService(req, res);
        });

        it("Should get an error if the userId is not provided", async () => {
            // set the request object with the correct provider, developerId and userId
            const req = {url: 'https//test.com/?devId='+testDev+'&devKey=test-key&provider=strava'};
            // set the assertions for the expected response object
            const res = {
                send: (url) => {
                    assert.equal(url, "error: the userId parameter is missing");
                }
            }

            await myFunctions.connectService(req, res);
        });
        
        it('should get a properly formatted strava redirect url...', async () => {
            // set the request object with the correct provider, developerId and userId
            const req = {url: 'https//test.com/?devId='+testDev+'&userId='+testUser+'&devKey=test-key&provider=strava'};
            // set the assertions for the expected response object
            const res = {
                send: (url) => {
                    assert.equal(url, "https://www.strava.com/oauth/authorize?client_id=72486&response_type=code&redirect_uri=https://us-central1-rove-26.cloudfunctions.net/stravaCallback?userId="+testUser+":"+testDev+"&approval_prompt=force&scope=profile:read_all,activity:read_all");
                    recievedStravaUrl = url;
                }
            }

            await myFunctions.connectService(req, res);

        })
        it('should get a properly formatted garmin redirect url...', async () => {
            // set the request object with the correct provider, developerId and userId
            const req = {url: 'https//test.com/?devId='+testDev+'&userId='+testUser+'&devKey=test-key&provider=garmin'};
            // set the assertions for the expected response object
            const res = {
                send: (url) => {
                    assert.include(url, "https://connect.garmin.com/oauthConfirm?oauth_token=");
                    assert.include(url, "&oauth_callback=https://us-central1-rove-26.cloudfunctions.net/oauthCallbackHandlerGarmin?oauth_token_secret=");
                    assert.include(url, "userId="+testUser);
                    recievedGarminUrl = url;
                }
            }

            await myFunctions.connectService(req, res);

        })

    }); //End Test 1

    //-------------TEST 2--- Test Callbacks from Strava and Garmin----
    describe("Testing that the strava and garmin callbacks work: ", () => {
        it('strava callback should check userId and DevId and write the access tokens to the database...', async () => {
            //set up the stubbed response to mimic strava's response when called with the
            //code to get the token
            const responseObject = {
                statusCode: 200,
                headers: {
                  'content-type': 'application/json'
                }
              };
              const responseBody = {
                access_token: 'test-long-access-token',
                refresh_token: 'test-refresh_token',
                expires_at: 1654014114,
                expires_in: 21600,
              };
            
            const expectedTestUserDoc = {
                devId: devUserData.devId,
                email: devUserData.email,
                id: 12345678,
                strava_access_token: 'test-long-access-token',
                strava_refresh_token: 'test-refresh_token',
                strava_token_expires_at: 1654014114,
                strava_token_expires_in: 21600,
                strava_connected: true,
            }

            sinon.stub(request, "post").yields(null, responseObject, JSON.stringify(responseBody));
            sinon.stub(strava.athlete, "get").returns({id: 12345678});

            // set the request object with the correct provider, developerId and userId
            const req = {url: "https://us-central1-rove-26.cloudfunctions.net/stravaCallback?userId="+testUser+":"+testDev+"&code=testcode&approval_prompt=force&scope=profile:read_all,activity:read_all"};
            const res = {
                send: (text) => {
                    assert.equal(text, "your authorization was successful please close this window")
                },
            }
            await myFunctions.stravaCallback(req, res);

            //now check the database was updated correctly
            testUserDoc = await admin.firestore()
            .collection("users")
            .doc(testUser)
            .get();

            assert.deepEqual(testUserDoc.data(), expectedTestUserDoc);

            sinon.restore();

        })
    });//end TEST 2

}); //end Integration TEST
