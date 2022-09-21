const admin = require("firebase-admin");
const db = admin.firestore();
const storage = admin.storage();

const webhookInBox = {
  push: async function(request, provider, lookups) {
    let body =JSON.stringify(request.body);
    let storageUsed = false;
    const webhookDoc = db.collection("webhookInBox").doc();
    if (body.length > 1048487) {
      body = await storeBody(body, webhookDoc);
      storageUsed = true;
    }
    await webhookDoc
        .set({
          timestamp: new Date().toISOString(),
          provider: provider,
          status: "new",
          method: request.method,
          secret_lookups: lookups || null,
          storage_used: storageUsed,
          body: body,
        });
    return webhookDoc;
  },
  getBody: async function(webhookDoc) {
    let body;
    if (webhookDoc.data()["storage_used"]) {
      const bodyRef = webhookDoc.data()["body"].file;
      // get the data from storage file and replace
      // into the rawBody property
      const bucket = storage.bucket();
      const file = bucket.file(bodyRef);
      body = await file.download();
    } else {
      body = webhookDoc.data()["body"];
    }
    return body;
  },
  delete: async function(webhookDoc) {
    if (webhookDoc.data()["storage_used"]) {
      const bodyRef = webhookDoc.data()["body"].file;
      // delete the data from storage file
      const bucket = storage.bucket();
      const file = bucket.file(bodyRef);
      await file.delete();
    }
    await webhookDoc.ref.delete();
  },
  writeError: async function(webhookDoc, error) {
    console.log(error.message);
    await webhookDoc.ref.set({status: "error: "+error.message}, {merge: true});
  },
};
/**
 *
 * @param {String} body
 * @param {FirebaseFirestore} webhookDoc
 * @return {String} reference
 */
async function storeBody(body, webhookDoc) {
  const bucket = await storage.bucket();
  const file = await bucket.file("webhookBody/"+
      webhookDoc.id);
  const options = {
    resumable: false,
  };
  await file.save(body, options);
  const reference = {"file": file.name};
  return reference;
}

module.exports = webhookInBox;
