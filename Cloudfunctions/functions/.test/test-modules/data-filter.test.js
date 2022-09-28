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
const test = require('firebase-functions-test')(firebaseConfig, testParameters.testKeyFile);
const admin = require("firebase-admin");
filter = require('../../data-filter.js');
const fs = require('fs').promises;

// -----------END INITIALISE ROVE TEST PARAMETERS----------------------------//

// ---------REQUIRE FUNCTONS TO BE STUBBED----------------------//
// include the functions that we are going to be stub in the
// testing processes - these have to have the same constant
// name as in the function we are testing

//-------------TEST --- webhooks-------
describe("Testing that the data filters sanitisations work: ", () => {
    it('Wahoo Cycle', () => {
      // set the request object with the correct provider, developerId and userId

      output = filter.wahooSanitise(wahooInput1);
      assert.deepEqual(output, ExpWahooInput1);

    });
    it('Garmin Sleep', () => {
      output = filter.garminSleepSanitise(garminSleepInput);
      assert.deepEqual(output, expGarminSleepInput)
    });
    it('Garmin Dailies', () => {
      output = filter.garminDailiesSanitise(garminDailyInput);
      assert.deepEqual(output, expGarminDailyInput)
    });

}); //End TEST

const wahooInput1 =  JSON.parse('{"user":{"id":"wahoo_test_user"},"event_type":"workout_summary","workout_summary":{"duration_active_accum":"9.0","workout":{"name":"Cycling","workout_token":"ELEMNT AE48:274","workout_type_id":0,"id":147564736,"updated_at":"2022-06-13T16:39:08.000Z","plan_id":null,"minutes":0,"starts":"2022-06-13T16:38:51.000Z","created_at":"2022-06-13T16:39:08.000Z"},"speed_avg":"0.0","duration_total_accum":"9.0","cadence_avg":"0.0","id":140473420,"work_accum":"0.0","power_bike_tss_last":null,"ascent_accum":"2.0","power_bike_np_last":null,"duration_paused_accum":"0.0","created_at":"2022-06-13T16:39:09.000Z","updated_at":"2022-06-13T16:39:09.000Z","power_avg":"0.0","file":{"url":"https://cdn.wahooligan.com/wahoo-cloud/production/uploads/workout_file/file/WpHvKL3irWsv2vHzGzGF_Q/2022-06-13-163851-ELEMNT_AE48-274-0.fit"},"distance_accum":"0.0","heart_rate_avg":"0.0","calories_accum":"0.0"},"webhook_token":"348a6fe2-3719-4647-a233-933b8c404d6b"}');

const ExpWahooInput1 = {
  activity_id: 147564736,
  activity_name: "Cycling",
  activity_type: "CYCLING",
  distance: 0,
  avg_speed: 0,
  active_calories: 0,
  activity_duration: 9.0,
  start_time: "2022-06-13T16:38:51.000Z",
  avg_heart_rate: 0,
  avg_cadence: 0,
  elevation_gain: 2,
  elevation_loss: null,
  provider: "wahoo",
  version: "1.0",
};

const wahooInput2 =  JSON.parse('{"user":{"id":"wahoo_test_user"},"event_type":"workout_summary","workout_summary":{"duration_active_accum":"9.0","workout":{"name":"Cycling","workout_token":"ELEMNT AE48:274","workout_type_id":0,"id":147564736,"updated_at":"2022-06-13T16:39:08.000Z","plan_id":null,"minutes":0,"starts":"2022-06-13T16:38:51.000Z","created_at":"2022-06-13T16:39:08.000Z"},"speed_avg":"0.0","duration_total_accum":"9.0","cadence_avg":"0.0","id":1234,"work_accum":"0.0","power_bike_tss_last":null,"ascent_accum":"0.0","power_bike_np_last":null,"duration_paused_accum":"0.0","created_at":"2022-06-13T16:39:09.000Z","updated_at":"2022-06-13T16:39:09.000Z","power_avg":"0.0","file":{"url":"https://cdn.wahooligan.com/wahoo-cloud/production/uploads/workout_file/file/WpHvKL3irWsv2vHzGzGF_Q/2022-06-13-163851-ELEMNT_AE48-274-0.fit"},"distance_accum":"0.0","heart_rate_avg":"0.0","calories_accum":"0.0"},"webhook_token":"348a6fe2-3719-4647-a233-933b8c404d6b"}')

const garminSleepInput = JSON.parse('[{"summaryId": "EXAMPLE_567890", "calendarDate": "2016-01-10", "durationInSeconds": 15264, "startTimeInSeconds": 1452419581, "startTimeOffsetInSeconds": 7200, "unmeasurableSleepDurationInSeconds": 0, "deepSleepDurationInSeconds": 11231, "lightSleepDurationInSeconds": 3541, "remSleepInSeconds": 0, "awakeDurationInSeconds": 492, "sleepLevelsMap": {"deep": [ {"startTimeInSeconds": 1452419581,"endTimeInSeconds": 1452478724}], "light": [{"startTimeInSeconds": 1452478725,"endTimeInSeconds": 1452479725}, {"startTimeInSeconds": 1452481725,"endTimeInSeconds": 1452484266} ]},"validation": "DEVICE"}]')
const expGarminSleepInput = [{
  "date": "2016-01-10",
  "deep": 11231,
  "duration": 15264,
  "id": "EXAMPLE_567890",
  "light": 3541,
  "rem": 0,
  "startTime": 1452419581,
  "unmeasurable": 0,
}];
const garminDailyInput = JSON.parse('[{"summaryId": " EXAMPLE_67891", "calendarDate": "2016-01-11", "activityType": "WALKING", "activeKilocalories": 321, "bmrKilocalories": 1731, "steps": 4210, "distanceInMeters": 3146.5, "durationInSeconds": 86400, "activeTimeInSeconds": 12240, "startTimeInSeconds": 1452470400, "startTimeOffsetInSeconds": 3600, "moderateIntensityDurationInSeconds": 81870, "vigorousIntensityDurationInSeconds": 4530, "floorsClimbed": 8, "minHeartRateInBeatsPerMinute": 59, "averageHeartRateInBeatsPerMinute": 64, "maxHeartRateInBeatsPerMinute": 112, "timeOffsetHeartRateSamples": {"15": 75, "30": 75, "3180": 76, "3195": 65, "3210": 65, "3225": 73, "3240": 74, "3255": 74},"averageStressLevel": 43, "maxStressLevel": 87, "stressDurationInSeconds": 13620, "restStressDurationInSeconds": 7600, "activityStressDurationInSeconds": 3450, "lowStressDurationInSeconds": 6700, "mediumStressDurationInSeconds": 4350, "highStressDurationInSeconds": 108000, "stressQualifier": "stressful_awake", "stepsGoal": 4500, "intensityDurationGoalInSeconds": 1500, "floorsClimbedGoal": 18}]')
const expGarminDailyInput = [{
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
}];