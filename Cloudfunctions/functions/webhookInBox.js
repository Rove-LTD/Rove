const admin = require("firebase-admin");
const db = admin.firestore();

const webhookInBox = {
  push: async function(request, provider) {
    const webhookDoc = db.collection("webhookInBox").doc();
    await webhookDoc
        .set({
          provider: provider,
          status: "new",
          method: request.method,
          body: JSON.stringify(request.body),
        });
    return webhookDoc;
  },
  delete: async function(webhookDoc) {
    await webhookDoc.delete();
  },
  writeError: async function(webhookDoc, error) {
    console.log(error.message);
    await webhookDoc.set({status: "error: "+error.message}, {merge: true});
  },
};

module.exports = webhookInBox;
