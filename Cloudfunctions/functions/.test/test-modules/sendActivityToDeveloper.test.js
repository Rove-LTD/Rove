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
const testNotionUser = testParameters.testNotionUser
const testNotionDev = testParameters.testNotionDev
const unsuccessfulWebhookMessageDoc = "unsuccessfulTestWebhookMessageDoc";
const successfulWebhookMessageDoc1 = "successfulTestWebhookMessageDoc1";
const successfulWebhookMessageDoc2 = "successfulTestWebhookMessageDoc2";
let successfulWebhookMessage;
let unsuccessfulWebhookMessage;
const devTestData = testParameters.devTestData;
const devTestNotionData = testParameters.devTestNotionData;
const devUserData = testParameters.devUserData
const test = require('firebase-functions-test')(firebaseConfig, testParameters.testKeyFile);
const admin = require("firebase-admin");
myFunctions = require('../../index.js');
// -----------END INITIALISE ROVE TEST PARAMETERS----------------------------//

// ---------REQUIRE FUNCTONS TO BE STUBBED----------------------//
// include the functions that we are going to be stub in the
// testing processes - these have to have the same constant
// name as in the function we are testing
const got = require('got');
const notion = require('../../notion.js');
const webhookInBox = require('../../webhookInBox');
// const sampleFile = require("./samples-7509571698strava");
//-------------TEST --- webhooks-------
describe("Testing that sending webhook messages to developers work: ", () => {
    before ('set up the userIds and activity records in the test User doc', async () => {
      await admin.firestore()
      .collection("users")
      .doc(testDev+testUser)
      .set({
          "devId": testDev,
          "userId": testUser,
          "wahoo_user_id": "wahoo_test_user",
      }, {merge: true});

    activityDocs = await admin.firestore()
          .collection("users")
          .doc(testDev+testUser)
          .collection("activities")
          .get();
      
      activityDocs.forEach(async (doc)=>{
          await doc.ref.delete();
      });
      const successfulWebhookMessage1 = {
        provider: "wahoo",
        body: '{"user":{"id":"wahoo_test_user"},"event_type":"workout_summary","workout_summary":{"duration_active_accum":"9.0","workout":{"name":"Cycling","workout_token":"ELEMNT AE48:274","workout_type_id":0,"id":147564736,"updated_at":"2022-06-13T16:39:08.000Z","plan_id":null,"minutes":0,"starts":"2022-06-13T16:38:51.000Z","created_at":"2022-06-13T16:39:08.000Z"},"speed_avg":"0.0","duration_total_accum":"9.0","cadence_avg":"0.0","id":140473420,"work_accum":"0.0","power_bike_tss_last":null,"ascent_accum":"0.0","power_bike_np_last":null,"duration_paused_accum":"0.0","created_at":"2022-06-13T16:39:09.000Z","updated_at":"2022-06-13T16:39:09.000Z","power_avg":"0.0","file":{"url":"https://cdn.wahooligan.com/wahoo-cloud/production/uploads/workout_file/file/WpHvKL3irWsv2vHzGzGF_Q/2022-06-13-163851-ELEMNT_AE48-274-0.fit"},"distance_accum":"0.0","heart_rate_avg":"0.0","calories_accum":"0.0"},"webhook_token":"348a6fe2-3719-4647-a233-933b8c404d6b"}',
        method: "POST",
        secret_lookups: "IGQW1vInhei9CE_tEyoso2V4COhNOn53AfYGsTx96oA",
        status: "added before the tests to be successful",
      }
      activityDoc1 = {
        sanitised: {
            userId: testUser,
            messageType: "activities",
            activity_id: 140473422,
            activity_name: "Cycling",
            activity_type: "BIKING",
            distance_in_meters: "0.0",
            average_pace_in_meters_per_second: "0.0",
            active_calories: "0.0",
            activity_duration_in_seconds: "9.0",
            start_time: '2022-06-13T16:38:51.000Z',
            average_heart_rate_bpm: "0.0",
            average_cadence: "0.0",
            elevation_gain: "0.0",
            elevation_loss: null,
            provider: "wahoo",
            power_bike_tss_last: null,
            power_bike_np_last: null,
            ascent_accum: "0.0",
            duration_paused_accum: "0.0",
            created_at: "2022-06-13T16:39:09.000Z",
            updated_at: "2022-06-13T16:39:09.000Z",
            power_avg: "0.0",
            file: {
                "url":"https://cdn.wahooligan.com/wahoo-cloud/production/uploads/workout_file/file/WpHvKL3irWsv2vHzGzGF_Q/2022-06-13-163851-ELEMNT_AE48-274-0.fit"
            },
        },
        raw: JSON.parse(successfulWebhookMessage1.body),
        status: "resend"
      }
      const successfulSleepMessage1 = {
        provider: "garmin",
        body: '{"summaryId": "EXAMPLE_567890", "calendarDate": "2016-01-10", "durationInSeconds": 15264, "startTimeInSeconds": 1452419581, "startTimeOffsetInSeconds": 7200, "unmeasurableSleepDurationInSeconds": 0, "deepSleepDurationInSeconds": 11231, "lightSleepDurationInSeconds": 3541, "remSleepInSeconds": 0, "awakeDurationInSeconds": 492, "sleepLevelsMap": {"deep": [ {"startTimeInSeconds": 1452419581,"endTimeInSeconds": 1452478724}], "light": [{"startTimeInSeconds": 1452478725,"endTimeInSeconds": 1452479725}, {"startTimeInSeconds": 1452481725,"endTimeInSeconds": 1452484266} ]},"validation": "DEVICE"}',
        method: "POST",
        secret_lookups: "test-garmin-lookup",
        status: "added before the tests to be successful",
      }
      sleepDoc1 = {
        sanitised: {
            "messageType": "sleeps",
            "date": "2016-01-10",
            "deep": 11231,
            "duration": 15264,
            "id": "EXAMPLE_567890",
            "light": 3541,
            "rem": 0,
            "startTime": 1452419581,
            "unmeasurable": 0,
        },
        raw: JSON.parse(successfulSleepMessage1.body),
        status: "resend"
      }
      const successfulDailyMessage1 = {
        provider: "garmin",
        body: '{"summaryId": " EXAMPLE_67891", "calendarDate": "2016-01-11", "activityType": "WALKING", "activeKilocalories": 321, "bmrKilocalories": 1731, "steps": 4210, "distanceInMeters": 3146.5, "durationInSeconds": 86400, "activeTimeInSeconds": 12240, "startTimeInSeconds": 1452470400, "startTimeOffsetInSeconds": 3600, "moderateIntensityDurationInSeconds": 81870, "vigorousIntensityDurationInSeconds": 4530, "floorsClimbed": 8, "minHeartRateInBeatsPerMinute": 59, "averageHeartRateInBeatsPerMinute": 64, "maxHeartRateInBeatsPerMinute": 112, "timeOffsetHeartRateSamples": {"15": 75, "30": 75, "3180": 76, "3195": 65, "3210": 65, "3225": 73, "3240": 74, "3255": 74},"averageStressLevel": 43, "maxStressLevel": 87, "stressDurationInSeconds": 13620, "restStressDurationInSeconds": 7600, "activityStressDurationInSeconds": 3450, "lowStressDurationInSeconds": 6700, "mediumStressDurationInSeconds": 4350, "highStressDurationInSeconds": 108000, "stressQualifier": "stressful_awake", "stepsGoal": 4500, "intensityDurationGoalInSeconds": 1500, "floorsClimbedGoal": 18}',
        method: "POST",
        secret_lookups: "test-garmin-lookup",
        status: "added before the tests to be successful",
      }
      dailyDoc1 = {
        sanitised: {
            "id": "EXAMPLE_67891",
            "messageType": "dailySummaries",
            "activeCalories": 321,
            "activeTimeSeconds": 12240,
            "aveHeartRate": 64,
            "bmrCalories": 1731,
            "date": "2016-01-11",
            "distanceInMeters": 3146.5,
            "floorsClimbed": 8,
            "maxHeartRate": 112,
            "minHeartRate": 59,
            "restingHeartRate": null,
            "startTimeInSeconds": 1452470400,
            "steps": 4210,
        },
        raw: JSON.parse(successfulDailyMessage1.body),
        status: "resend"
      }
      activityDoc2 = {
        sanitised: {
            userId: testUser,
            messageType: "activities",
            activity_id: 140473426,
            activity_name: "Cycling",
            activity_type: "BIKING",
            distance_in_meters: "0.0",
            average_pace_in_meters_per_second: "0.0",
            active_calories: "0.0",
            activity_duration_in_seconds: "9.0",
            start_time: '2022-06-13T16:38:51.000Z',
            average_heart_rate_bpm: "0.0",
            average_cadence: "0.0",
            elevation_gain: "0.0",
            elevation_loss: null,
            provider: "wahoo",
            power_bike_tss_last: null,
            power_bike_np_last: null,
            ascent_accum: "0.0",
            duration_paused_accum: "0.0",
            created_at: "2022-06-13T16:39:09.000Z",
            updated_at: "2022-06-13T16:39:09.000Z",
            power_avg: "0.0",
            file: {
                "url":"https://cdn.wahooligan.com/wahoo-cloud/production/uploads/workout_file/file/WpHvKL3irWsv2vHzGzGF_Q/2022-06-13-163851-ELEMNT_AE48-274-0.fit"
            },
        },
        raw: JSON.parse(successfulWebhookMessage1.body),
        status: "retry"
      }
      activityDoc3 = {
        sanitised: {
            userId: testNotionUser,
            messageType: "activities",
            activity_id: 140473430,
            activity_name: "Cycling",
            activity_type: "BIKING",
            distance_in_meters: "0.0",
            average_pace_in_meters_per_second: "0.0",
            active_calories: "0.0",
            activity_duration_in_seconds: "9.0",
            start_time: '2022-06-13T16:38:51.000Z',
            average_heart_rate_bpm: "0.0",
            average_cadence: "0.0",
            elevation_gain: "0.0",
            elevation_loss: null,
            provider: "wahoo",
            power_bike_tss_last: null,
            power_bike_np_last: null,
            ascent_accum: "0.0",
            duration_paused_accum: "0.0",
            created_at: "2022-06-13T16:39:09.000Z",
            updated_at: "2022-06-13T16:39:09.000Z",
            power_avg: "0.0",
            file: {
                "url":"https://cdn.wahooligan.com/wahoo-cloud/production/uploads/workout_file/file/WpHvKL3irWsv2vHzGzGF_Q/2022-06-13-163851-ELEMNT_AE48-274-0.fit"
            },
        },
        raw: JSON.parse(successfulWebhookMessage1.body),
        status: "send"
      }

    });
    after('clean-up the developer documents',async ()=>{
        await admin.firestore()
        .collection("developers")
        .doc(testDev)
        .set({
            "suppress_webhook": false
        }, {merge: true});
    })
    it('Check sending activity webhook message to developers works...', async ()=>{
      // set up the activities in the database
      await admin.firestore()
          .collection("users")
          .doc(testDev+testUser)
          .collection("activities")
          .doc(activityDoc1.sanitised.activity_id+"wahoo")
          .set(activityDoc1);

        const snapshotBefore = test.firestore.makeDocumentSnapshot(activityDoc1, "users/"+testDev+testUser+"/activities/"+activityDoc1.sanitised.activity_id+"wahoo");
        const snapshotAfter = test.firestore.makeDocumentSnapshot(activityDoc1, "users/"+testDev+testUser+"/activities/"+activityDoc1.sanitised.activity_id+"wahoo");
        const snapshot = test.makeChange(snapshotBefore, snapshotAfter);

        gotPostSpy = sinon.spy(got, "post");
        wrapped = test.wrap(myFunctions.sendToDeveloper);
        await wrapped(snapshot, {params: {userDocId: testDev+testUser,
          messageType: "activities",
          activityId: activityDoc1.sanitised.activity_id+"wahoo"}});
        // now check the got call was correct information
        let args = gotPostSpy.getCall(0).args[0]
        args.body = JSON.parse(args.body);
        expectedOptions = {
            method: "POST",
            url: devTestData.activity_endpoint,
            headers: {
            "Accept": "application/json",
            "Content-type": "application/json",
            },
            body: {sanitised: activityDoc1.sanitised,
              raw: activityDoc1.raw,},
        };
        assert.deepEqual(args, expectedOptions, "the wrong info was sent to the developer endpoint");
        //now check the database was updated correctly
       const testUserDoc = await admin.firestore()
          .collection("users")
          .doc(testDev+testUser)
          .collection("activities")
          .doc(activityDoc1.sanitised.activity_id+"wahoo")
          .get();
  
       // actual results
       const sanatisedActivity = testUserDoc.data();
       sanatisedActivity.timestamp = "not tested";
       // expected results
       activityDoc1.status = "sent";
       activityDoc1.timestamp = "not tested";

      assert.deepEqual(sanatisedActivity, activityDoc1);
      sinon.restore();
    })
    it('Check sending sleep webhook message to developers works...', async ()=>{
      // set up the activities in the database
      await admin.firestore()
          .collection("users")
          .doc(testDev+testUser)
          .collection("sleeps")
          .doc(sleepDoc1.sanitised.id+"garmin")
          .set(sleepDoc1);

        const snapshotBefore = test.firestore.makeDocumentSnapshot(sleepDoc1, "users/"+testDev+testUser+"/sleeps/"+sleepDoc1.sanitised.id+"garmin");
        const snapshotAfter = test.firestore.makeDocumentSnapshot(sleepDoc1, "users/"+testDev+testUser+"/sleeps/"+sleepDoc1.sanitised.id+"garmin");
        const snapshot = test.makeChange(snapshotBefore, snapshotAfter);

        gotPostSpy = sinon.spy(got, "post");
        wrapped = test.wrap(myFunctions.sendToDeveloper);
        await wrapped(snapshot, {params: {userDocId: testDev+testUser,
          messageType: "sleeps",
          activityId: sleepDoc1.sanitised.id+"garmin"}});
        // now check the got call was correct information
        let args = gotPostSpy.getCall(0).args[0]
        args.body = JSON.parse(args.body);
        expectedOptions = {
            method: "POST",
            url: devTestData.sleep_endpoint,
            headers: {
            "Accept": "application/json",
            "Content-type": "application/json",
            },
            body: {sanitised: sleepDoc1.sanitised,
              raw: sleepDoc1.raw,},
        };
        assert.deepEqual(args, expectedOptions, "the wrong info was sent to the developer endpoint");
        //now check the database was updated correctly
       const testUserDoc = await admin.firestore()
          .collection("users")
          .doc(testDev+testUser)
          .collection("sleeps")
          .doc(sleepDoc1.sanitised.id+"garmin")
          .get();
  
       // actual results
       const sanatisedActivity = testUserDoc.data();
       sanatisedActivity.timestamp = "not tested";
       // expected results
       sleepDoc1.status = "sent";
       sleepDoc1.timestamp = "not tested";

      assert.deepEqual(sanatisedActivity, sleepDoc1);
      sinon.restore();
    })
    it('Check sending dayly webhook message to developers works...', async ()=>{
      // set up the activities in the database
      await admin.firestore()
          .collection("users")
          .doc(testDev+testUser)
          .collection("dailySummaries")
          .doc(dailyDoc1.sanitised.id+"garmin")
          .set(dailyDoc1);

        const snapshotBefore = test.firestore.makeDocumentSnapshot(dailyDoc1, "users/"+testDev+testUser+"/dailySummaries/"+dailyDoc1.sanitised.id+"garmin");
        const snapshotAfter = test.firestore.makeDocumentSnapshot(dailyDoc1, "users/"+testDev+testUser+"/dailySummaries/"+dailyDoc1.sanitised.id+"garmin");
        const snapshot = test.makeChange(snapshotBefore, snapshotAfter);

        gotPostSpy = sinon.spy(got, "post");
        wrapped = test.wrap(myFunctions.sendToDeveloper);
        await wrapped(snapshot, {params: {userDocId: testDev+testUser,
          messageType: "dailySummaries",
          activityId: dailyDoc1.sanitised.id+"garmin"}});
        // now check the got call was correct information
        let args = gotPostSpy.getCall(0).args[0]
        args.body = JSON.parse(args.body);
        expectedOptions = {
            method: "POST",
            url: devTestData.dailySummary_endpoint,
            headers: {
            "Accept": "application/json",
            "Content-type": "application/json",
            },
            body: {sanitised: dailyDoc1.sanitised,
              raw: dailyDoc1.raw,},
        };
        assert.deepEqual(args, expectedOptions, "the wrong info was sent to the developer endpoint");
        //now check the database was updated correctly
       const testUserDoc = await admin.firestore()
          .collection("users")
          .doc(testDev+testUser)
          .collection("dailySummaries")
          .doc(dailyDoc1.sanitised.id+"garmin")
          .get();
  
       // actual results
       const sanatisedActivity = testUserDoc.data();
       sanatisedActivity.timestamp = "not tested";
       // expected results
       dailyDoc1.status = "sent";
       dailyDoc1.timestamp = "not tested";

      assert.deepEqual(sanatisedActivity, dailyDoc1);
      sinon.restore();
    })
    it('Check that webhook messages are suppressed ...', async () => {

        await admin.firestore()
            .collection("developers")
            .doc(testDev)
            .set({
                "suppress_webhook": true
            }, {merge: true});
        
        await admin.firestore()
        .collection("users")
        .doc(testDev+testUser)
        .collection("activities")
        .doc(activityDoc2.sanitised.activity_id+"wahoo")
        .set(activityDoc2);
  

        const snapshotBefore = test.firestore.makeDocumentSnapshot(activityDoc2, "users/"+testDev+testUser+"/activities/"+activityDoc2.sanitised.activity_id+"wahoo");
        const snapshotAfter = test.firestore.makeDocumentSnapshot(activityDoc2, "users/"+testDev+testUser+"/activities/"+activityDoc2.sanitised.activity_id+"wahoo");
        const snapshot = test.makeChange(snapshotBefore, snapshotAfter);

        wrapped = test.wrap(myFunctions.sendToDeveloper);
        await wrapped(snapshot, {params: {userDocId: testDev+testUser,
          messageType: "activities",
          activityId: activityDoc2.sanitised.activity_id+"wahoo"}});

        //now check the database was updated correctly
        const testUserDoc = await admin.firestore()
          .collection("users")
          .doc(testDev+testUser)
          .collection("activities")
          .doc(activityDoc2.sanitised.activity_id+"wahoo")
          .get();

        // actual results
        const sanatisedActivity = testUserDoc.data();
        sanatisedActivity.timestamp = "not tested";
        // expected results
        activityDoc2.status = "suppressed"
        activityDoc2.timestamp = "not tested";

        assert.deepEqual(sanatisedActivity, activityDoc2);
        sinon.restore();
        await admin.firestore()
        .collection("developers")
        .doc(testDev)
        .set({
            "suppress_webhook": false
        }, {merge: true});
    });
    it('check that retries work...', async ()=> {
      // create snapshot

      const snapshotBefore = test.firestore.makeDocumentSnapshot(activityDoc1, "users/"+testDev+testUser+"/activities/"+activityDoc1.sanitised.activity_id+"wahoo");
      activityDoc1.status = "retry";
      activityDoc1.triesSoFar = 1
      const snapshotAfter = test.firestore.makeDocumentSnapshot(activityDoc1, "users/"+testDev+testUser+"/activities/"+activityDoc1.sanitised.activity_id+"wahoo");
      const snapshot = test.makeChange(snapshotBefore, snapshotAfter);
    
      // set up activity in the database
      await admin.firestore()
        .collection("users")
        .doc(testDev+testUser)
        .collection("activities")
        .doc(activityDoc1.sanitised.activity_id+"wahoo")
        .set(activityDoc1);

      // stub out/spy got call that send to developer
      gotPostSpy = sinon.spy(got, "post");

      // call sendToDeveloper function
      wrapped = test.wrap(myFunctions.sendToDeveloper);
      await wrapped(snapshot, {params: {userDocId: testDev+testUser,
        messageType: "activities",
        activityId: activityDoc1.sanitised.activity_id+"wahoo"}});

      // now check the got call was correct information
      let args = gotPostSpy.getCall(0).args[0]
      args.body = JSON.parse(args.body);
      expectedOptions = {
          method: "POST",
          url: devTestData.activity_endpoint,
          headers: {
          "Accept": "application/json",
          "Content-type": "application/json",
          },
          body: {"sanitised": activityDoc1.sanitised,
              "raw": activityDoc1.raw},
      };
      assert.deepEqual(args, expectedOptions, "the wrong info was sent to the developer endpoint");
       //now check the database was updated correctly
       const testUserDoc = await admin.firestore()
          .collection("users")
          .doc(testDev+testUser)
          .collection("activities")
          .doc(activityDoc1.sanitised.activity_id+"wahoo")
          .get();
  
       // actual results
       const sanatisedActivity = testUserDoc.data();
       sanatisedActivity.timestamp = "not tested";
       // expected results
       activityDoc1.status = "sent";
       activityDoc1.triesSoFar = 1;
       activityDoc1.timestamp = "not tested";

      assert.deepEqual(sanatisedActivity, activityDoc1);
      sinon.restore();
    });
    it('check send to notion works...', async ()=>{
            // create snapshot

            const snapshotBefore = test.firestore.makeDocumentSnapshot(activityDoc3, "users/"+testNotionDev+testNotionUser+"/activities/"+activityDoc3.sanitised.activity_id+"wahoo");
            const snapshotAfter = test.firestore.makeDocumentSnapshot(activityDoc3, "users/"+testNotionDev+testNotionUser+"/activities/"+activityDoc3.sanitised.activity_id+"wahoo");
            const snapshot = test.makeChange(snapshotBefore, snapshotAfter);
          
            // set up activity in the database
            await admin.firestore()
              .collection("users")
              .doc(testNotionDev+testNotionUser)
              .collection("activities")
              .doc(activityDoc3.sanitised.activity_id+"wahoo")
              .set(activityDoc3);
      
            // stub out/spy got call that send to developer
            const stubbedNotion = sinon.stub(notion, "sendToNotionEndpoint");
            stubbedNotion.onCall().returns("successful value");
            // call sendToDeveloper function
            wrapped = test.wrap(myFunctions.sendToDeveloper);
            await wrapped(snapshot, {params: {userDocId: testNotionDev+testNotionUser,
              messageType: "activities",
              activityId: activityDoc3.sanitised.activity_id+"wahoo"}});
      
            // now check the got call was correct information
            let args = stubbedNotion.getCall(0).args;
            assert.deepEqual(args[0], testNotionDev,
                  "the wrong Notion Dev Id was sent to notion");
            assert.deepEqual(args[2], activityDoc3.sanitised, 
                  "the wrong info was sent to the developer endpoint");
             //now check the database was updated correctly
             const testUserDoc = await admin.firestore()
                .collection("users")
                .doc(testNotionDev+testNotionUser)
                .collection("activities")
                .doc(activityDoc3.sanitised.activity_id+"wahoo")
                .get();
        
             // actual results
             const sanatisedActivity = testUserDoc.data();
             sanatisedActivity.timestamp = "not tested";
             // expected results
             activityDoc3.status = "sent";
             activityDoc3.timestamp = "not tested";
      
            assert.deepEqual(sanatisedActivity, activityDoc3);
            sinon.restore();
      // create snapshot
      // stub out got call that send to developer
      // call sendToDeveloper function
      // check the data sent was correct
      // check the Activity in the database was updated correctly
    });
}); //End TEST
