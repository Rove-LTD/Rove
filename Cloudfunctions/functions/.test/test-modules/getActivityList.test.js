// Follow the instructions in README.md for running these tests.
// Visit https://firebase.google.com/docs/functions/unit-testing to learn more
// about using the `firebase-functions-test` SDK.

// -----------------------COMMON TEST SETUP---------------------------//
// Chai is a commonly used library for creating unit test suites. It is easily 
// extended with plugins.
const chai = require('chai');
const assert = chai.assert;
const fs = require('fs');

// Sinon is a library used for mocking or verifying function calls in JavaScript.
const sinon = require('sinon');
// -------------------END COMMON TEST SETUP---------------------------//

// -----------INITIALISE THE ROVE TEST PARAMETERS----------------------------//
const testParameters = require('../testParameters.json');
const firebaseConfig = testParameters.firebaseConfig;
const testUser = testParameters.testUser
const testDev = testParameters.testDev
const test = require('firebase-functions-test')(firebaseConfig, testParameters.testKeyFile);
const admin = require("firebase-admin");
const myFunctions = require('../../index.js');
const startTime = "2022-07-22T07:15:33.000Z";
const endTime = "2022-07-23T09:15:33.000Z"

// -----------END INITIALISE ROVE TEST PARAMETERS----------------------------//

// -----------------INCLUDE ANY FUNCTIONS TO STUB-----------------------//
// include the functions that we are going to be stub in the
// testing processes - these have to have the same constant
// name as in the function we are testing
const got = require('got');
const { doesNotMatch } = require('assert');
const { user } = require('firebase-functions/v1/auth');
// ------------------------END OF STUB FUNCTIONS----------------------------//

// --------------START CONNECTSERVICE TESTS----------------------------------//
describe("Testing that the developer can call API to getActivityList() and receive redirection URL: ", () => {
    before ('set up the userIds in the test User doc', async () => {
        await admin.firestore()
        .collection("users")
        .doc(testDev+testUser)
        .set({
            "devId": testDev,
            "userId": testUser,
            "wahoo_user_id": "1510441",
            "wahoo_access_token": "umHK1qxDIDG13xL8267NPsjb4N04rM-HR8YNyGwL1RA",
            "wahoo_refresh_token": "RuEMUfod-SI9KTiNbfbhVzyopyU-yjBJiixr1Coq4iM",
            "wahoo_token_expires_at":"1659020663",
            "wahoo_token_expires_in": "7200",
            "polar_user_id": "polar_test_user",
            "polar_access_token": "d717dd39d09b91939f835d66a640927d",
            "strava_id" : "12972711",
            "strava_access_token": "e703c5893d94dda02e74a87b5ae2d8082457869d",
            "strava_refresh_token": "077e305b5af2ed1667fa5406aec491b31ba50b5d",
            "strava_token_expires_at": "1659032916",
            "garmin_access_token" :"garmin-test-access-token",
        }, {merge: true});
  
        activityDocs = await admin.firestore()
            .collection("users")
            .doc(testDev+testUser)
            .collection("activities")
            .get();
        
        activityDocs.forEach(async (doc)=>{
            await doc.ref.delete();
        });

        await admin.firestore()
            .collection("users")
            .doc(testDev+testUser)
            .collection("activities").doc().set({
                raw: {},
                sanitised: {
                "start_time": startTime,
                "userId": testUser,
                "activity_name": "TestActivity"
                }
            })
    });
  it('should get error if the start/end is not correct...', async () => {
      // set the request object with the incorrect provider, correct developerId, devKey and userId
      const req = {url: 'https://us-central1-rovetest-beea7.cloudfunctions.net/getActivityList?devId='+testDev+'&userId='+testUser+'&devKey=test-key&start=bad-format&end=bad-format'};
      // set the assertions for the expected response object
      const res = {
          send: (url) => {
              assert.equal(url, "error: the start/end was badly formatted, or missing");
          },
          redirect: (url) => {
            assert.equal(url, "error: the start/end was badly formatted, or missing");
          },
          status: (code) => {
              assert.equal(code, 400);
          }
      }

      await myFunctions.getActivityList(req, res);

  });

  it("Should get an error if the devID is not correctly formatted or missing", async () => {
      // set the request object with the correct provider, incorrect developerId and correct userId
      const req = {url: 'https://us-central1-rovetest-beea7.cloudfunctions.net/getActivityList?devId='+"incorrectDev"+'&userId='+testUser+'&start=1658300257&end=1658905057'};
      // set the assertions for the expected response object
      const res = {
          send: (url) => {
              assert.equal(url, "error: the developerId was badly formatted, missing or not authorised");
          },
          status: (code) => {
              assert.equal(code, 400);
          }
      }

      await myFunctions.getActivityList(req, res);
  });

  it("Should get an error if the developer is not correctly authorised", async () => {
      // set the request object with the correct provider, developerId and userId
      const req = {url: 'https://us-central1-rovetest-beea7.cloudfunctions.net/getActivityList?devId='+testDev+'&userId='+testUser+'&devKey=wrong-key&start=1658300257&end=1658905057'};
      // set the assertions for the expected response object
      const res = {
          send: (url) => {
              assert.equal(url, "error: the developerId was badly formatted, missing or not authorised");
          },
          status: (code) => {
              assert.equal(code, 400);
          }
      }

      await myFunctions.getActivityList(req, res);
  });

  it("Should get an error if the userId is not provided", async () => {
      // set the request object with the correct provider, developerId and userId
      const req = {url: 'https://us-central1-rovetest-beea7.cloudfunctions.net/getActivityList?devId='+testDev+'&devKey=test-key&start=1658300257&end=1658905057'};
      // set the assertions for the expected response object
      const res = {
          send: (url) => {
              assert.equal(url, "error: the userId parameter is missing");
          },
          status: (code) => {
              assert.equal(code, 400);
          }
      }

      await myFunctions.getActivityList(req, res);
  });
  it('Internal requests should return a list of activities from db...', async () => {
    // set the request object with the correct provider, developerId and userId
    const req = {
        url: 'https://us-central1-rovetest-beea7.cloudfunctions.net/getActivityList?devId='+testDev+'&userId='+testUser+'&devKey=test-key&start='+startTime+'&end='+endTime,
    };
    res = {
        send: (JSON)=> {assert.equal(JSON, [{
            raw: {},
            sanitised: {
            "start_time": startTime,
            "userId": userId,
            "activity_name": "TestActivity"
            }
            },]);},
        status: (code)=>{assert.equal(code, 200);},
    }


    await myFunctions.getActivityList(req, res);
    const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
    await wait(1000);
    //now check the database was updated correctly
   const testUserDocs = await admin.firestore()
   .collection("users")
   .doc(testDev+testUser)
   .collection("activities").where("sanitised.start_time", ">", "2022-07-22T09:15:33.000Z").where("sanitised.start_time", "<", "2022-07-23T09:15:33.000Z")
   .get();

   const sanatisedActivity = testUserDocs.docs[0].data();
   const expectedResults = {
    raw: {},
    sanitised: {
    "start_time": startTime,
    "userId": userId,
    "activity_name": "TestActivity"
    }
    }

   assert.deepEqual(sanatisedActivity, expectedResults);
})
it.only('External requests should return a list of activities...', async () => {
    // set the request object with the correct provider, developerId and userId
    const req = {
        url: 'https://us-central1-rovetest-beea7.cloudfunctions.net/getActivityList?devId='+testDev+'&userId='+testUser+'&devKey=test-key&start=2022-07-22T09:15:33.000Z&end=2022-07-28T09:15:33.000Z',
    };
    res = {
        send: (JSON)=> {assert.equal(JSON, [{
            raw: {},
            sanitised: {
            "start_time": startTime,
            "userId": testUser,
            "activity_name": "TestActivity"
            }
            },]);},
        status: (code)=>{assert.equal(code, 200);},
    }


    await myFunctions.getActivityList(req, res);
    const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
    await wait(1000);
    //now check the database was updated correctly
   const testUserDocs = await admin.firestore()
   .collection("users")
   .doc(testDev+testUser)
   .collection("activities").where("sanitised.start_time", ">", "2022-07-22T09:15:33.000Z").where("sanitised.start_time", "<", "2022-07-23T09:15:33.000Z")
   .get();

   const sanatisedActivity = testUserDocs.docs[0].data();
   const expectedResults = {
    raw: {},
    sanitised: {
    "start_time": startTime,
    "userId": userId,
    "activity_name": "TestActivity"
    }
    }

   assert.deepEqual(sanatisedActivity, expectedResults);
})
});