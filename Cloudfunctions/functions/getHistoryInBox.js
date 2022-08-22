const admin = require("firebase-admin");
const db = admin.firestore();

const getHistoryInBox = {
  push: async function(provider, userDocId) {
    const webhookDoc = db.collection("getHistoryInBox").doc();
    await webhookDoc
        .set({
          provider: provider,
          userDocId: userDocId,
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

module.exports = getHistoryInBox;
/* ---------------
const start = new Date(Date.now());
const end = new Date(Date.now() - 30*24*60*60*1000);
await getGarminActivityList(start, end, userDoc);



const recentActivities = await getPolarActivityList(userId);
for (const activity of recentActivities) {
  await saveAndSendActivity(db.collection("users").doc(userId), activity["sanitised"], activity["raw"]); */