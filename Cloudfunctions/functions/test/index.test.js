
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

const test = require('firebase-functions-test')({
    databaseURL: "https://base-pace-default-rtdb.europe-west1.firebasedatabase.app",
    storageBucket: "base-pace.appspot.com",
    projectId:  "base-pace",
  }, 'test/keys/base-pace-firebase-adminsdk-key.json'); //PV TODO - make sure these point to the ROVE database and not the basepace database

  // Mock functions config values
test.mockConfig({
    "keys": {
      "signing": "testkey",
      "webhooks": "testkey"
    }
  });

const admin = require("firebase-admin");
//------------------------Set Up of Test Data Project Complete ---------------//


describe('ROVE Functions - Integration Tests', () => {
    let myFunctions;
    let testUser = "put a test user ID in here";
    let testDev = "put a test Developer ID in here";
  
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
    describe("Testing creating a user for the test developer...", () => {
        it('should create a new user and return the userID', async () => {

//-----------------------------PV GOT TO HERE BEFORE STOPPING -----------//
            await admin.firestore()
                .collection('users')
                .doc(testUser)
                .set({
                    username: 'testUser1',
                });
            await admin.firestore()
                .collection('users')
                .doc(testUser)
                .collection('private')
                .doc('account_info')
                .set({
                email: "testUser1@test.com",
                athlete_setup: true,
                setup_complete: false,
                plan_setup: false,
                verified: false,
                firstname: "Test",
                lastname: "User1",
                age: 58,
                gender: "Male",
                account_setup: true,
                });

            await admin.firestore()
                .collection("users")
                .doc(testUser)
                .collection("private")
                .doc("training_plan_settings")
                .set({
                plan_setup: false,
                rest_days: [2,5],
                long_days: [3,6],
                init_hours: (90 / 60),
                final_hours: (180 / 60),
                goals: [{
                    date: new Date(Date.now() + (7*14*24*60*60*1000)).valueOf(),
                    sport: "running",
                    distance: 10000
                }],
                pbTime: 600,
                pbDistance: 1200,
                maxRunTime: 0.45,
                userAbility: "novice",
                runOften: true,
            });

            await admin.firestore()
                .collection("users")
                .doc(testUser)
                .collection("private")
                .doc("personal_bests")
                .set({
                run_max_effort_distance: 5000,
                run_max_effort_time: 45*60,
                max_run_distance: 0.4,
                run_often: true,
                runner: true,
            });
        });//end it
    }); //End TEST 1
//-------TEST 2 ----- CreatePlan for test user ----------
    describe("Testing CreatePlan...", () => {
        it('should create a plan for the test user', async () => {
            // Set test parameters:
            const sensibleUpperPace = 1000;
            const sensibleUpperDistance = 1000;
            //wrap the function to be called using the wrap method this enables us to call with the data map
            const wrapped = test.wrap(myFunctions.createPlan);
            //set up the data to be used to call our function
            const data = {"userId": testUser};

            // Invoke the wrapped function without specifying the event context.
            await wrapped(data);

            // Get the state of the database after the test has been run
            var newCreatedSessions = await admin // get the sessions that were created for the user
                .firestore()
                .collection("users")
                .doc(testUser)
                .collection("training_sessions")
                .get();

            // Test that number of sessions are within expected range
            assert(90 < newCreatedSessions.docs.length < 100, "number of sessions not between 90 and 100");
           
            //Test for pace or distance = NaN or above certain thresholds 
            newCreatedSessions.docs.forEach((doc) => {  //the new sessions should not have any NaN items in the pace or distance fileds
                    doc.data().intervals.forEach((interval) => {
                        assert.isNotNaN(interval.pace);
                        assert.isNotNaN(interval.distance);
                        assert(interval.pace < sensibleUpperPace, "pace above upper limit: "+interval.pace);
                        assert(interval.distance < sensibleUpperDistance, "distance above upper limit");
                        })
                });

        });
    }); //end TEST 2
    
//---------TEST 3 ------- UpdatePaces for the test user ---------------------
    describe("Testing updatePaces...", () => {
        it('should update the plan and archive the current plan', async () => {
            //wrap the function to be called using the wrap method this enables us to call with the data map
            const wrapped = test.wrap(myFunctions.updatePaces);
            //set up the data to be used to call our function
            const data = {"userId": testUser};

            //get the state of the database before the function is called
            var beforeSessions = await admin
             .firestore()
             .collection("users")
             .doc(testUser)
             .collection("training_sessions")
             .get();

            // Invoke the wrapped function without specifying the event context.
            await wrapped(data);
            
            //retrieve the actual results

            // get the archived plans
            var createdArchive = await admin
                .firestore()
                .collection("users")
                .doc(testUser)
                .collection("archive")
                .get();

            //get the sessions in the first archived plan (there should only be 1 for this user)
            var createdArchiveSession = await 
                createdArchive.docs[0].ref
                .collection("training_sessions")
                .get();

            //get the new sessions created for the new plan
            var newCreatedSessions = await admin
                .firestore()
                .collection("users")
                .doc(testUser)
                .collection("training_sessions")
                .get()

            // Check the actual results against expected results

            // Only one archive should be created
            assert.equal(createdArchive.docs.length, 1,
                "too many/too few archives - expected exactly 1 archive");

            // The archived sessions should be exaclty equal to the sessions that were in the DB before it was updated
            for (let i; i<= createdArchiveSession.length; i++) { 
                assert.deepEqual(createdArchive[i].data(), beforeSessions[i].data(), 
                    "the sessions that were archived are not the same as the original plan sessions");
            }
               
            //the new sessions should not have any NaN items in the pace or distance fields
            newCreatedSessions.docs.forEach((doc) => {  
                doc.data().intervals.forEach((interval) => {
                    assert.isNotNaN(interval.pace,
                        "at least one of the pace field is NaN - expected none to be NaN"); //PV TODO: move to test 1
                    assert.isNotNaN(interval.distance,
                        "at least one of the distance field is NaN - expected none to be NaN");
                    })
            });
        });
    });
}); //end TEST 3

