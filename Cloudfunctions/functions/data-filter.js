// Data Collection, Cleaning and Storage Functions:
// by Ben Thompson-Watson
// 24/05/2022
// Wahoo sanatise Function by Paul Ventisei
// 15/06/2022

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

/* eslint-disable max-len */
/* eslint-disable */
const {ParseError} = require("got/dist/source");
const td = require("tinyduration");


class standard_format {
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
/*{
    Polar Example Return.
    "id": 1937529874,
    "upload-time": "2008-10-13T10:40:02Z",
    "polar-user": "https://www.polaraccesslink/v3/users/1",
    "transaction-id": 179879,
    "device": "Polar M400",
    "device-id": "1111AAAA",
    "start-time": "2008-10-13T10:40:02Z",
    "start-time-utc-offset": 180,
    "duration": "PT2H44M",
    "calories": 530,
    "distance": 1600,
    "heart-rate": {
      "average": 129,
      "maximum": 147
    },
    "training-load": 143.22,
    "sport": "OTHER",
    "has-route": true,
    "club-id": 999,
    "club-name": "Polar Club",
    "detailed-sport-info": "WATERSPORTS_WATERSKI",
    "fat-percentage": 60,
    "carbohydrate-percentage": 38,
    "protein-percentage": 2
  }*/

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
  wahooWorkoutType = { 
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
    "file": {"url": activity.workout_summary.file},
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

strava_examplar_1 = {
    "id" : 12345678987654321,
    "resource_state" : 3,
    "external_id" : "garmin_push_12345678987654321",
    "upload_id" : 98765432123456789,
    "athlete" : {
      "id" : 134815,
      "resource_state" : 1
    },
    "name" : "Happy Friday",
    "distance" : 28099,
    "moving_time" : 4207,
    "elapsed_time" : 4410,
    "total_elevation_gain" : 516,
    "type" : "Ride",
    "start_date" : "2018-02-16T14:52:54Z",
    "start_date_local" : "2018-02-16T06:52:54Z",
    "timezone" : "(GMT-08:00) America/Los_Angeles",
    "utc_offset" : -28800,
    "start_latlng" : [ 37.83, -122.26 ],
    "end_latlng" : [ 37.83, -122.26 ],
    "achievement_count" : 0,
    "kudos_count" : 19,
    "comment_count" : 0,
    "athlete_count" : 1,
    "photo_count" : 0,
    "map" : {
      "id" : "a1410355832",
      "polyline" : "ki{eFvqfiVqAWQIGEEKAYJgBVqDJ{BHa@jAkNJw@Pw@V{APs@^aABQAOEQGKoJ_FuJkFqAo@{A}@sH{DiAs@Q]?WVy@`@oBt@_CB]KYMMkB{AQEI@WT{BlE{@zAQPI@ICsCqA_BcAeCmAaFmCqIoEcLeG}KcG}A}@cDaBiDsByAkAuBqBi@y@_@o@o@kB}BgIoA_EUkAMcACa@BeBBq@LaAJe@b@uA`@_AdBcD`@iAPq@RgALqAB{@EqAyAoOCy@AmCBmANqBLqAZkB\\iCPiBJwCCsASiCq@iD]eA]y@[i@w@mAa@i@k@g@kAw@i@Ya@Q]EWFMLa@~BYpAFNpA`Aj@n@X`@V`AHh@JfB@xAMvAGZGHIDIAWOEQNcC@sACYK[MSOMe@QKKKYOs@UYQISCQ?Q@WNo@r@OHGAGCKOQ_BU}@MQGG]Io@@c@FYNg@d@s@d@ODQAMOMaASs@_@a@SESAQDqBn@a@RO?KK?UBU\\kA@Y?WMo@Iy@GWQ_@WSSGg@AkABQB_Ap@_A^o@b@Q@o@IS@OHi@n@OFS?OI}@iAQMQGQC}@DOIIUK{@IUOMyBo@kASOKIQCa@L[|AgATWN[He@?QKw@FOPCh@Fx@l@TDLELKl@aAHIJEX@r@ZTDV@LENQVg@RkA@c@MeA?WFOPMf@Ej@Fj@@LGHKDM?_@_@iC?a@HKRIl@NT?FCHMFW?YEYGWQa@GYBiAIq@Gq@L_BHSHK|@WJETSLQZs@z@_A~@uA^U`@G\\CRB\\Tl@p@Th@JZ^bB`@lAHLXVLDP?LGFSKiDBo@d@wBVi@R]VYVE\\@`@Lh@Fh@CzAk@RSDQA]GYe@eAGWSiBAWBWBIJORK`@KPOPSTg@h@}Ad@o@F[E_@EGMKUGmAEYGMIMYKs@?a@J}@@_BD_@HQJMx@e@LKHKHWAo@UoAAWFmAH}@?w@C[YwAAc@HSNM|Ao@rA}@zAq@`@a@j@eAxAuBXQj@MXSR[b@gAFg@?YISOGaAHi@Xw@v@_@d@WRSFqARUHQJc@d@m@`A[VSFUBcAEU@WFULUPa@v@Y~@UrBc@dBI~@?l@P~ABt@N`HEjA]zAEp@@p@TrBCl@CTQb@k@dAg@jAU^KJYLK@k@A[Js@d@a@b@]RgBl@[FMAw@[]G]?m@D_@F]P[Vu@t@[TMF_@Do@E_@@q@P]PWZUZw@vAkAlAGJOj@IlAMd@OR{@p@a@d@sBpD]v@a@`Aa@n@]TODgBVk@Pe@^cBfBc@Rs@La@RSPm@|@wCpDS^Wp@QZML{@l@qBbCYd@k@lAIVCZBZNTr@`@RRHZANIZQPKDW@e@CaASU?I@YTKRQx@@\\VmALYRQLCL?v@P|@D\\GJEFKDM@OCa@COOYIGm@YMUCM@]JYr@uAx@kAt@}@jAeAPWbAkBj@s@bAiAz@oAj@m@VQlAc@VQ~@aA`Au@p@Q`AIv@MZORUV_@p@iB|AoCh@q@dAaANUNWH[N{AJ[^m@t@_Av@wA\\a@`@W`@In@Al@B^E`@Wl@u@\\[VQ\\K`@Eb@?R@dAZP@d@CRExAs@\\Yt@{@LG\\MjAATINOXo@d@kAl@_AHYBOCe@QiBCm@Fq@\\wADo@AyGEeBWuB@YHu@Tu@Lk@VcCTo@d@aA\\WJE`@G~@FP?VI\\U~@sANO`@SfAMj@U\\WjAsAXS`@UNENALBHFFL?^Ml@Uj@]b@q@RUJSPkChEc@XcAb@sA|@]PaA\\OJKNER?TDTNj@Jn@?p@OfC@ZR`B@VCV_@n@{@l@WbACv@OlABnAPl@LNNHbBBNBLFFJ@^GLg@x@i@|AMP[X}@XOJKPET?l@LhAFXp@fBDRCd@S\\_@Ps@PQ@}A]S?QDe@V]b@MR[fAKt@ErAF~CANILYDKGIKe@{@Yy@e@sB[gA[c@e@YUCU?WBUHUNQPq@`AiArAMV[^e@Zc@JQJKNMz@?r@Bb@PfAAfA@VVbADn@E`@KHSEe@SMAKDKFM\\^dDCh@m@LoAQ_@@MFOZLfBEl@QbASd@KLQBOAaAc@QAQ@QHc@v@ONMJOBOCg@c@]O[EMBKFGL?RHv@ARERGNe@h@{@h@WVGNDt@JLNFPFz@LdBf@f@PJNHPF`ADPJJJDl@I`@B^Tp@bALJNDNALIf@i@PGPCt@DNE`@Uv@[dAw@RITGRCtAARBPJLPJRZxB?VEX_@vAAR?RDNHJJBh@UnBm@h@IRDRJNNJPNbBFRJLLBLCzAmAd@Uf@Gf@?P@PFJNHPFTH`BDTHNJJJ@LG`@m@^YPER@RDPHNNJRLn@HRLN^VNPHTFX@\\UlDFb@FHh@NP@HKPsB?}ASkCQ{@[y@q@}@cA{@KOCQDa@t@{CFGJCf@Nl@ZtA~@r@p@`@h@rAxBd@rA\\fARdAPjANrB?f@AtBCd@QfBkAjJOlBChA?rBFrBNlBdAfKFzAC~@Iz@Mz@Sv@s@jBmAxBi@hAWt@Sv@Qx@O`BA`@?dAPfBVpAd@`BfBlFf@fBdA~Cr@pAz@fApBhBjAt@H?IL?FBFJLx@^lHvDvh@~XnElCbAd@pGhDbAb@nAr@`Ad@`GhDnBbAxCbBrWhNJJDPARGP_@t@Qh@]pAUtAoA`Ny@jJApBBNFLJFJBv@Hb@HBF?\\",
      "resource_state" : 3,
      "summary_polyline" : "ki{eFvqfiVsBmA`Feh@qg@iX`B}JeCcCqGjIq~@kf@cM{KeHeX`@_GdGkSeBiXtB}YuEkPwFyDeAzAe@pC~DfGc@bIOsGmCcEiD~@oBuEkFhBcBmDiEfAVuDiAuD}NnDaNiIlCyDD_CtJKv@wGhD]YyEzBo@g@uKxGmHpCGtEtI~AuLrHkAcAaIvEgH_EaDR_FpBuBg@sNxHqEtHgLoTpIiCzKNr[sB|Es\\`JyObYeMbGsMnPsAfDxAnD}DBu@bCx@{BbEEyAoD`AmChNoQzMoGhOwX|[yIzBeFKg[zAkIdU_LiHxK}HzEh@vM_BtBg@xGzDbCcF~GhArHaIfByAhLsDiJuC?_HbHd@nL_Cz@ZnEkDDy@hHwJLiCbIrNrIvN_EfAjDWlEnEiAfBxDlFkBfBtEfDaAzBvDKdFx@|@XgJmDsHhAgD`GfElEzOwBnYdBxXgGlSc@bGdHpW|HdJztBnhAgFxc@HnCvBdA"
    },
    "trainer" : false,
    "commute" : false,
    "manual" : false,
    "private" : false,
    "flagged" : false,
    "gear_id" : "b12345678987654321",
    "from_accepted_tag" : false,
    "average_speed" : 6.679,
    "max_speed" : 18.5,
    "average_cadence" : 78.5,
    "average_temp" : 4,
    "average_watts" : 185.5,
    "weighted_average_watts" : 230,
    "kilojoules" : 780.5,
    "device_watts" : true,
    "has_heartrate" : false,
    "max_watts" : 743,
    "elev_high" : 446.6,
    "elev_low" : 17.2,
    "pr_count" : 0,
    "total_photo_count" : 2,
    "has_kudoed" : false,
    "workout_type" : 10,
    "suffer_score" : null,
    "description" : "",
    "calories" : 870.2,
    "segment_efforts" : [ {
      "id" : 12345678987654321,
      "resource_state" : 2,
      "name" : "Tunnel Rd.",
      "activity" : {
        "id" : 12345678987654321,
        "resource_state" : 1
      },
      "athlete" : {
        "id" : 134815,
        "resource_state" : 1
      },
      "elapsed_time" : 2038,
      "moving_time" : 2038,
      "start_date" : "2018-02-16T14:56:25Z",
      "start_date_local" : "2018-02-16T06:56:25Z",
      "distance" : 9434.8,
      "start_index" : 211,
      "end_index" : 2246,
      "average_cadence" : 78.6,
      "device_watts" : true,
      "average_watts" : 237.6,
      "segment" : {
        "id" : 673683,
        "resource_state" : 2,
        "name" : "Tunnel Rd.",
        "activity_type" : "Ride",
        "distance" : 9220.7,
        "average_grade" : 4.2,
        "maximum_grade" : 25.8,
        "elevation_high" : 426.5,
        "elevation_low" : 43.4,
        "start_latlng" : [ 37.8346153, -122.2520872 ],
        "end_latlng" : [ 37.8476261, -122.2008944 ],
        "climb_category" : 3,
        "city" : "Oakland",
        "state" : "CA",
        "country" : "United States",
        "private" : false,
        "hazardous" : false,
        "starred" : false
      },
      "kom_rank" : null,
      "pr_rank" : null,
      "achievements" : [ ],
      "hidden" : false
    } ],
    "splits_metric" : [ {
      "distance" : 1001.5,
      "elapsed_time" : 141,
      "elevation_difference" : 4.4,
      "moving_time" : 141,
      "split" : 1,
      "average_speed" : 7.1,
      "pace_zone" : 0
    } ],
    "laps" : [ {
      "id" : 4479306946,
      "resource_state" : 2,
      "name" : "Lap 1",
      "activity" : {
        "id" : 1410355832,
        "resource_state" : 1
      },
      "athlete" : {
        "id" : 134815,
        "resource_state" : 1
      },
      "elapsed_time" : 1573,
      "moving_time" : 1569,
      "start_date" : "2018-02-16T14:52:54Z",
      "start_date_local" : "2018-02-16T06:52:54Z",
      "distance" : 8046.72,
      "start_index" : 0,
      "end_index" : 1570,
      "total_elevation_gain" : 276,
      "average_speed" : 5.12,
      "max_speed" : 9.5,
      "average_cadence" : 78.6,
      "device_watts" : true,
      "average_watts" : 233.1,
      "lap_index" : 1,
      "split" : 1
    } ],
    "gear" : {
      "id" : "b12345678987654321",
      "primary" : true,
      "name" : "Tarmac",
      "resource_state" : 2,
      "distance" : 32547610
    },
    "partner_brand_tag" : null,
    "photos" : {
      "primary" : {
        "id" : null,
        "unique_id" : "3FDGKL3-204E-4867-9E8D-89FC79EAAE17",
        "urls" : {
          "100" : "https://dgtzuqphqg23d.cloudfront.net/Bv93zv5t_mr57v0wXFbY_JyvtucgmU5Ym6N9z_bKeUI-128x96.jpg",
          "600" : "https://dgtzuqphqg23d.cloudfront.net/Bv93zv5t_mr57v0wXFbY_JyvtucgmU5Ym6N9z_bKeUI-768x576.jpg"
        },
        "source" : 1
      },
      "use_primary_photo" : true,
      "count" : 2
    },
    "highlighted_kudosers" : [ {
      "destination_url" : "strava://athletes/12345678987654321",
      "display_name" : "Marianne V.",
      "avatar_url" : "https://dgalywyr863hv.cloudfront.net/pictures/athletes/12345678987654321/12345678987654321/3/medium.jpg",
      "show_name" : true
    } ],
    "hide_from_home" : false,
    "device_name" : "Garmin Edge 1030",
    "embed_token" : "18e4615989b47dd4ff3dc711b0aa4502e4b311a9",
    "segment_leaderboard_opt_out" : false,
    "leaderboard_opt_out" : false
  }
garmin_examplar_1 = {
    "activeKilocalories": 391,
    "activityId": 7698241609,
    "activityName": "Indoor Cycling",
    "activityType": "INDOOR_CYCLING",
    "averageHeartRateInBeatsPerMinute": 139,
    "deviceName": "forerunner935",
    "durationInSeconds": 1811,
    "maxHeartRateInBeatsPerMinute": 178,
    "startTimeInSeconds": 1634907261,
    "startTimeOffsetInSeconds": 3600,
    "summaryId": "7698241609",
    "userAccessToken": "32ada6ab-e5fe-46a7-bd82-5bad6158d6eb",
    "userId": "eb24e8e5-110d-4a87-b976-444f40ca27d4"
  }
garmin_examplar_2 = {
    "activeKilocalories": 809,
    "activityId": 7654562055,
    "activityName": "Newcastle upon Tyne Running",
    "activityType": "RUNNING",
    "averageHeartRateInBeatsPerMinute": 143,
    "averagePaceInMinutesPerKilometer": 5.6670065,
    "averageRunCadenceInStepsPerMinute": 157.09375,
    "averageSpeedInMetersPerSecond": 2.941,
    "deviceName": "forerunner735xt",
    "distanceInMeters": 12213.01,
    "durationInSeconds": 4152,
    "maxHeartRateInBeatsPerMinute": 161,
    "maxPaceInMinutesPerKilometer": 3.7444768,
    "maxRunCadenceInStepsPerMinute": 249,
    "maxSpeedInMetersPerSecond": 4.451,
    "startTimeInSeconds": 1634193362,
    "startTimeOffsetInSeconds": 3600,
    "startingLatitudeInDegree": 54.99477194622159,
    "startingLongitudeInDegree": -1.6087607201188803,
    "steps": 10856,
    "summaryId": "7654562055",
    "totalElevationGainInMeters": 91.247894,
    "totalElevationLossInMeters": 90.40311,
    "userAccessToken": "715a21a5-d9ae-4139-8ed7-d3ad4a833da4",
    "userId": "8e1ec0b4-7fa9-4a1c-be14-d8f6dee46bf7"
  }
  wahooExemplar = {
    "user": {
      "id":1510441
    },
    "event_type":"workout_summary",
    "workout_summary":{
      "duration_active_accum":"9.0",
      "workout": {
        "name":"Cycling",
        "workout_token":"ELEMNT AE48:274",
        "workout_type_id":0,
        "id":147564736,
        "updated_at":"2022-06-13T16:39:08.000Z",
        "plan_id":null,
        "minutes":0,
        "starts":"2022-06-13T16:38:51.000Z",
        "created_at":"2022-06-13T16:39:08.000Z"
      },
      "speed_avg":"0.0",
      "duration_total_accum":"9.0",
      "cadence_avg":"0.0",
      "id":140473420,
      "work_accum":"0.0",
      "power_bike_tss_last":null,
      "ascent_accum":"0.0",
      "power_bike_np_last":null,
      "duration_paused_accum":"0.0",
      "created_at":"2022-06-13T16:39:09.000Z",
      "updated_at":"2022-06-13T16:39:09.000Z",
      "power_avg":"0.0",
      "file":{
        "url":"https://cdn.wahooligan.com/wahoo-cloud/production/uploads/workout_file/file/WpHvKL3irWsv2vHzGzGF_Q/2022-06-13-163851-ELEMNT_AE48-274-0.fit"
      },
      "distance_accum":"0.0",
      "heart_rate_avg":"0.0",
      "calories_accum":"0.0"
    },
    "webhook_token":"97661c16-6359-4854-9498-a49c07b6ec11"
  };
/*
x = stravaSanitise([strava_examplar_1]);
y = garminSanitise([garmin_examplar_2])

console.log("Strava Sanitised")
console.log(x)
console.log()
console.log("Garmin Sanitised")
console.log(y)
*/
