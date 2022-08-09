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
const polarService = new PolarService(configurations, "roveTestSecrets");

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
  console.log("commands are: getWebhooks, createWebhooks");
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
