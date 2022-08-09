/* eslint-disable max-len */
/**
 * Utilities.js contains the main functions and callbacks for triggering
 * a wahoo webhook
 */
 const PolarService = require("./polarService");
 const contentsOfDotEnvFile = require("../config.json");
 
 const configurations = contentsOfDotEnvFile["config"];
 // find a way to decrypt and encrypt this information
 
const polarService = new PolarService(configurations, "roveLiveSecrets");

getWebhooks();

async function getWebhooks() {
  const response = await polarService.getWebhooks();
  if (polarService.error) {
    console.log("Error: "+polarService.errorMessage);
  } else {
    console.log(response);
  }
}
