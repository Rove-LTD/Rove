
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
        it('should get a properly formatted polar redirect url...', async () => {
            // set the request object with the correct provider, developerId and userId
            const req = {url: 'https//test.com/?devId='+testDev+'&userId='+testUser+'&devKey=test-key&provider=polar'};
            // set the assertions for the expected response object
            const res = {
                send: (url) => {
                    assert.equal(url, "https://flow.polar.com/oauth2/authorization?client_id=654623e7-7191-4cfe-aab5-0bc24785fdee&response_type=code&redirect_uri=https://us-central1-rove-26.cloudfunctions.net/polarCallback&scope=accesslink.read_all&state=paulsTestDevUser:paulsTestDev");
                    recievedPolarUrl = url;
                }
            }

            await myFunctions.connectService(req, res);

        })

        it('should get a properly formatted wahoo redirect url...', async () => {
            // set the request object with the correct provider, developerId and userId
            const req = {url: 'https//test.com/?devId='+testDev+'&userId='+testUser+'&devKey=test-key&provider=wahoo'};
            // set the assertions for the expected response object
            const res = {
                send: (url) => {
                    assert.include(url, "https://connect.wahoo.com//authorization?");
                    assert.include(url, "&redirect_uri=https://us-central1-rove-26.cloudfunctions.net/wahooCallback?state=");
                    assert.include(url, "state="+testUser+":"+testDev);
                }
            }

            await myFunctions.connectService(req, res);

        })


    }); // End TEST 1------ test connectService() ------------

    //-------------TEST 2--- Test Callbacks from Strava-------
    describe("Testing that the strava callbacks work: ", () => {
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
                strava_id: 12345678,
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
    });//End TEST 2--- Test Callbacks for Strava--------------

    //-------------TEST 2--- Test Callbacks for Polar-------
    describe("Testing that the polar callbacks work: ", () => {
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

            const stubbedcall = sinon.stub(request, "post")
            stubbedcall.onFirstCall().yields(null, responseObject1, JSON.stringify(responseBody1));
            stubbedcall.onSecondCall().yields(null, responseObject2, JSON.stringify(responseBody2));
            //sinon.stub(polar.athlete, "get").returns({id: 12345678});

            // set the request object with the correct provider, developerId and userId
            const req = {url: "https://us-central1-rove-26.cloudfunctions.net/polarCallback?state="+testUser+":"+testDev+"&code=testcode"};
            const res = {
                send: (text) => {
                    assert.equal(text, "your authorization was successful please close this window: you are already registered with Polar - there is no need to re-register")
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
            //sinon.stub(polar.athlete, "get").returns({id: 12345678});

            // set the request object with the correct provider, developerId and userId
            const req = {url: "https://us-central1-rove-26.cloudfunctions.net/polarCallback?state="+testUser+":"+testDev+"&code=testcode"};
            const res = {
                send: (text) => {
                    assert.equal(text, "your authorization was successful please close this window: ")
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
    });// end Test 3
/*     //---------TEST 4 ------------

    describe("Testing that the Wahoo callbacks work: ", () => {
        it('wahoo callback should check userId and DevId and write the access tokens to the database...', async () => {
            //set up the stubbed response to mimic polar's response when called with the
            //code to get the token
            const responseObject = {
                statusCode: 200,
                headers: {
                  'content-type': 'application/json'
                }
              };
              const responseBody = {
                access_token: 'test-polar-access-token',
                token_type: 'bearer',
                expires_in: 21600,
                x_user_id: '123456polar',
              };
            
            const expectedTestUserDoc = {
                devId: devUserData.devId,
                email: devUserData.email,
                id: 12345678,
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

            sinon.stub(request, "post").yields(null, responseObject, JSON.stringify(responseBody));
            //sinon.stub(polar.athlete, "get").returns({id: 12345678});

            // set the request object with the correct provider, developerId and userId
            const req = {url: "https://us-central1-rove-26.cloudfunctions.net/polarCallback?state="+testUser+":"+testDev+"&code=testcode"};
            const res = {
                send: (text) => {
                    assert.equal(text, "your authorization was successful please close this window")
                },
            }
            await myFunctions.polarCallback(req, res);

            //now check the database was updated correctly
            testUserDoc = await admin.firestore()
            .collection("users")
            .doc(testUser)
            .get();

            assert.deepEqual(testUserDoc.data(), expectedTestUserDoc);

            sinon.restore();

        })
    });// end Test 4 */
}); //end Integration TEST

