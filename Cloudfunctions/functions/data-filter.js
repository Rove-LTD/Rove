// Data Collection, Cleaning and Storage Functions:
// by Ben Thompson-Watson
// 24/05/2022

/* eslint-disable max-len */
/* eslint-disable */



new_standard_format = {
    "activity_id" : null,
    "activity_name" : null,
    "activity_type" : null,
    "distance_in_meters" : null,
    "average_pace_in_meters_per_second" : null,
    "active_calories" : null,
    "activity_duration_in_seconds" : null,
    "start_time" : null,
    "average_heart_rate_bpm" : null,
    "average_cadence" : null,
    "elevation_gain" : null,
    "elevation_loss" : null,
    "data_source" : null,
  }

function polarSanatise(activity) {
  const summaryActivity = {
    // standard fields
    "activity_id" : activity["id"],
    "activity_name" : activity["detailed-sport-info"],
    "activity_type" : activity["sport"],
    "distance_in_meters" : activity["distance"],
    "active_calories" : activity["calories"],
    "activity_duration_in_seconds" : activity["duration"],
    "start_time" : Date(activity["start-time"]),
    "average_heart_rate_bpm" : activity["heart-rate"]["average"],
    "data_source" : "polar",
    // some extra fields here
    "max_heart_rate_bpm" : activity["heart-rate"]["maximum"],
    "device-id": activity["device-id"],
    "training-load": activity["training-load"],
    "has-route": activity["has-route"],
    "fat-percentage": activity["fat-percentage"],
    "carbohydrate-percentage": activity["carbohydrate-percentage"],
    "protein-percentage": activity["protein-percentage"]
  }
/*{
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
  return summaryActivity;
}

function stravaSanitise(activities) {
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
        if (typeof summaryActivity[property] == "undefined") {
            summaryActivity[property] = null;
        }
    }
    summaryActivities[i] = summaryActivity
}
return summaryActivities;
}
function garminSanitise(activities) {
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
/*
x = stravaSanitise([strava_examplar_1]);
y = garminSanitise([garmin_examplar_2])

console.log("Strava Sanitised")
console.log(x)
console.log()
console.log("Garmin Sanitised")
console.log(y)
*/
