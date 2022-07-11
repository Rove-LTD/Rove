/* eslint-disable max-len */
const got = require("got");
/**
* Oauth is a class to help manage the communication with the various
* fitness activity providers
*/
class OauthWahoo {
  /**
  *
  * @param {Object} config
  * @param {Object} firebaseDb
  */
  constructor(config, firebaseDb) {
    this.db = firebaseDb;
    this.config = config;
    this.provider = "wahoo";
    this.callbackBaseUrl = "https://us-central1-rove-26.cloudfunctions.net/wahooCallback";
  }
  /**
   * @param {String} devId
   * @param {String} devsUserTag
   * @param {String} provider
   */
  setDevUser(devId, devsUserTag) {// just call userId
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
   * @return {String} userDocId
   */
  get userDocId() {
    return this.devId+this.userId;
  }
  /**
   *
   * @param {Object} data - the parsed JSON body returned from the provider
   */
  fromCallbackData(data) {
    this.error = false;
    this.errorMessage = "";
    const _state = data["state"].split(":");
    this.devId = _state[1];
    this.userId = _state[0];
    this.code = data["code"];
    this.error = data["error"] || false;
    this.status = {redirectUrl: true,
      gotCode: (this.code == undefined) ? false : true,
      gotAccessToken: false,
      gotUserData: false,
      tokenExpired: false};
    if (this.code == undefined || this.code == null || this.code =="") {
      if (!this.error) {
        this.error = true;
        this.errorMessage = "Valid code not received from provider";
      }
    } else if (this.devId == "" || this.devId == undefined || this.devId ==null) {
      this.error = true;
      this.errorMessage = "valid state of devId not received from provider";
    }
  }
  /**
   * @return {void}
   */
  getRedirect() {
    this.clientId = this.config[this.devId]["whaooClientId"];
    this.clientSecret = this.config[this.devId]["wahooSecret"];
    this.scope = "email%20user_read%20workouts_read%20offline_data";
    this.state = this.userId+":"+this.devId;
    this.baseUrl = "https://api.wahooligan.com/oauth/authorize?";

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
  * @param {String} refreshCode
  * @param {String} userToken
  * @return {Future}
  */
  async refreshAndSaveAccessCodes(refreshCode, userToken) {
    let response = {};
    this.refreshCode = refreshCode;
    this.accessToken = userToken;
    try {
      response =
        await got.post(this.refreshCodeOptions).json();
    } catch (error) {
      this.error = true;
      this.errorMessage =
        "Error: "+error+
        "could not refresh access code for user: "+this.userDocId;
      console.log(error);
      throw Error(this.errorMessage);
    }
    this.accessCodeResponse = response;
    await this.storeTokens();
    return;
  }
  /**
   *
   * @return {Future}
   */
  async storeTokens() {
    // set tokens for userId doc.
    const userRef = this.db.collection("users").doc(this.userDocId);
    const wahooUserDoc = await userRef.get();
    const wahooUserId = wahooUserDoc.data()["wahoo_user_id"];
    const userQuery = await this.db.collection("users")
        .where("wahoo_user_id", "==", wahooUserId)
        .get();
    userQuery.docs.forEach(async (doc)=>{
      await doc.ref.set(this.tokenData, {merge: true});
    });
    return;
  }
  /**
   * returns accessCodeFields to update database with
   */
  get tokenData() {
    const nowInSecondsSinceEpoch = Math.round(new Date()/1000);
    const createDate = this.accessCodeResponse["created_at"];
    const expiresIn = this.accessCodeResponse["expires_in"];
    let expiryDate = createDate+expiresIn;
    expiryDate = expiryDate || nowInSecondsSinceEpoch+expiresIn;
    return {
      "wahoo_access_token": this.accessCodeResponse["access_token"],
      "wahoo_token_expires_in": this.accessCodeResponse["expires_in"],
      "wahoo_created_at": this.accessCodeResponse["created_at"] || null,
      "wahoo_token_expires_at": expiryDate,
      "wahoo_refresh_token": this.accessCodeResponse["refresh_token"],
      "wahoo_connected": true,
      "devId": this.devId,
      "userId": this.userId,
    };
  }
  /**
   *
   * @return {Future}
   */
  async registerUser() {
    // get user Id either through register of get user calls
    // make request to wahoo to get the user id.
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
      "wahoo_user_id": response["id"],
    };
    const userRef = this.db.collection("users").doc(this.userDocId);
    await userRef.set(updates, {merge: true});
    return;
  }
  /**
   * @return {Object}
   */
  get accessCodeOptions() {
    const _dataString = "code="+
    this.code+
    "&client_id="+this.config[this.devId]["whaooClientId"]+
    "&client_secret="+this.config[this.devId]["wahooSecret"]+
    "&grant_type=authorization_code"+
    "&redirect_uri="+this.callbackBaseUrl+"?state="+this.userId+":"+this.devId;
    return {
      url: "https://api.wahooligan.com/oauth/token?"+_dataString,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json;charset=UTF-8",
      },
    };
  }
  /**
   *
   */
  get refreshCodeOptions() {
    const _dataString = "refresh_token="+
    this.refreshCode+
    "&client_id="+this.config[this.devId]["whaooClientId"]+
    "&client_secret="+this.config[this.devId]["wahooSecret"]+
    "&grant_type=refresh_token";
    return {
      url: "https://api.wahooligan.com/oauth/token?"+_dataString,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer "+this.accessToken,
      },
    };
  }
  /**
   * @return {Object}
   */
  get registerUserOptions() {
    return {
      url: "https://api.wahooligan.com/v1/user",
      method: "GET",
      headers: {
        "Accept": "application/json",
        "Authorization": "Bearer "+this.accessCodeResponse["access_token"],
      },
    };
  }
  /**
   *
   * @param {FirebaseDocument} userDoc
   * @return {Future}
   */
  async getUserToken(userDoc) {
    const userToken = userDoc.data()["wahoo_access_token"];
    this.devId = userDoc.data()["devId"];
    this.userId = userDoc.id; //userDoc.data()["userId"] => need to make sure this is set in the userDoc

    if (this.userId == undefined || this.devId == undefined) {
      throw (new Error("error: userId or DevId not set"));
    }
    if (userDoc.data()["wahoo_token_expires_at"] < new Date()/1000) {
      // token out of date needs to be refreshed
      await this.refreshAndSaveAccessCodes(userDoc.data()["wahoo_refresh_token"], userToken);
      return this.accessCodeResponse["access_token"];
    } else {
      return userToken;
    }
  }
}

module.exports = OauthWahoo;
