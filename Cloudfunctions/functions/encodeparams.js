/* eslint-disable max-len */
/* eslint-disable guard-for-in */
const crypto = require("crypto");
module.exports = {
  collectParams: function(parameters) {
    const ordered = {};
    Object.keys(parameters).sort().forEach(function(key) {
      ordered[key] = parameters[key];
    });
    let encodedParameters = "";
    let k = 0;
    for (k in ordered) {
      const encodedValue = escape(ordered[k]);
      const encodedKey = encodeURIComponent(k);
      if (encodedParameters === "") {
        encodedParameters += encodeURIComponent(`${encodedKey}=${encodedValue}`);
      } else {
        encodedParameters += encodeURIComponent(`&${encodedKey}=${encodedValue}`);
      }
    }
    return encodedParameters;
  },

  authorizationString: function(parameters) {
    const ordered = {};
    Object.keys(parameters).sort().forEach(function(key) {
      ordered[key] = parameters[key];
    });
    let encodedParameters = "";
    let k = 0;
    for (k in ordered) {
      const encodedValue = encodeURIComponent(ordered[k]);
      const encodedKey = encodeURIComponent(k);
      if (encodedParameters === "") {
        encodedParameters += `${encodedKey}="${encodedValue}"`;
      } else {
        encodedParameters += `,${encodedKey}="${encodedValue}"`;
      }
    }
    return encodedParameters;
  },

  baseStringGen: function(encodedParameters, method, url) {
    const baseUrl = url;
    const encodedUrl = encodeURIComponent(baseUrl);
    const signatureBaseString = `${method}&${encodedUrl}&${encodedParameters}`;
    return signatureBaseString;
  },
  /**
   * returns the Options required for a "got" call to the supplied url.
   * @param {String} url
   * @param {"GET, POST, DELETE"} method
   * @param {String} consumerSecret ROVE consumer Secret
   * @param {String} oauthConsumerKey ROVE consumer key
   * @param {String} garminAccessToken users Access Token
   * @param {String} garminAccessTokenSecret users token secret
   * @param {{to: Int, from: Int}} dateRange dates in seconds since epoch
   * @return {Options} returns the "options" parameter needed in got(options).
   */
  garminCallOptions: function(url, method, consumerSecret, oauthConsumerKey, garminAccessToken, garminAccessTokenSecret, dateRange) {
    const oauthNonce = crypto.randomBytes(10).toString("hex");
    // console.log(oauth_nonce);
    const oauthTimestamp = Math.round(new Date().getTime()/1000);
    // console.log(oauth_timestamp);
    let parameters = {
      oauth_consumer_key: oauthConsumerKey,
      oauth_token: garminAccessToken,
      oauth_signature_method: "HMAC-SHA1",
      oauth_nonce: oauthNonce,
      oauth_timestamp: oauthTimestamp,
      oauth_version: "1.0",
    };
    if (dateRange != undefined || dateRange != null) {
      parameters.uploadStartTimeInSeconds = dateRange.from;
      parameters.uploadEndTimeInSeconds = dateRange.to;
      url = url+"?uploadStartTimeInSeconds="+dateRange.from +
          "&uploadEndTimeInSeconds="+dateRange.to;
    }
    const encodedParameters = this.collectParams(parameters);
    const baseUrl = url;
    const baseString = this.baseStringGen(encodedParameters, method, baseUrl);
    const encodingKey = consumerSecret + "&" + garminAccessTokenSecret;
    const signature = crypto.createHmac("sha1", encodingKey).update(baseString).digest().toString("base64");
    parameters = {
      oauth_consumer_key: oauthConsumerKey,
      oauth_token: garminAccessToken,
      oauth_signature_method: "HMAC-SHA1",
      oauth_nonce: oauthNonce,
      oauth_timestamp: oauthTimestamp,
      oauth_version: "1.0",
      oauth_signature: signature,
    };
    const options = {
      headers: {
        "Authorization": "OAuth "+this.authorizationString(parameters),
        "Accept": "application/json;charset=UTF-8",
      },
      method: method,
      url: url,
    };
    return options;
  },
};
