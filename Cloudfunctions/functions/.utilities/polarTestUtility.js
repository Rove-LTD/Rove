/* eslint-disable max-len */
/**
 * Utilities.js contains the main functions and callbacks for triggering
 * a wahoo webhook
 */
 const PolarService = require("./polarService");
 const contentsOfDotEnvFile = require("../config.json");
 
 const configurations = contentsOfDotEnvFile["config"];
 // find a way to decrypt and encrypt this information

const args = process.argv
let lookup;
if (args[3] == "live") {
  lookup = "roveLiveSecrets";
} else {
  lookup = "roveTestSecrets";
}
const polarService = new PolarService(configurations, lookup);

if (args.length > 2){
  switch (args[2]) {
    case "getWebhooks":
      getWebhooks();
      break;
    case "createWebhook":
      createWebhook(args[3]);
      break;
  }
} else {
  console.log("usage: \ngetWebhooks <live/test> - get webhooks for the test or live environment \ncreateWebhooks - create webhook for the test environment");
}

async function getWebhooks() {
  const response = await polarService.getWebhooks();
  if (polarService.error) {
    console.log("Error: "+polarService.errorMessage);
  } else {
    console.log(response);
  }
}

async function createWebhook(project) {
  const response =
      await polarService
          .createWebhook("https://us-central1-"+project+".cloudfunctions.net/polarWebhook");
  if (polarService.error) {
    console.log("Error: "+polarService.errorMessage);
  } else {
    console.log(response);
  }
}
