// Data Collection, Cleaning and Storage Functions:
// by Ben Thompson-Watson
// 24/05/2022
// Wahoo sanatise Function by Paul Ventisei
// 15/06/2022
/* eslint-disable max-len */
/* eslint-disable */
/**
 * Sanatise Error class is used to throw an error message from the
 * sanatise functions
 */
class SanatiseError extends Error {
  /**
   * @param {String} message
   */
  constuctor(message) {
    this.message = message;
  }
}

class standardFormat {
  constructor() {
    let activity_id = null;
    let activity_name = null;
    let activity_type = null;
    let distance = null;
    let avg_speed = null;
    let active_calories = null;
    let activity_duration = null;
    let start_time = null;
    let avg_heart_rate = null;
    let avg_cadence = null;
    let elevation_gain = null;
    let elevation_loss = null;
    let provider = null;
    let version = "1.0";
  }
}

const td = require("tinyduration");

exports.corosSanatise = function (a) {
  try{
    summaryActivity = {
      // standard fields
      "activity_id": a["labelId"],
      "activity_name": "Coros " + corosSportLookup[a.mode][0],
      "activity_type": corosSportLookup[a.mode][1],
      "distance_in_meters": a["distance"],
      "active_calories": a["calorie"],
      "start_time": new Date(a["startTime"]*1000).toISOString(),
      "provider": "coros",
      "average_pace_in_meters_per_second": (a["avgSpeed"]>0 ? 
          (1/(a["avgSpeed"])*1000) :
          0),
      "activity_duration_in_seconds": a["duration"],
      "file": {"url": a["fitUrl"] ?? null}
    }
  } catch (err) {
    throw new Error("Cant sanitise message: "+err.message);
  }
  for (const property in summaryActivity) {
    if (typeof summaryActivity[property] == "undefined") {
      summaryActivity[property] = null;
    }
  }
  return summaryActivity;
}
exports.polarSanatise = function (activity) {
  // standard fields
  summaryActivity = {
    // standard fields
    "activity_id": activity["id"],
    "activity_name": activity["detailed_sport_info"],
    "activity_type": activity["sport"],
    "distance": activity["distance"],
    "active_calories": activity["calories"],
    "start_time": new Date(activity["start_time"]).toISOString(),
    "provider": "polar",
    "avg_speed": null,
    "version": "1.0",
  }
  const duration = td.parse(activity["duration"]);
  let durationInSeconds = 0;
  Object.keys(duration).forEach(function(key,index) {
    switch (key) {
      case "hours":
        durationInSeconds = durationInSeconds + duration[key]*3600;
        break;
      case "minutes":
        durationInSeconds = durationInSeconds + duration[key]*60;
        break;
      case "seconds":
        durationInSeconds = durationInSeconds + duration[key];
        break;
      case "days":
        durationInSeconds = durationInSeconds + duration[key]*3600*24;
        break;
      case "weeks":
        durationInSeconds = durationInSeconds + duration[key]*3600*24*7;
        break;
      case "months":
        durationInSeconds = NaN
        break;
      case "years":
        durationInSeconds = NaN;
        break;
    }
  });
  summaryActivity.activity_duration = durationInSeconds;
  if (activity["heart_rate"]["average"] != undefined) {
    // deal with the fact that some don't have hr
    summaryActivity.avg_heart_rate =
        activity["heart_rate"]["average"];
    summaryActivity.max_heart_rate_bpm =
        activity["heart_rate"]["maximum"];
  } else {
    summaryActivity.avg_heart_rate = null;
    summaryActivity.max_heart_rate_bpm = null;
  };
  summaryActivity.avg_cadence = null;
  summaryActivity.elevation_gain = null;
  summaryActivity.elevation_loss = null;
  for (const property in summaryActivity) {
    if (typeof summaryActivity[property] == "undefined") {
      summaryActivity[property] = null;
    }
  };
  return summaryActivity;
}
exports.stravaSanitise = function(activities) {
  let summaryActivities = [{}];

  for (let i=0; i<activities.length; i++) {
      summaryActivity = {
      "activity_id" : activities[i]["id"],
      "activity_name" : activities[i]["name"],
      "activity_type" : activities[i]["type"],
      "distance" : Math.round(activities[i]["distance"]),
      "avg_speed" : parseFloat(activities[i]["average_speed"]).toFixed(1),
      "active_calories" : Math.round(activities[i]["kilojoules"]),
      "activity_duration" : activities[i]["moving_time"],
      "start_time" : new Date(activities[i]["start_date_local"]).toISOString(),
      "avg_heart_rate" : activities[i]["average_heartrate"],
      "avg_cadence" : parseFloat(activities[i]["average_cadence"]).toFixed(1),
      "elevation_gain" : parseFloat(activities[i]["elev_high"]).toFixed(1),
      "elevation_loss" : parseFloat(activities[i]["elev_low"]).toFixed(1),
      "provider" : "strava",
      "version": "1.0"
      };
      for (const property in summaryActivity) {
          if (typeof summaryActivity[property] == "undefined") {
              summaryActivity[property] = null;
          }
      }
      summaryActivities[i] = summaryActivity
  }
  return summaryActivities;
}
exports.garminSanitise = function(activities) {
    let summaryActivities = [{}];
    for (let i=0; i<activities.length; i++) {
      let summaryActivity = {};
        if (activities[i]["activityType"] == "RUNNING") {
            summaryActivity = {
            "activity_id" : activities[i]["activityId"],
            "activity_name": activities[i]["activityName"],
            "activity_type": activities[i]["activityType"],
            "distance" : Math.round(activities[i]["distanceInMeters"]),
            "avg_speed" : parseFloat(activities[i]["averageSpeedInMetersPerSecond"]).toFixed(1),
            "active_calories": Math.round(activities[i]["activeKilocalories"]),
            "activity_duration": activities[i]["durationInSeconds"],
            "start_time": new Date(activities[i]["startTimeInSeconds"]*1000).toISOString(),
            "avg_heart_rate": activities[i]["averageHeartRateInBeatsPerMinute"],
            "avg_cadence": parseFloat(activities[i]["averageRunCadenceInStepsPerMinute"]).toFixed(1),
            "elevation_gain": parseFloat(activities[i]["totalElevationGainInMeters"]).toFixed(1),
            "elevation_loss" : parseFloat(activities[i]["totalElevationLossInMeters"]).toFixed(1),
            "provider" : "garmin",
            "version": "1.0",
            };
        }
        else if (activities[i]["activityType"] == "CYCLING") {
            summaryActivity = {
                "activity_id" : activities[i]["activityId"],
                "activity_name": activities[i]["activityName"],
                "activity_type": activities[i]["activityType"],
                "distance" : Math.round(activities[i]["distanceInMeters"]),
                "avg_speed" : parseFloat(activities[i]["averageSpeedInMetersPerSecond"]).toFixed(1),
                "active_calories": Math.round(activities[i]["activeKilocalories"]),
                "activity_duration": activities[i]["durationInSeconds"],
                "start_time": new Date(activities[i]["startTimeInSeconds"]*1000).toISOString(),
                "avg_heart_rate": activities[i]["averageHeartRateInBeatsPerMinute"],
                "avg_cadence": null,
                "elevation_gain": parseFloat(activities[i]["totalElevationGainInMeters"]).toFixed(1),
                "elevation_loss" : parseFloat(activities[i]["totalElevationLossInMeters"]).toFixed(1),
                "provider" : "garmin",
                "version": "1.0",
                };
        }
        else if (activities[i]["activityType"] == "LAP_SWIMMING") {
            summaryActivity = {
                "activity_id" : activities[i]["activityId"],
                "activity_name": activities[i]["activityName"],
                "activity_type": activities[i]["activityType"],
                "distance" : Math.round(activities[i]["distanceInMeters"]),
                "avg_speed" : parseFloat(activities[i]["averageSpeedInMetersPerSecond"]).toFixed(1),
                "active_calories": Math.round(activities[i]["activeKilocalories"]),
                "activity_duration": activities[i]["durationInSeconds"],
                "start_time": new Date(activities[i]["startTimeInSeconds"]*1000).toISOString(),
                "avg_heart_rate": activities[i]["averageHeartRateInBeatsPerMinute"],
                "avg_cadence": parseFloat(activities[i]["averageSwimCadenceInStrokesPerMinute"]).toFixed(1),
                "elevation_gain": null,
                "elevation_loss" : null,
                "provider" : "garmin",
                "version": "1.0",
                };
        } else {
            summaryActivity = {
                "activity_id" : activities[i]["activityId"],
                "activity_name": activities[i]["activityName"],
                "activity_type": activities[i]["activityType"],
                "distance" : Math.round(activities[i]["distanceInMeters"]),
                "avg_speed" : null,
                "active_calories": Math.round(activities[i]["activeKilocalories"]),
                "activity_duration": activities[i]["durationInSeconds"],
                "start_time": new Date(activities[i]["startTimeInSeconds"]*1000).toISOString(),
                "avg_heart_rate": activities[i]["averageHeartRateInBeatsPerMinute"],
                "max_heart_rate_bpm": activities[i]["maxHeartRateInBeatsPerMinute"],
                "avg_cadence": null,
                "elevation_gain": null,
                "elevation_loss" : null,
                "provider" : "garmin",
                "version": "1.0",
                };
        }
        for (const property in summaryActivity) {
            if (typeof summaryActivity[property] == "undefined") {
            summaryActivity[property] = null;
            }
        }
        summaryActivity.distance = summaryActivity.distance || null;
        summaryActivities[i] = summaryActivity
    }
    return summaryActivities
}
exports.wahooSanitise = function (activity) {
  let summaryActivity = {};
  if (activity.event_type == "workout_summary") {
    summaryActivity = {
    "activity_id": activity.workout_summary.id,
    "activity_name": activity.workout_summary.workout.name,
    "activity_type":  wahooWorkoutType[activity.workout_summary.workout.workout_type_id], // TODO: complete the sanitisation.
    "distance": activity.workout_summary.distance_accum, //checkunits
    "avg_speed" : activity.workout_summary.speed_avg, //checkunits
    "active_calories": activity.workout_summary.calories_accum,
    "activity_duration": activity.workout_summary.duration_total_accum,
    "start_time" : activity.workout_summary.workout.starts,
    "avg_heart_rate" : activity.workout_summary.heart_rate_avg,
    "avg_cadence" : activity.workout_summary.cadence_avg,
    "elevation_gain" : activity.workout_summary.ascent_accum,
    "elevation_loss": null,
    "provider" : "wahoo",
    // --------TODO: Here is additional data we need to agree on -------
    "power_bike_tss_last": activity.workout_summary.power_bike_tss_last,
    "ascent_accum": activity.workout_summary.ascent_accum,
    "power_bike_np_last": activity.workout_summary.power_bike_np_last,
    "duration_paused_accum": activity.workout_summary.duration_paused_accum,
    "created_at": activity.workout_summary.created_at,
    "updated_at": activity.workout_summary.updated_at,
    "power_avg": activity.workout_summary.power_avg,
    "file": activity.workout_summary.file ?? "",
    "version": "1.0",
    };
  } else if (activity.hasOwnProperty("workout_summary")) {
    if (activity.workout_summary == null) {
      summaryActivity = {"activity_name": activity.name,};
    } else {
    summaryActivity = {
      "activity_id": activity.workout_summary.id,
      "activity_name": activity.name,
      "activity_type":  wahooWorkoutType[activity.workout_type_id], // TODO: complete the sanitisation.
      "distance": activity.workout_summary.distance_accum, //checkunits
      "avg_speed" : activity.workout_summary.speed_avg, //checkunits
      "active_calories": activity.workout_summary.calories_accum,
      "activity_duration": activity.workout_summary.duration_total_accum,
      "start_time" : activity.starts,
      "avg_heart_rate" : activity.workout_summary.heart_rate_avg,
      "avg_cadence" : activity.workout_summary.cadence_avg,
      "elevation_gain" : activity.workout_summary.ascent_accum,
      "elevation_loss": null,
      "provider" : "wahoo",
      // --------TODO: Here is additional data we need to agree on -------
      "power_bike_tss_last": activity.workout_summary.power_bike_tss_last,
      "ascent_accum": activity.workout_summary.ascent_accum,
      "power_bike_np_last": activity.workout_summary.power_bike_np_last,
      "duration_paused_accum": activity.workout_summary.duration_paused_accum,
      "created_at": activity.workout_summary.created_at,
      "updated_at": activity.workout_summary.updated_at,
      "power_avg": activity.workout_summary.power_avg,
      "file": activity.workout_summary.files[0].url ?? "",
      "version": "1.0",
      };}
  } else {
    // we dont recognise this event type yet
    throw new SanatiseError("don't recognise the wahoo event_type: "+activity.event_type);
  }

  return summaryActivity;
}
/**
 * @param {Map} sanitisedActivity
 * @return {Map} compressedSanitisedActivity
 */
exports.compressSanitisedActivity = function(sanitisedActivity) {
  const compressedSanitisedActivity = sanitisedActivity;
  return compressedSanitisedActivity;
}
/**
 * @param {Map} compressedSanitisedActivity
 * @return {Map} sanitisedActivity
 */
 exports.uncompressSanitisedActivity = function(compressedSanitisedActivity) {
  const sanitisedActivity = compressedSanitisedActivity;
  return sanitisedActivity;
}
const wahooWorkoutType = { 
  0:	"BIKING",
  1: "RUNNING",
  2: "FE",
  3: "RUNNING_TRACK",
  4: "RUNNING_TRAIL",
  5: "RUNNING_TREADMILL",	
  6: "WALKING",
  7: "WALKING_SPEED",
  8: "WALKING_NORDIC",
  9: "HIKING",
  10: "MOUNTAINEERING",
  11: "BIKING_CYCLECROSS",
  12: "BIKING_INDOOR",
  13: "BIKING_MOUNTAIN",	
  14: "BIKING_RECUMBENT",
  15: "BIKING_ROAD",
  16: "BIKING_TRACK",
  17: "BIKING_MOTOCYCLING",
  18: "FE_GENERAL",
  19: "FE_TREADMILL",
  20: "FE_ELLIPTICAL",
  21: "FE_BIKE",
  22: "FE_ROWER",
  23: "FE_CLIMBER",
  25: "SWIMMING_LAP",
  26: "SWIMMING_OPEN_WATER",
  27: "SNOWBOARDING",
  28: "SKIING",
  29: "SKIING_DOWNHILL",
  30: "SKIINGCROSS_COUNTRY",
  31: "SKATING",
  32: "SKATING_ICE",
  33:	"SKATING_INLINE",
  34:	"LONG_BOARDING",
  35:	"SAILING",
  36:	"WINDSURFING",
  37:	"CANOEING",
  38:	"KAYAKING",	
  39:	"ROWING",
  40:	"KITEBOARDING",
  41:	"STAND_UP_PADDLE_BOARD",
  42:	"WORKOUT",
  43:	"CARDIO_CLASS",
  44:	"STAIR_CLIMBER",	
  45:	"WHEELCHAIR",
  46:	"GOLFING",
  47:	"OTHER",
  49:	"BIKING_INDOOR_CYCLING_CLASS",
  56:	"WALKING_TREADMILL",
  61:	"BIKING_INDOOR_TRAINER",	
  62:	"MULTISPORT",
  63:	"TRANSITION",
  64:	"EBIKING",
  65:	"TICKR_OFFLINE",
  66:	"YOGA",
  255:"UNKNOWN",}
// sports lookup with {mode: [name, submode]} //ignoring submodes for now...
const corosSportLookup = {
  8:	["Run", 	1],	
  9:	["Bike", 	1],
  10:	["Swimming", 	1],
  13:	["Multisport",	1],
  14:	["Mountaineering", 	1],	
  15:	["Trail Run", 	1],
  16:	["Hike", 	1],
  18:	["Cardio", 	1],	
  19:	["XC Ski", 	1],
  20:	["Track Run", 1],
  21:	["Ski", 1	],	
  22:	["Pilot", 1],
  23:	["Strength", 2],
  24:	["Rowing", 	1],
  25:	["Whitewater", 1],
  26:	["Flatwater", 	1],
  27:	["Windsurfing", 	1],
  28:	["Speedsurfing", 	1],
  29:	["Ski Touring", 	1],
  31:	["Walk", 1],}
  