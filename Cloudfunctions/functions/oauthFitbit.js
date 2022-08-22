/* eslint-disable max-len */
const got = require("got");
const Crypto = require("Crypto");
const Cryptiles = require("@hapi/cryptiles");
/**
* Oauth is a class to help manage the communication with the various
* fitness activity providers
*/
class OauthFitbit {
  /**
  *
  * @param {Object} config
  * @param {Object} firebaseDb
  */
  constructor(config, firebaseDb) {
    this.db = firebaseDb;
    this.config = config;
    this.provider = "fitbit"; // edit to put in provider name
  }
  /**
   * @param {String} devId
   * @param {String} devsUserTag
   * @param {String} provider
   */
  setDevUser(devId, devsUserTag) {
    this.devId = devId;
    this.userId = devsUserTag;
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
    const _state = data["state"].split(":");
    this.devId = _state[1];
    this.userId = _state[0];
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
  getRedirect() { // choose the right properties for the provider
    this.clientId = this.config[this.devId]["fitbitClientId"];
    this.clientSecret = this.config[this.devId]["fitbitToken"];
    this.scope= "activity";
    this.callbackBaseUrl = "https://us-central1-rove-26.cloudfunctions.net/oauthCallbackHandlerFitbit";
    this.baseUrl = "https://www.fitbit.com/oauth2/authorize?";
    this.state = this.userId+":"+this.devId;
    this.codeChallenge = this.getCodeChallenge();

    const parameters = {
      client_id: this.clientId,
      response_type: "code",
      redirect_url: this.callbackBaseUrl+"?state="+this.state,
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
  * @return {void}
  */
  async getAndSaveAccessCodes() {
    let response = {};
    try {
      response =
        await got.post(this.accessCodeOptions).json();
    } catch (error) {
      this.error = true;
      this.errorMessage =
        "Error: "+error+
        " please close this window and try again";
      console.log(error);
      return;
    }
    this.accessCodeResponse = response;
    await this.registerUser();
    await this.storeTokens();
  }
  /**
   *
   *
   * @return {String}
   */
  getCodeChallenge() {
    this.codeVerifier = Cryptiles.randomAlphanumString(128);
    return Crypto.createHash("sha256")
        .update(this.codeVerifier, "ascii")
        .digest("base64")
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=/g, "");
  }
  /**
   *
   * @return {void}
   */
  async storeTokens() {
    // set tokens for userId doc.
    const userRef = this.db.collection("users").doc(this.userId);
    await userRef.set(this.tokenData, {merge: true});
    return;
  }
  /**
   * returns accessCodeFields from the response to update database with
   */
  get tokenData() {
    // CHANGE to match field names from provider
    return {
      "provider_access_token": this.accessCodeResponse["access_token"],
      "provider_connected": true,
    };
  }

  /**
   *
   * @return {void}
   */
  async registerUser() {
    // if the user needs to be registered then register them
    let response = {};
    try {
      response =
        await got.get(this.registerUserOptions).json();
    } catch (error) {
      this.error = true;
      this.errorMessage =
        "Error: "+error+
        " please close this window and try again";
      console.log(error);
      return;
    }
    const updates = {
      "fitbit_user_id": response["id"],
    };
    const userRef = this.db.collection("users").doc(this.userId);
    await userRef.set(updates, {merge: true});
    return;
  }
  /**
   * @return {Object}
   */
  get accessCodeOptions() {
    const _dataString = "code="+
    this.code+
    "&client_id="+this.config[this.devId]["fitbitClientId"]+
    "&client_secret="+this.config[this.devId]["fitbitSecret"]+
    "&grant_type=authorization_code"+
    "&redirect_uri=https://us-central1-rove-26.cloudfunctions.net/fitbitCallback?state="+this.userId+":"+this.devId+
    "&code_verifier="+this.codeVerifier;
    return {
      url: "https://api.fitbit.com/oauth/token?"+_dataString,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json;charset=UTF-8",
        "Authorization": "Basic "+ Buffer.from(this.config[this.devId]["fitbitClientId"]+":"+this.config[this.devId]["fitbitSecret"], "base64"),
      },
    };
  }
  /**
   * @return {Object}
   */
  get registerUserOptions() {
    return {
      url: "https://api.fitbit.com/1/user",
      method: "GET",
      headers: {
        "Accept": "application/json",
        "Authorization": "Bearer "+this.accessCodeResponse["access_token"],
      },
    };
  }
}

module.exports = OauthFitbit;
