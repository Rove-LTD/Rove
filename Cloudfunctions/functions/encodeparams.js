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
    if (dateRange != undefined || dateRange != null) {
      url = url+"?uploadStartTimeInSeconds="+dateRange.from +
      "&uploadEndTimeInSeconds="+dateRange.to;
    }
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
  /**
 * creates a signature that should match the polar signature
 * available in the polar webhook messages using the available keys,
 * the matching key is used to return the secrets for that key.
 * If non match an string containing "error" is returned.
 * @param {String} rawBody
 * @param {Array<String>} polarSecrets
 * @param {String} signature
 * @return {String} secret_lookup as a string
 */
  getSecretsFromPolarSignature: function(rawBody, polarSecrets, signature) {
    // eslint-disable-next-line require-jsdoc
    let secrets;
    for (const config of polarSecrets) {
      const key = config.webhookSecret;
      const calculatedSignature = crypto
          .createHmac("sha256", key)
          .update(rawBody)
          .digest("hex");
      if (calculatedSignature == signature) {
        secrets = config;
        console.log("managed to match the polar signature");
      }
    }
    if (secrets == undefined) {
      console.log("polar signatures did not match - using defaults based on project");
      secrets = "error";
    }
    return secrets;
  },
};
