/* eslint-disable max-len */
/**
 * Utilities.js contains the main functions and callbacks for triggering
 * a wahoo webhook
 */
const fs = require("fs");
const fitDecoder = require("fit-decoder");
const FitParser = require("fit-file-parser").default;

const args = process.argv

if (args.length == 3){
  fileData = fs.readFileSync(args[2].toString());
  convertFile(fileData);
} else {
  console.log("usage: \ngetWebhooks <live/test> - get webhooks for the test or live environment \ncreateWebhooks - create webhook for the test environment");
}

async function convertFile(fileData) {
  const fitParser = new FitParser({mode: "list"});
  let jsonRaw;
  fitParser.parse(fileData, (error, jsonRaw)=>{
    // Handle result of parse method
    if (error) {
      console.log(error);
    } else {
      console.log(JSON.stringify(jsonRaw));
    }
  });
  const json = fitDecoder.parseRecords(jsonRaw);
  const jsonRaw2 = fitDecoder.fit2json(fileData.buffer);
  console.log(JSON.stringify(jsonRaw2));
}
