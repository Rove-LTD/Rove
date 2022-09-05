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
 const CorosService = require("./corosService");
 const contentsOfDotEnvFile = require("../config.json");
 
 const configurations = contentsOfDotEnvFile["config"];
 // find a way to decrypt and encrypt this information
 
const corosService = new CorosService(configurations, "paulsTestDev");

getActivityList();

async function getActivityList() {
  const response = await corosService.getActivityList();
  if (corosService.error) {
    console.log("Error: "+corosService.errorMessage);
  } else {
    console.log(response);
  }
}
