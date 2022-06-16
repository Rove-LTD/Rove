/* eslint-disable require-jsdoc */
/* eslint-disable max-len */
/**
 * Utilities.js contains the main functions and callbacks for triggering
 * a wahoo webhook
 */
 const Url = require("url");
 const crypto = require("crypto");
 const encodeparams = require("../encodeparams");
 const got = require("got");
 const request = require("request");
 const strava = require("strava-v3");
 const WahooService = require("./wahooService");
 const contentsOfDotEnvFile = require("../config.json");
 const filters = require("../data-filter");
 
 const configurations = contentsOfDotEnvFile["config"];
 // find a way to decrypt and encrypt this information
 
const wahooService = new WahooService(configurations, "paulsTestDev");

const userId = "paulsTestDevUser"
const wahooUserId = 3543017
const testWorkout = {
  workout: {
    name: "test workout for Paul",
    workout_token: "out_test_token",
    workout_type_id: "5",
    starts: "2015-08-12T09:00:00.000Z",
    minutes: "12",
  },
};

createWorkout();

async function createWorkout() {
  const response = await wahooService.createWorkout(testWorkout, wahooUserId);
  if (wahooService.error) {
    console.log("Error: "+wahooService.errorMessage);
  } else {
    console.log(response.body);
  }
}
