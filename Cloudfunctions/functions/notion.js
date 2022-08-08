/* eslint-disable require-jsdoc */
/* eslint-disable max-len */
const {Client} = require("@notionhq/client");

module.exports = {
  sendToNotionEndpoint: async function(endpoint, developerDoc, sanitisedActivity) {
    const devKey = developerDoc.data()["devKey"];
    const notion = new Client({auth: devKey});
    const databaseId = endpoint;
    await formatDatabase();
    await addItem(sanitisedActivity);
    async function addItem(sanitisedActivity) {
      await notion.pages.create({
        // creates a new entry in the database.
        "parent": {
          "type": "database_id",
          "database_id": databaseId,
        },
        "properties": {
          "Name": {
            "title": [
              {
                "text": {
                  "content": sanitisedActivity.activity_name,
                },
              },
            ],
          },
          "Type": {
            "rich_text": [
              {
                "text": {
                  "content": sanitisedActivity.activity_type,
                },
              },
            ],
          },
          "Distance (km)": {
            "number": (sanitisedActivity.distance_in_meters/1000),
          },
          "Average Pace (m/s)": {
            "number": parseInt(sanitisedActivity.average_pace_in_meters_per_second),
          },
          "Calories": {
            "number": sanitisedActivity.active_calories,
          },
          "Duration (mins)": {
            "number": parseInt((sanitisedActivity.activity_duration_in_seconds/60).toFixed(2)),
          },
          "Average HR": {
            "number": sanitisedActivity.average_heart_rate_bpm,
          },
          "Elevation Gain (m)": {
            "number": parseInt(sanitisedActivity.elevation_gain),
          },
          "Elevation Loss (m)": {
            "number": parseInt(sanitisedActivity.elevation_loss),
          },
          "Date": {
            "date": {start: sanitisedActivity.start_time},
          },
          "Data Source": {
            "rich_text": [
              {
                "text": {
                  "content": sanitisedActivity.provider,
                },
              },
            ],
          },
        },
      });
      // console.log(response);
    }
    async function formatDatabase() {
    // adds all the required tags into the database.
      await notion.databases.update({
        "database_id": databaseId,
        "properties": {
          "Name": {
            "title": {},
          },
          "Type": {
            "rich_text": {},
          },
          "Distance (km)": {
            "number": {},
          },
          "Average Pace (m/s)": {
            "number": {},
          },
          "Calories": {
            "number": {},
          },
          "Duration (mins)": {
            "number": {},
          },
          "Average HR": {
            "number": {},
          },
          "Elevation Gain (m)": {
            "number": {},
          },
          "Elevation Loss (m)": {
            "number": {},
          },
          "Date": {
            "date": {},
          },
          "Data Source": {
            "rich_text": {},
          },
        },
      },
      );
    }
  },
};

