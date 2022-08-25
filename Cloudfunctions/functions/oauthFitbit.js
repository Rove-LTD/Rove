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
    const GCproject = process.env.GCLOUD_PROJECT;
    this.db = firebaseDb;
    this.config = config;
    this.provider = "fitbit";
    this.oauthCallbackUrl =
        "https://us-central1-"+
        GCproject+
        ".cloudfunctions.net/fitbitCallback";
  }
  /**
   * @param {Object} transactionData
   * @param {String} transactionId
   * @return {Future}
   */
  async setDevUser(transactionData, transactionId) { // just call userId
    this.devId = transactionData.devId;
    this.userId = transactionData.userId;
    await this.getDevDoc();
    this.transactionId = transactionId;
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
  * @return {Future}
  */
  async getDevDoc() {
    this.devDoc = await this.db.collection("developers").doc(this.devId).get();
  }
  /**
   * @return {String} userDocId
   */
  get userDocId() {
    return this.devId+this.userId;
  }
  /**
   * @return {String} lookup
   */
  get lookup() {
    return this.devDoc.data()["secret_lookup"];
  }
  /**
   *
   * @param {Object} data - the parsed JSON body returned from the provider
   * @param {Object} transactionData
   * @return {Future}
   */
  async fromCallbackData(data, transactionData) {
    this.error = false;
    this.errorMessage = "";
    this.devId = transactionData.devId;
    this.userId = transactionData.userId;
    await this.getDevDoc();
    this.transactionId = data["state"];
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
  getRedirect() { // choose the right properties for the provider
    this.clientId = this.config[this.lookup]["fitbitClientId"];
    this.clientSecret = this.config[this.lookup]["fitbitToken"];
    this.scope= "activity";
    this.baseUrl = "https://www.fitbit.com/oauth2/authorize?";
    this.state = this.transactionId;
    this.codeChallenge = this.getCodeChallenge();

    const parameters = {
      client_id: this.clientId,
      response_type: "code",
      redirect_url: this.oauthCallbackUrl+"?state="+this.state,
      code_challenge: this.codeChallenge,
      code_challenge_method: "S256",
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
 * @return {Future}
 */
  async storeTokens() {
    // set tokens for userId doc.
    const userRef = this.db.collection("users").doc(this.userDocId);
    const fitbitUserDoc = await userRef.get();
    const fitbitUserId = fitbitUserDoc.data()["fitbit_user_id"];
    const userQuery = await this.db.collection("users")
        .where("fitbit_user_id", "==", fitbitUserId)
        .get();
    userQuery.docs.forEach(async (doc)=>{
      await doc.ref.set(this.tokenData, {merge: true});
    });
    return;
  }
  /**
   * returns accessCodeFields from the response to update database with
   */
  get tokenData() {
    const nowInSecondsSinceEpoch = Math.round(new Date()/1000);
    const createDate = this.accessCodeResponse["created_at"];
    const expiresIn = this.accessCodeResponse["expires_in"];
    let expiryDate = createDate+expiresIn;
    expiryDate = expiryDate || nowInSecondsSinceEpoch+expiresIn;
    return {
      "fitbit_access_token": this.accessCodeResponse["access_token"],
      "fitbit_token_expires_in": this.accessCodeResponse["expires_in"],
      "fitbit_created_at": this.accessCodeResponse["created_at"] || null,
      "fitbit_token_expires_at": expiryDate,
      "fitbit_refresh_token": this.accessCodeResponse["refresh_token"],
      "fitbit_connected": true,
      "devId": this.devId,
      "userId": this.userId,
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
   *
   */
  get refreshCodeOptions() {
    const _dataString = "refresh_token="+
    this.refreshCode+
    "&client_id="+this.config[this.lookup]["fitbitClientId"]+
    "&client_secret="+this.config[this.lookup]["fitbitSecret"]+
    "&grant_type=refresh_token";
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
   *
   * @param {FirebaseDocument} userDoc
   * @return {Object}
   */
  registerUserOptions(userDoc) {
    return {
      url: "https://api.fitbit.com/1/user/"+userDoc.data()["fitbit_user_id"]+"/activities/list.json",
      method: "GET",
      headers: {
        "Accept": "application/json",
        "Authorization": "Bearer "+this.getUserToken(userDoc),
      },
    };
  }
  /**
   *
   * @param {FirebaseDocument} userDoc
   * @return {Future}
   */
  async getUserToken(userDoc) {
    const userToken = userDoc.data()["fitbit_access_token"];
    this.devId = userDoc.data()["devId"];
    this.userId = userDoc.data()["userId"];
    await this.getDevDoc();
    if (this.userId == undefined || this.devId == undefined) {
      throw (new Error("error: userId or DevId not set"));
    }
    if (userDoc.data()["fitbit_token_expires_at"] < new Date()/1000) {
      // token out of date needs to be refreshed
      await this.refreshAndSaveAccessCodes(userDoc.data()["fitbit_refresh_token"], userToken);
      return this.accessCodeResponse["access_token"];
    } else {
      return userToken;
    }
  }
}

module.exports = OauthFitbit;
