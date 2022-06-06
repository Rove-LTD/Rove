// Data Collection, Cleaning and Storage Functions:
// by Ben Thompson-Watson
// 24/05/2022

/* eslint-disable max-len */
/* eslint-disable */

// new_standard_format = {
//     "activity_id" : null,
//     "activity_name" : null,
//     "activity_type" : null,
//     "distance_in_meters" : null,
//     "average_pace_in_meters_per_second" : null,
//     "active_calories" : null,
//     "activity_duration_in_seconds" : null,
//     "start_time" : null,
//     "average_heart_rate_bpm" : null,
//     "average_cadence" : null,
//     "elevation_gain" : null,
//     "elevation_loss" : null,
//     "data_source" : null,
//   }


// Fix NaN fields.....to make them null instead
module.exports = {

  stravaSanitise: function(activities) {
    let summaryActivities = [{}];
    for (let i=0; i<activities.length; i++) {
        summaryActivity = {
        "activity_id" : activities[i]["id"],
        "activity_name" : activities[i]["name"],
        "activity_type" : activities[i]["type"],
        "distance_in_meters" : Math.round(activities[i]["distance"]),
        "average_pace_in_meters_per_second" : parseFloat(activities[i]["average_speed"]).toFixed(1),
        "active_calories" : Math.round(activities[i]["kilojoules"]),
        "activity_duration_in_seconds" : activities[i]["moving_time"],
        "start_time" : new Date(activities[i]["start_date_local"]),
        "average_heart_rate_bpm" : activities[i]["average_heartrate"],
        "average_cadence" : parseFloat(activities[i]["average_cadence"]).toFixed(1),
        "elevation_gain" : parseFloat(activities[i]["elev_high"]).toFixed(1),
        "elevation_loss" : parseFloat(activities[i]["elev_low"]).toFixed(1),
        "data_source" : "strava",
        };
        for (const property in summaryActivity) {
            if (typeof summaryActivity[property] == "undefined" || Number.isNaN(summaryActivity[property])) {
                summaryActivity[property] = null;
            }
        }
        summaryActivities[i] = summaryActivity
    }
    return summaryActivities;
    },
  garminSanitise: function(activities) {

    let summaryActivities = [{}];
    for (let i=0; i<activities.length; i++) {
        if (activities[i]["activityType"] == "RUNNING") {
            summaryActivity = {
            "activity_id" : activities[i]["activityId"],
            "activity_name": activities[i]["activityName"],
            "activity_type": activities[i]["activityType"],
            "distance_in_meters" : Math.round(activities[i]["distanceInMeters"]),
            "average_pace_in_meters_per_second" : parseFloat(activities[i]["averageSpeedInMetersPerSecond"]).toFixed(1),
            "activeKilocalories": Math.round(activities[i]["activeKilocalories"]),
            "activity_duration_in_seconds": activities[i]["durationInSeconds"],
            "start_time": new Date(activities[i]["startTimeInSeconds"]*1000),
            "averageHeartRate": activities[i]["averageHeartRateInBeatsPerMinute"],
            "average_cadence": parseFloat(activities[i]["averageRunCadenceInStepsPerMinute"]).toFixed(1),
            "elevation_gain": parseFloat(activities[i]["totalElevationGainInMeters"]).toFixed(1),
            "elevation_loss" : parseFloat(activities[i]["totalElevationLossInMeters"]).toFixed(1),
            "data_source" : "garmin",
            };
        }
        else if (activities[i]["activityType"] == "CYCLING") {
            summaryActivity = {
                "activity_id" : activities[i]["activityId"],
                "activity_name": activities[i]["activityName"],
                "activity_type": activities[i]["activityType"],
                "distance_in_meters" : Math.round(activities[i]["distanceInMeters"]),
                "average_pace_in_meters_per_second" : parseFloat(activities[i]["averageSpeedInMetersPerSecond"]).toFixed(1),
                "activeKilocalories": Math.round(activities[i]["activeKilocalories"]),
                "activity_duration_in_seconds": activities[i]["durationInSeconds"],
                "start_time": new Date(activities[i]["startTimeInSeconds"]*1000),
                "averageHeartRate": activities[i][i]["averageHeartRateInBeatsPerMinute"],
                "average_cadence": null,
                "elevation_gain": parseFloat(activities[i]["totalElevationGainInMeters"]).toFixed(1),
                "elevation_loss" : parseFloat(activities[i]["totalElevationLossInMeters"]).toFixed(1),
                "data_source" : "garmin",
                };
        }
        else if (activities[i]["activityType"] == "LAP_SWIMMING") {
            summaryActivity = {
                "activity_id" : activities[i]["activityId"],
                "activity_name": activities[i]["activityName"],
                "activity_type": activities[i]["activityType"],
                "distance_in_meters" : Math.round(activities[i]["distanceInMeters"]),
                "average_pace_in_meters_per_second" : parseFloat(activities[i]["averageSpeedInMetersPerSecond"]).toFixed(1),
                "activeKilocalories": Math.round(activities[i]["activeKilocalories"]),
                "activity_duration_in_seconds": activities[i]["durationInSeconds"],
                "start_time": new Date(activities[i]["startTimeInSeconds"]*1000),
                "averageHeartRate": activities[i]["averageHeartRateInBeatsPerMinute"],
                "average_cadence": parseFloat(activities[i]["averageSwimCadenceInStrokesPerMinute"]).toFixed(1),
                "elevation_gain": null,
                "elevation_loss" : null,
                "data_source" : "garmin",
                };
        } else {
            summaryActivity = {
                "activity_id" : activities[i]["activityId"],
                "activity_name": activities[i]["activityName"],
                "activity_type": activities[i]["activityType"],
                "distance_in_meters" : Math.round(activities[i]["distanceInMeters"]),
                "average_pace_in_meters_per_second" : null,
                "activeKilocalories": Math.round(activities[i]["activeKilocalories"]),
                "activity_duration_in_seconds": activities[i]["durationInSeconds"],
                "start_time": new Date(activities[i]["startTimeInSeconds"]*1000),
                "averageHeartRate": activities[i]["averageHeartRateInBeatsPerMinute"],
                "average_cadence": null,
                "elevation_gain": null,
                "elevation_loss" : null,
                "data_source" : "garmin",
                };
        }
        for (const property in summaryActivity) {
            if (typeof summaryActivity[property] == "undefined") {
            summaryActivity[property] = null;
            }
        }
        summaryActivities[i] = summaryActivity
    }
    return summaryActivities
    },
  fitbitSanitise: function(activities) {
    },
  polarSanitise: function(activities) {
    },
  wahooSanitise: function(activities) {
    },
}