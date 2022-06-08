/* eslint-disable max-len */
const request = require("request");
const got = require("got");
/**
* Oauth is a class to help manage the communication with the various
* fitness activity providers
*/
class Oauth {
  /**
  *
  * @param {Object} config
  * @param {Object} firebaseDb
  */
  constructor(config, firebaseDb) {
    this.db = firebaseDb;
    this.config = config;
  }
  /**
   * @param {String} devId
   * @param {String} devsUserTag
   * @param {String} provider
   */
  setProvider(devId, devsUserTag, provider) {
    this.devId = devId;
    this.userId = devsUserTag;
    this.provider = provider;
    this.status = {redirectUrl: false,
      gotCode: false,
      gotAccessToken: false,
      gotUserData: false,
      tokenExpired: false};
    this.error = false;
    this.errorMessage = "";
    this.redirectUrl = this.getRedirect();
  }
  /**
   *
   * @param {String} provider
   * @param {Object} data - the parsed JSON body returned from the provider
   */
  fromCallbackData(provider, data) {
    this.error = false;
    this.errorMessage = "";
    if (provider == "polar" ||provider == "wahoo") {
      const _state = data["state"].split(":");
      this.devId = _state[1];
      this.userId = _state[0];
    }
    this.code = data["code"];
    this.error = data["error"] || false;
    this.provider = provider;
    this.status = {redirectUrl: true,
      gotCode: (this.code == undefined) ? false : true,
      gotAccessToken: false,
      gotUserData: false,
      tokenExpired: false};
    if (this.code == undefined || null || "") {
      if (!this.error) {
        this.error = true;
        this.errorMessage = "Valid code not received from provider";
      }
    } else if (this.devId == "" || undefined || null) {
      this.error = true;
      this.errorMessage = "valid state of devId not received from provider";
    }
  }
  /**
   * @return {void}
   */
  getRedirect() {
    switch (this.provider) {
      case "polar":
        this.clientId = this.config[this.devId]["polarClientId"];
        this.clientSecret = this.config[this.devId]["polarSecret"];
        this.callbackBaseUrl =
          "https://us-central1-rove-26.cloudfunctions.net/polarCallback";
        this.baseUrl = "https://flow.polar.com/oauth2/authorization?";
        this.scope = "accessLink.read_all";
        this.state = this.userId+":"+this.devId;
        break;
      case "wahoo":
        this.clientId = this.config[this.devId]["whaooClientId"];
        this.clientSecret = this.config[this.devId]["wahooSecret"];
        this.callbackBaseUrl =
          "https://us-central1-rove-26.cloudfunctions.net/wahooCallback";
        this.scope = "email%20user_read%20workouts_read%20offline_data";
        this.state = this.userId+":"+this.devId;
        this.baseUrl = "https://api.wahooligan.com/oauth/authorize?";
        break;
      case "strava":
        this.clientId = this.config[this.devId]["stravaClientId"];
        this.clientSecret = this.config[this.devId]["stravaSecret"];
        this.callbackBaseUrl =
          "https://us-central1-rove-26.cloudfunctions.net/stravaCallback";
        break;
      case "garmin":
        this.oauth_consumer_key = this.config[this.devId]["oauth_consumer_key"];
        this.consumerSecret = this.config[this.devId]["consumerSecret"];
        this.callbackBaseUrl =
          "https://us-central1-rove-26.cloudfunctions.net/oauthCallbackHandlerGarmin";
        break;
      default:
        this.error = true;
        this.errorMessage =
          "error: the provider was badly formatted, missing or not supported";
        break;
    }

    const parameters = {
      client_id: this.clientId,
      response_type: "code",
      redirect_uri: this.callbackBaseUrl+"?state="+this.state,
      scope: this.scope,
    };

    let encodedParameters = "";
    let k = 0;
    for (k in parameters) {
      if (parameters[k] != undefined) {
        const encodedValue = parameters[k];
        const encodedKey = k;
        if (encodedParameters === "") {
          encodedParameters += `${encodedKey}=${encodedValue}`;
        } else {
          encodedParameters += `&${encodedKey}=${encodedValue}`;
        }
      }
    }
    return (this.baseUrl + encodedParameters);
  }
  /**
  *
  * @return {Promise}
  */
  async getAndSaveAccessCodes() {
    let response = {body: "", statusCode: 0};
    try {
      response =
        await got(this.accessCodeOptions).json();
    } catch (error) {
      this.error = true;
      this.errorMessage =
        "Error: "+error+
        " please close this window and try again";
      console.log(error);
      return;
    }
    console.log("response: ", response);
    this.accessCodeResponse = response;
    this.registerUser();
    this.storeTokens();
  }
  /**
   *
   * @return {void}
   */
  async storeTokens() {
    // set tokens for userId doc.
    const userRef = this.db.collection("users").doc(this.userId);
    await userRef.set(this.parameters, {merge: true});
    return;
  }
  /**
   * returns parameters to update database with
   */
  get parameters() {
    switch (this.provider) {
      case "polar":
        return {
          "polar_access_token": this.accessCodeResponse["access_token"],
          "polar_token_type": this.accessCodeResponse["token_type"],
          "polar_token_expires_in": this.accessCodeResponse["expires_in"],
          "polar_connected": true,
          "polar_user_id": this.accessCodeResponse["x_user_id"],
        };
      case "wahoo":
        return {
          "wahoo_access_token": this.accessCodeResponse["access_token"],
          "wahoo_token_expires_in": this.accessCodeResponse["expires_in"],
          "wahoo_connected": true,
        };
      default:
        this.error = true;
        this.errorMessage =
          "could not set parameters to update database, provider not set correctly";
        return {};
    }
  }
  /**
   *
   * @return {void}
   */
  async registerUser() {
    // if the user needs to be registered then register them
    if (this.devId == "polar") {
      // make request to polar to register the user.
      request.post(this.registerUserOptions, async (error, response, body) => {
        if (!error && response.statusCode == 200) {
          const updates = {
            "polar_registration_date": JSON.parse(body)["registration-date"],
          };
          const userRef = this.db.collection("users").doc(this.userId);
          await userRef.set(updates, {merge: true});
        } else if (response.statusCode == 409) {
          // user already registered - nothing to do here
          console.log("user already registered");
        } else {
          console.log("error registering polar user: "+response.statusCode);
        }
      });
    } else if (this.devId == "wahoo") {
      // do registration if needed PV TODO
    }
    return;
  }
  /**
   * @return {Object}
   */
  get accessCodeOptions() {
    let _clientIdClientSecret;
    let _buffer;
    let _base64String;
    let _dataString;
    switch (this.provider) {
      case "polar":
        _clientIdClientSecret =
          this.config[this.devId]["polarClientId"]+
            ":"+this.config[this.devId]["polarSecret"];
        _buffer =
          new Buffer.from(_clientIdClientSecret); // eslint-disable-line
        _base64String = _buffer.toString("base64");
        _dataString = "code="+
        this.code+
        "&grant_type=authorization_code"+
        "&redirect_uri=https://us-central1-rove-26.cloudfunctions.net/polarCallback";
        return {
          url: "https://polarremote.com/v2/oauth2/token",
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            "Accept": "application/json;charset=UTF-8",
            "Authorization": "Basic "+_base64String,
          },
          body: _dataString,
        };
      case "wahoo":
        _dataString = "code="+
        this.code+
        "&client_id="+this.config[this.devId]["whaooClientId"]+
        "&client_secret="+this.config[this.devId]["wahooSecret"]+
        "&grant_type=authorization_code"+
        "&redirect_uri=https://us-central1-rove-26.cloudfunctions.net/wahooCallback?state="+this.userId+":"+this.devId;
        return {
          url: "https://api.wahooligan.com/oauth/token?"+_dataString,
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Accept": "application/json;charset=UTF-8",
          },
        };
      default:
        this.error = true;
        this.errorMessage = "couldn't set secrets, invalid provider";
        return {};
    }
  }
  /**
   * @return {Object}
   */
  get registerUserOptions() {
    let _dataString;
    switch (this.provider) {
      case "polar":
        _dataString = "{member-id"+this.userId+"</member-id></register>";
        return {
          url: "https://www.polaraccesslink.com/v3/users",
          method: "POST",
          headers: {
            "Content-Type": "application/xml",
            "Accept": "application/json",
            "Authorization": "Bearer "+this.accessCodeResponse["access_token"],
          },
          body: _dataString,
        };
      case "wahoo":
        _dataString = "{member-id"+this.userId+"</member-id></register>";
        return {
          url: "https://api.wahooligans.com/v3/users",
          method: "POST",
          headers: {
            "Content-Type": "application/xml",
            "Accept": "application/json",
            "Authorization": "Bearer "+this.accessCodeResponse["access_token"],
          },
          body: _dataString,
        };
      default:
        this.error = true;
        this.errorMessage =
          "couldn't set register user options, invalid provider";
        return {};
    }
  }
  /**
   *
   */
  registerWebhook() {
  }
}

module.exports = Oauth;
