// Follow the instructions in README.md for running these tests.
// Visit https://firebase.google.com/docs/functions/unit-testing to learn more
// about using the `firebase-functions-test` SDK.

// -----------------------COMMON TEST SETUP---------------------------//
// Chai is a commonly used library for creating unit test suites. It is easily 
// extended with plugins.
const chai = require('chai');
const assert = chai.assert;
const fs = require('fs').promises;

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
const stravaApi = require("strava-v3");
// const response = require('./getActivityResponses');
// const OauthWahoo = require("../../oauthWahoo.js");

// import {stravaResponse, garminResponse} from './getActivityResponses'
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
            "wahoo_access_token": "8rrxrPBKmf38DVO5Obo7ul4xjUGqvVjwjxX3n9nyob0",
            "wahoo_refresh_token": "EoHcXrqpHpvRyT6EGNzzEk0ljVCMe2j7cVcruDxujEY",
            "wahoo_token_expires_at":new Date()/1000+36000,
            "wahoo_token_expires_in": "7200",
            "polar_user_id": "polar_test_user",
            "polar_access_token": "d717dd39d09b91939f835d66a640927d",
            "strava_id" : "12972711",
            "strava_access_token": "6e6e55d80adfb1af30a7c5a372b107472b751173",
            "strava_refresh_token": "077e305b5af2ed1667fa5406aec491b31ba50b5d",
            "strava_token_expires_at": "1659274746",
            "garmin_access_token" :"58362aa6-f71c-499f-b0c6-a46371278298",
            "garmin_access_token_secret": "HQ0o8k9gxNsULie2MknQDfY494fZ2Q5gh9T"
        }, {merge: true});
  
        activityDocs = await admin.firestore()
            .collection("users")
            .doc(testDev+testUser)
            .collection("activities")
            .get();
        
        activityDocs.forEach(async (doc)=>{
            await doc.ref.delete();
        });
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
  it.skip('Internal requests should return a list of activities from db...', async () => {
    // set the request object with the correct provider, developerId and userId
    const req = {
        url: 'https://us-central1-rovetest-beea7.cloudfunctions.net/getActivityList?devId='+testDev+'&userId='+testUser+'&devKey=test-key&start='+startTime+'&end='+endTime,
    };
    res = {
        send: (JSON)=> {assert.equal(JSON, "OK");},
        status: (code)=>{assert.equal(code, 400);},
    }


    await myFunctions.getActivityList(req, res);
    const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
    await wait(1000);
    //now check the database was updated correctly
   const testUserDocs = await admin.firestore()
   .collection("users")
   .doc(testDev+testUser)
   .collection("activities").where("sanitised.start_time", ">", "2022-07-22T05:15:33.000Z").where("sanitised.start_time", "<", "2022-07-23T09:15:33.000Z")
   .get();

   const sanatisedActivity = testUserDocs.docs[0].data();
   const expectedResults = {
    raw: {},
    sanitised: {
    "start_time": startTime,
    "userId": testUser,
    "activity_name": "TestActivity"
    }
    }

   assert.deepEqual(sanatisedActivity, expectedResults);
})
it('Check that activities are correctly sanitised and concatonated...', async () => {
    // set the request object with the correct provider, developerId and userId
    const req = {
        url: 'https://us-central1-rovetest-beea7.cloudfunctions.net/getActivityList?devId='+testDev+'&userId='+testUser+'&devKey=test-key&start=2022-07-27T09:15:33.000Z&end=2022-07-29T09:15:33.000Z',
    };
    // set the fitFile example for polar
    const file = await fs.readFile(".test/test-modules/wahooFitExample.fit");
    const fitFileBuffer = new Buffer.from(file);
    const fitFileResponse = {
      statusCode: 200,
      rawBody: fitFileBuffer,
    }
    // let expectedResult = require("./expectedResult.json");
    // let expectedResult;
    let expectedResult = require("./expectedResult.json");
    const stubbedStrava = sinon.stub(stravaApi.athlete, "listActivities");
    stubbedStrava.onFirstCall().returns(stravaResponse);
    const stubbedGot = sinon.stub(got, "get");
    stubbedGot.withArgs(sinon.match({url: 'https://apis.garmin.com/wellness-api/rest/activities?uploadStartTimeInSeconds=1658913333&uploadEndTimeInSeconds=1658999733'})).returns(garminResponse1);
    stubbedGot.withArgs(sinon.match({url: "https://apis.garmin.com/wellness-api/rest/activities?uploadStartTimeInSeconds=1658999733&uploadEndTimeInSeconds=1659086133"})).returns(garminResponse2);
    stubbedGot.withArgs(sinon.match({url: "https://api.wahooligan.com/v1/workouts"})).returns(wahooResponse);
    stubbedGot.withArgs(sinon.match({url: "https://www.polaraccesslink.com/v3/exercises"})).returns(polarResponse);
    stubbedGot.returns(fitFileResponse);
    res = {
        send: (JSON)=> {assert.equal(JSON, "OK");},
        status: (code)=>{assert.equal(code, 200);},
    }

    await myFunctions.getActivityList(req, res);

    const gotCalls = stubbedGot.callCount;
    assert.equal(gotCalls, 5, "too many or too few calls to 'GOT'");
/*     for (let i=0; i < gotCalls; i++) {
      const args = stubbedGot.getCall(i).args
      console.log("arg "+i+": "+JSON.stringify(args));
    } */
    const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
    await wait(1000);

    //now check the database was updated correctly
    const testUserActivities = await admin.firestore()
    .collection("users")
    .doc(testDev+testUser)
    .collection("activities")
    .get();

    const numOfDocs = testUserActivities.docs.length
    // cant check called with the right arguments as signiture is always different
    assert.deepEqual(numOfDocs, (expectedResult.length+1));
    sinon.restore();
})
});

const polarResponse = {body: '[{"id":"ymeoBNZw","upload_time":"2022-07-28T12:27:50Z","polar_user":"https://www.polaraccesslink.com/v3/users/45395466","device":"Polar Flow app","start_time":"2022-07-28T13:27:37","start_time_utc_offset":60,"duration":"PT6.705S","distance":10.0,"heart_rate":{},"sport":"RUNNING","has_route":true,"detailed_sport_info":"RUNNING"}]'};

const wahooResponse = {body: '{"workouts":[{"id":161442834,"starts":"2022-07-28T12:17:26.000Z","minutes":0,"name":"Cycling","plan_id":null,"workout_token":"ELEMNT AE48:289","workout_type_id":0,"workout_summary":{"id":153936466,"ascent_accum":"70.0","calories_accum":"540.0","cadence_avg":"87.38","distance_accum":"19636.47","duration_active_accum":"2057.0","duration_paused_accum":"29.0","duration_total_accum":"2086.0","heart_rate_avg":"0.0","power_avg":"263.0","power_bike_np_last":"281.0","power_bike_tss_last":"48.9","speed_avg":"5.15","files":[{"url":"https://cdn.wahooligan.com/wahoo-cloud/production/uploads/workout_file/file/7IrvLZe89WV4QuaEcaCaWA/2022-05-08-080131-ELEMNT_AE48-260-0.fit"}],"created_at":"2022-05-08T11:31:43.000Z","updated_at":"2022-05-11T18:43:01.000Z"},"created_at":"2022-05-08T11:31:43.000Z","updated_at":"2022-05-08T11:31:43.000Z"}],"total":286,"page":1,"per_page":30,"order":"descending","sort":"starts"}'
};
const garminResponse1 = {body: '[{"summaryId":"9291942331","activityId":9291942331,"activityName":"Bedford Running","durationInSeconds":1939,"startTimeInSeconds":1659017697,"startTimeOffsetInSeconds":3600,"activityType":"RUNNING","averageHeartRateInBeatsPerMinute":139,"averageRunCadenceInStepsPerMinute":161.01562,"averageSpeedInMetersPerSecond":3.237,"averagePaceInMinutesPerKilometer":5.1488004,"activeKilocalories":407,"deviceName":"forerunner735xt","distanceInMeters":6276.64,"maxHeartRateInBeatsPerMinute":162,"maxPaceInMinute":61.5,"averageSpeedInMetersPerSecond":3.257,"averagePaceInMinutesPerKilometer":5.1171837,"activeKilocalories":630,"deviceName":"forerunner735xt","distanceInMeters":9960.81,"maxHeartRateInBeatsPerMinute":156,"maxPaceInMinutesPerKilometer":4.432624,"maxRunCadenceInStepsPerMinute":172.0,"maxSpeedInMetersPerSecond":3.76,"startingLatitudeInDegree":52.1348465513438,"startingLongitudeInDegree":-0.45787931419909,"steps":8226,"totalElevationGainInMeters":29.151274,"totalElevationLossInMeters":25.90904}]'};
const garminResponse2 = {body: '[{"summaryId":"9291942332","activityId":9291942332,"activityName":"Bedford Running","durationInSeconds":1939,"startTimeInSeconds":1659017697,"startTimeOffsetInSeconds":3600,"activityType":"RUNNING","averageHeartRateInBeatsPerMinute":139,"averageRunCadenceInStepsPerMinute":161.01562,"averageSpeedInMetersPerSecond":3.237,"averagePaceInMinutesPerKilometer":5.1488004,"activeKilocalories":407,"deviceName":"forerunner735xt","distanceInMeters":6276.64,"maxHeartRateInBeatsPerMinute":162,"maxPaceInMinute":61.5,"averageSpeedInMetersPerSecond":3.257,"averagePaceInMinutesPerKilometer":5.1171837,"activeKilocalories":630,"deviceName":"forerunner735xt","distanceInMeters":9960.81,"maxHeartRateInBeatsPerMinute":156,"maxPaceInMinutesPerKilometer":4.432624,"maxRunCadenceInStepsPerMinute":172.0,"maxSpeedInMetersPerSecond":3.76,"startingLatitudeInDegree":52.1348465513438,"startingLongitudeInDegree":-0.45787931419909,"steps":8226,"totalElevationGainInMeters":29.151274,"totalElevationLossInMeters":25.90904}]'};


const stravaResponse = [
    {
      resource_state: 2,
      athlete: {
        id: 12972711,
        resource_state: 1,
      },
      name: "Morning Ride",
      distance: 55681.9,
      moving_time: 7252,
      elapsed_time: 7336,
      total_elevation_gain: 268,
      type: "Ride",
      sport_type: "Ride",
      workout_type: null,
      id: 7546870776,
      start_date: "2022-07-29T06:11:25Z",
      start_date_local: "2022-07-29T07:11:25Z",
      timezone: "(GMT+00:00) Europe/London",
      utc_offset: 3600,
      location_city: null,
      location_state: null,
      location_country: "United Kingdom",
      achievement_count: 11,
      kudos_count: 0,
      comment_count: 0,
      athlete_count: 1,
      photo_count: 0,
      map: {
        id: "a7546870776",
        summary_polyline: "ixe}HroxAsBPeAdAmAo@gHxAwETXzRU~@o@JwHcGqOkRaM}KiUwM}Da@sG|@eFeAuJrB_^wFaEd@kAoBoIwDqRyUaMcGy@f@wDnJkFxHy@NmEpBoFtF{ElBqHUoClAaDtCuC`@uA|@{AxCoAzDmC|DuB`Hu@lGkAvCk@j@gIZmDpAq@YqA_H}BqD_C_KeAk]S_@cPzDeVOk@l@}ApEeHtNs@|@m@?oLiNeP{L_OaKgC[mFsBqFcDwCa@yCz@iG_FoCcAmEM_GdB{FQFoIeAgVMgNw@sNNmHw@kFi@qI?cJsDiOyEEm@u@^cK{@aOOiKHaDdBePNeNm@_IqAiGVeTYqA_P{B{LnA}ItDuMfBmEiBaJ_Ki@Qu@~A_FxRs@~@oBTeIkA{Dp@oAjAgEhJoJlEkCrEy@z@wKbDaFj@_I~C{El@kInHoVjQmHfHwJhF{Bb@mG_BeERqJeJcFc@{BeBgB_CqCkImCiCoc@uWoM_EuEgCuWqBgAmEi@uMe@sBiB_BgQoCgNs]gLeKuIyUcTi^}GgN{H_SkCsJsKg[xB_FbD]jAiAtCiLjJuNfEoQtSkd@|AgCbLeIlg@iXbC{Cl@qBpBiP|Ros@tAyAxH{A~G{B\\o@`BuUpHqo@zA{DrFoG~BqErTmaA~DyJ`Oaf@jA}AbDc@lAy@|CgFnFwMr@}@hJr@zLgB|BeBxAkDvB_KlBkFfRoXfE_MjAwHh@aB~BaBtFw@hDuE`AmDpDcUzCiMzB_IlC{FTGvAfB|EpCxEbBvLJlVbIlMTrDp@~IrGlOjEbAb@Pd@MjKTzKGnDq@xE]fHkBtKoClY}B`Kq@`GMdEXrS]~O\\rFlBzOzBd@`@`@bKpn@zB~P\\nKbAlNdDdVtCdMq@xWs@rF}@|PeC~WrFt@^e@XaC^]rEhBpFx@`DeChBkDh@UrIhFjC~@~BDbEcBpCcDhEgCrO}EXl@l@fHZvS~DvEpCpEf@`Bh@lECt@mBnCmElK{AxHXrChBnBRlA{@~c@mAfMuC~QiBbe@cKpy@B~C~HrDZbAkBjNgIxkADx@|N~@nBdEvD|K~HtJnEdJpBzClBrAjFHbLtOzKjSbBfEb@jBT`F\\rBrAhDpDbG|@dFzE~O|@fFf@pAtAdA|GbCt]b_@n\\xb@|XnVlHdLtDnHh@?jAsAvCiFpCoHhAo@nMvGpEnGjLpMnKnDn@x@bC?|\\rFvCMdFaBvFhAzDcAfGRpHhDvJjGjNbMhO|QfEdDj@a@FoGXq@vAs@T{DrDaAlHc@zAuAlAv@hBM",
        resource_state: 2,
      },
      trainer: false,
      commute: false,
      manual: false,
      private: true,
      visibility: "only_me",
      flagged: false,
      gear_id: "b3443885",
      start_latlng: [
        52.13589093647897,
        -0.458331685513258,
      ],
      end_latlng: [
        52.13588900864124,
        -0.45827100053429604,
      ],
      average_speed: 7.678,
      max_speed: 17.691,
      average_cadence: 82.4,
      average_temp: 15,
      average_watts: 186.5,
      max_watts: 546,
      weighted_average_watts: 192,
      kilojoules: 1352.4,
      device_watts: true,
      has_heartrate: true,
      average_heartrate: 133,
      max_heartrate: 152,
      heartrate_opt_out: false,
      display_hide_heartrate_option: true,
      elev_high: 96.4,
      elev_low: 35,
      upload_id: 8047823617,
      upload_id_str: "8047823617",
      external_id: "2022-07-29-061124-ELEMNT AE48-288-0.fit",
      from_accepted_tag: false,
      pr_count: 1,
      total_photo_count: 0,
      has_kudoed: false,
    },
    {
      resource_state: 2,
      athlete: {
        id: 12972711,
        resource_state: 1,
      },
      name: "Afternoon Run",
      distance: 9960.8,
      moving_time: 3057,
      elapsed_time: 3125,
      total_elevation_gain: 17.9,
      type: "Run",
      sport_type: "Run",
      workout_type: null,
      id: 7543780506,
      start_date: "2022-07-28T15:46:19Z",
      start_date_local: "2022-07-28T16:46:19Z",
      timezone: "(GMT+00:00) Europe/London",
      utc_offset: 3600,
      location_city: null,
      location_state: null,
      location_country: "United Kingdom",
      achievement_count: 0,
      kudos_count: 0,
      comment_count: 0,
      athlete_count: 1,
      photo_count: 0,
      map: {
        id: "a7543780506",
        summary_polyline: "wqe}HvlxAL}AVuAXyBXgA\\g@FUZqBNkDRiBNcCL_DLuABiATmBFkA^gEJs@DgAZkCFaAHqACgAPmAAq@PuAHwAVqAB]Le@Zy@Py@FoAVoAJ}@C}BRkAJ]@[OuBGoBK]Ik@AiAMuBy@qE[kCQgCSsBKiBDeBs@_FOsA]_F]iDKk@MwAIc@SmBQkBI{Aa@qCS{CUiCImAMw@[qEWcCq@uCEWGm@A{@e@{FK_CG_@QsBEKG[Ci@m@cFUeC[_CYyDU}ACc@DgAAe@Eg@WcBUoDCk@Kq@CoAS}ACkAQwAGmAMgEKyAGWSk@U]WYm@m@i@_@eAm@}As@MKIU?[FY`AkCpByCzAwBFMBQBi@CyAK{CEwCk@wSIk@GKk@IUDOFcAhA]t@MPMNc@\\aAh@u@d@}@Z_APkAl@[JU@UGa@i@}@iBIKICSBi@P{A`AWHK@SKSYeA{B]k@_@}@E[LcCAs@KQa@_@IEMJk@`AY\\_@^W~AM`@cBpBy@v@OXE`C@xADb@`@hC`@bDAZEPIHeAXSBGAQLo@bAKh@?bAERCDKHKDcAX_Ab@Yb@c@bAGJqAbAwBlBWZANVx@?HEJ?RXfAJx@Dp@ClABnAJLJXn@FJFHLbAvCv@rCl@tChA`HxAzJl@fGVfDRfBLtANbAQhADJTRFNNx@`@lD`@xEb@zCl@|F`BvHPj@`@lBVfBt@jDd@rCP|C@tANdBNjDBzBEPKLAVXdAn@zF`@`CLhAd@|BfA~GTv@RhABZ?RNr@VzCPrABJRXHT^jCp@hGPlCAnBBPFJPLfD~@D?JERQRDHHPh@BBjAb@Tf@X`@ZbAMjDAz@Bp@bAjNRhErAxRF^VhAPrADnCNjAJhBDdBAl@@rBPtF?l@FL\\XLNHBf@?HCp@CXE",
        resource_state: 2,
      },
      trainer: false,
      commute: false,
      manual: false,
      private: true,
      visibility: "only_me",
      flagged: false,
      gear_id: "g9320458",
      start_latlng: [
        52.1348465513438,
        -0.45787931419909,
      ],
      end_latlng: [
        52.13584433309734,
        -0.45822045765817165,
      ],
      average_speed: 3.258,
      max_speed: 4.128,
      average_cadence: 80.7,
      has_heartrate: true,
      average_heartrate: 142.3,
      max_heartrate: 156,
      heartrate_opt_out: false,
      display_hide_heartrate_option: true,
      elev_high: 30.4,
      elev_low: 21.1,
      upload_id: 8044400717,
      upload_id_str: "8044400717",
      external_id: "garmin_push_9291958199",
      from_accepted_tag: false,
      pr_count: 0,
      total_photo_count: 0,
      has_kudoed: false,
    },
    {
      resource_state: 2,
      athlete: {
        id: 12972711,
        resource_state: 1,
      },
      name: "Afternoon Run",
      distance: 6276.6,
      moving_time: 1939,
      elapsed_time: 1943,
      total_elevation_gain: 41.8,
      type: "Run",
      sport_type: "Run",
      workout_type: null,
      id: 7543766964,
      start_date: "2022-07-28T14:14:57Z",
      start_date_local: "2022-07-28T15:14:57Z",
      timezone: "(GMT+00:00) Europe/London",
      utc_offset: 3600,
      location_city: null,
      location_state: null,
      location_country: "United Kingdom",
      achievement_count: 1,
      kudos_count: 0,
      comment_count: 0,
      athlete_count: 1,
      photo_count: 0,
      map: {
        id: "a7543766964",
        summary_polyline: "aue}HnnxA}ATkAHg@HO?_@XSBk@@YTc@@WDmADs@VQXOHe@Bi@AgAPe@Iq@J[CG@GP?pAGvAELGDYAq@PIFKLK\\I^At@@jDGVGLIFK@k@a@}@s@kAw@s@u@c@w@oAeBe@a@o@u@OU]]QK[BEAOGc@]m@}@}@gAw@qA{@w@a@YqAgAW]wAsA]Qw@o@Y[y@q@gAeA_Am@KGWG_@?MJEVYhEK|BGXc@lAE~BLMF@FJFr@TdALbAJ^Hh@v@bCFJR`An@vBNt@Vv@R`At@fC~@dEN`@d@xBnAbEf@hBf@bDd@bCj@~DR~@EJIDk@JoA^_@Rm@Pa@JuAV_Bb@]P[JIFENCt@AdHHhDId@_@|@M^On@E\\?b@F|@Lh@Rb@DPAPIp@KlA[fBOVSN_@LU@WEe@SOAUFKFQTCJ\\~@`BpDh@tA^n@FR|A|Cp@`AN\\nAdDf@~Ad@bAHHP?NKNQj@mA~@sAf@}@Vq@|AuDp@iBRa@|@yBb@oAH_@v@yB\\wAPaA@c@D[Nu@@_@@CVE^y@Ve@@a@CQGU?SBGJE^@NCHGh@gAZeATg@fAcEj@gBJc@X_AfAmEFc@P}@b@oCHw@?WPm@^kBLa@\\]TQJQn@sAH]RqBHgBEmA?uA[eE@]BGhAi@\\[LEREv@?nDGJCRKHWJGTGV?LAPONy@Aq@KyBQuGKgBAaBEM@GX_@Vi@~AGHIL_@FMJEr@C",
        resource_state: 2,
      },
      trainer: false,
      commute: false,
      manual: false,
      private: true,
      visibility: "only_me",
      flagged: false,
      gear_id: "g9320458",
      start_latlng: [
        52.13537427596748,
        -0.45815180987119675,
      ],
      end_latlng: [
        52.13561609387398,
        -0.4581341240555048,
      ],
      average_speed: 3.237,
      max_speed: 4.226,
      average_cadence: 80.5,
      has_heartrate: true,
      average_heartrate: 139.5,
      max_heartrate: 162,
      heartrate_opt_out: false,
      display_hide_heartrate_option: true,
      elev_high: 58.9,
      elev_low: 27,
      upload_id: 8044386085,
      upload_id_str: "8044386085",
      external_id: "garmin_push_9291942331",
      from_accepted_tag: false,
      pr_count: 0,
      total_photo_count: 0,
      has_kudoed: false,
    },
    {
      resource_state: 2,
      athlete: {
        id: 12972711,
        resource_state: 1,
      },
      name: "Afternoon Ride",
      distance: 35518.4,
      moving_time: 4522,
      elapsed_time: 4554,
      total_elevation_gain: 136,
      type: "Ride",
      sport_type: "Ride",
      workout_type: null,
      id: 7538298121,
      start_date: "2022-07-27T15:49:48Z",
      start_date_local: "2022-07-27T16:49:48Z",
      timezone: "(GMT+00:00) Europe/London",
      utc_offset: 3600,
      location_city: null,
      location_state: null,
      location_country: "United Kingdom",
      achievement_count: 2,
      kudos_count: 0,
      comment_count: 0,
      athlete_count: 1,
      photo_count: 0,
      map: {
        id: "a7538298121",
        summary_polyline: "}se}HhnxA|@CHVObGXj`@?vCOjAFXdGMnG}B|F}Al@u@FaAIiLu@kTScAiAs@G_@Bc@hA{AfBmGbDsHzBaHdAaEn@oD@sA_@gA?s@Zc@|@i@j@{@`CgKbAgDz@oB|BgEz@wBtAgGv@eGLwK^sR[{T@_Gb@aPZsGMaEl@yBDaBGkFi@wLJkHc@sCHaAd@}An@oAf@[h@F~@l@n@KjGcEtE}BvB}A`LcMlAqCjAeFT]VRbCnEtDpI`Al@x@OlBeB|EuG`AaC|BqE|AsGb@aApByCrAcDr@Q~CChAh@zA`B\\H^U~JgVp@cETy@jPeZfBaCfKsKpDcHvD_GxJiK`Wg\\`F{ItDyKj@oAvSe\\lF_H|@aCp@cD~BaVdDuK|BcGZqAr@}J|@kCRuAXaKHcOLwB|@mGrDoRvAgEtAyBrAcAbIuDh@o@@m@w@kI[aJEeFXoT|@cBnK{MhAsBRoCNoHl@{HDwCQsJHqJF{Ad@sDC}DLwBjAiG|FsTlCeMr@u@tAAfSrHhB|AnMtPlCjBPEDYj@uIPkGb@{Cj@w@`Ck@R@TZ|@tElBlOOn@mAjAgBnAy@BoFkA}BgAoNyQsBeBoR_HmAIa@J]^}DtQeE|OoAhHQvI]zCMvHLdUy@vHInGI`AYv@iOpSaDoFuE{GkGyFoFgHk@J_AlCe@d@g@P}Hc@mD@_@Mw@y@{DuGcA{B{EuWMuABwCQqH_@wGy@{HYe@q@MeMhAw@MiCgA_@k@_@uAmDoUUm@_@]uBy@_JkAuJzAkDYoCw@cBQkI`AiNtAG`@JjHM|B]dAiApBcBlEwA|EUhBj@rNb@fQKjFDjD|@bOHlC`@xeA?hKG|@u@lCqApDgErHM`AQtFWlD_ArH{@xDmAxCoC|DkAfCgDxKGz@FtCWpAuD~HiAnE_J`UuKhZqNxc@gC~IiBjD}FlI}DzC}CxAYv@PtUE|FLlBjCzId@|BxB`R~@rFdBhNz@lEhE|N`FzNfDpIh@tB@`AkBzGmAvBuLjMgBlAaF~BgFnDq@~@YfBcAhCkApAa@fAIpBBbDj@~JJhIVvCs@fC[zCs@~UAbF`@xTc@fQMtLs@vFqA~FeArCkC~E{@vBy@pCqB`JkAnCq@lHgA~EwDjLsDdJeA|DWrB_@Ta@a@e@wBGeCXmCvAsHP_EGcEeA{Sk@iEoAcDkBqBeA]ULYdH_BtIs@tGQbG@hLi@|DsApGYnCO^UJ",
        resource_state: 2,
      },
      trainer: false,
      commute: false,
      manual: false,
      private: true,
      visibility: "only_me",
      flagged: false,
      gear_id: "b3443885",
      start_latlng: [
        52.13519289158285,
        -0.4581233114004135,
      ],
      end_latlng: [
        52.134966999292374,
        -0.4582077171653509,
      ],
      average_speed: 7.855,
      max_speed: 14.376,
      average_cadence: 81.5,
      average_temp: 16,
      average_watts: 199.3,
      max_watts: 606,
      weighted_average_watts: 204,
      kilojoules: 901.3,
      device_watts: true,
      has_heartrate: true,
      average_heartrate: 130.5,
      max_heartrate: 156,
      heartrate_opt_out: false,
      display_hide_heartrate_option: true,
      elev_high: 83.4,
      elev_low: 22.8,
      upload_id: 8038355014,
      upload_id_str: "8038355014",
      external_id: "2022-07-27-154948-ELEMNT AE48-287-0.fit",
      from_accepted_tag: false,
      pr_count: 0,
      total_photo_count: 0,
      has_kudoed: false,
    },
];