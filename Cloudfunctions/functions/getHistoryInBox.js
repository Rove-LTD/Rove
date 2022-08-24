const admin = require("firebase-admin");
const db = admin.firestore();

const getHistoryInBox = {
  push: async function(provider, userDocId) {
    // TODO: don't write history inbox yet
    // put back in when needed
    const webhookDoc = db.collection("getHistoryInBox").doc();
    /* await webhookDoc
        .set({
          provider: provider,
          userDocId: userDocId,
        }); */
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

module.exports = getHistoryInBox;
