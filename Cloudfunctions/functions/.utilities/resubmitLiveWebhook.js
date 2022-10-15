/* eslint-disable max-len */
/**
 * resubmits webhook messages for re-processing by reading and 
 * rewriting the webhooks that have had an error in their processing
 * useage:  retryWebhook <webhookId>
 */
 const contentsOfDotEnvFile = require("../config.json");
 const { cert } = require('firebase-admin/app');
 const admin = require('firebase-admin');
 
 const configurations = contentsOfDotEnvFile["config"];
 const serviceAccount =
    require( "../.test/keys/rove-26-firebase-adminsdk-tumx0-e07495715d.json");

 admin.initializeApp({
  credential: cert(serviceAccount),
 });
 const db = admin.firestore();
 // find a way to decrypt and encrypt this information

const args = process.argv
let docId = args[2];

resubmitWebhookInBox(docId);

async function resubmitWebhookInBox(docId) {
  try{
    webhookDoc = await db.collection("webhookInBox").doc(docId).get();
  } catch (err) {
    console.log("couldn't read webhookInBox: "+err.message);
    console.log("please include a valid document Id as an argument to this comand");
    return;
  }
  try{
    docToReWrite = webhookDoc.data();
    docToReWrite.status = "retry";
    newDoc = db.collection("webhookInBox").doc()
    newDoc.create(webhookDoc.data());
  } catch (err) {
    console.log("couldn't create the new webhookInBox record: "+err.message);
  }
  console.log("webhookInBox document: "+docId+" resubmitted as: "+newDoc.id)
  return;
}



