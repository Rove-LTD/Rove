/**
 * Oauth is a class to help manage the communication with the various
 * helth providers
 */

class Oauth {
  /**
   *
   * @param {String} devId
   * @param {String} devsUserTag
   * @param {Object} config
   * @param {String} provider
   */
  constructor(devId, devsUserTag, config, provider, firebaseDb) {
    this.db = firebaseDb;
    this.devId = devId;
    this.config = config;
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
  fromCallbackData(provider, config, data, firebaseDb) {
    this.db = firebaseDb;
    this.error = false;
    this.errorMessage = "";
    this.config = config;
    if (provider == ("polar" || "wahoo")) {
      _state = data["state"].split(":");
    }
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
        this.errorMessage = "Valid code not received from provider"
      }
    } else if (this.devId == "" || undefined || null) {
      this.error = true;
      this.errorMessage = "valid state of devId not received from provider";
    }
  }
  /**
   *
   * @return {String}
   */
  getRedirect() {
    switch (this.provider) {
      case "polar":
        this.clientId = this.config[this.devId]["polarClientId"];
        this.clientSecret = this.config[this.devId]["polarSecret"];
        this.callbackBaseUrl = "https://us-central1-rove-26.cloudfunctions.net/polarCallback";
        this.baseUrl = "https://flow.polar.com/oauth2/authorization?";
        this.scope = "accessLink.read_all";
        this.state = this.userId+":"+this.devId;
        break;
      case "wahoo":
        this.clientId = this.config[this.devId]["wahooClientId"];
        this.clientSecret = this.config[this.devId]["wahooSecret"];
        this.callbackBaseUrl = "https://us-central1-rove-26.cloudfunctions.net/wahooCallback";
        this.scope = "email%20user_read%20workouts_read%20offline_data";
        this.state = this.userId+":"+this.devId;
        this.baseUrl = "https://connect.wahoo.com//authorization?";
        break;
      case "strava":
        this.clientId = this.config[this.devId]["stravaClientId"];
        this.clientSecret = this.config[this.devId]["stravaSecret"];
        this.callbackBaseUrl = "https://us-central1-rove-26.cloudfunctions.net/stravaCallback";
        break;
      case "garmin":
        this.oauth_consumer_key = this.config[this.devId]["oauth_consumer_key"];
        this.consumerSecret = this.config[this.devId]["consumerSecret"];
        this.callbackBaseUrl = "https://us-central1-rove-26.cloudfunctions.net/oauthCallbackHandlerGarmin";
        break;
      default:
        this.error = true;
        this.errorMessage =
          "error: the provider was badly formatted, missing or not supported";
        return "";
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
 */
  async getAndSaveAccessCodes() {
    await request.post(this.accessCodeOptions, async (error, response, body) => {
      if (!error && response.statusCode == 200) {
      // this is where the tokens come back.
        this.accessCodeResponse = JSON.parse(body);
        await registerUser();
        await storeTokens(userId, devId, JSON.parse(body), db);
        // send a response now to endpoint for devId confirming success
        // await sendDevSuccess(devId); //TODO: create dev success post.
        // userResponse = "Some good redirect.";
        return;
      } else {
        this.error = true;
        this.errorMessage = "Error: "+response.statusCode+":"+body.toString()+" please close this window and try again"
        console.log(JSON.parse(body));
        // send an error response to dev.
        // TODO: create dev fail post.
        // userResponse = "Some bad redirect";
      }
    });
    return;
  }

  async storeTokens() {

    // set tokens for userId doc.
    const userRef = db.collection("users").doc(userId);
    await userRef.set(parameters, {merge: true});
    // assign userId for devId.
    // const devRef = db.collection("developers").doc(devId);
    // write resultant message to dev endpoint.
    return;
  }

  get parameters() {
    switch (this.provider) {
      case "polar":
        return {
          "polar_access_token": this.accessCodeResponse["access_token"],
          "polar_token_type": this.accessCodeResponse["token_type"],
          // "polar_token_expires_at": data["expires_at"], PVTODO: need to calculate from the expires in which is in seconds from now.
          "polar_token_expires_in": this.accessCodeResponse["expires_in"],
          "polar_connected": true,
          "polar_user_id": this.accessCodeResponse["x_user_id"],
        };  
      case "wahoo":
        return {
          "wahoo_access_token": this.accessCodeResponse["access_token"],
          "wahoo_token_type": this.accessCodeResponse["token_type"],
          // "polar_token_expires_at": data["expires_at"], PVTODO: need to calculate from the expires in which is in seconds from now.
          "wahoo_token_expires_in": this.accessCodeResponse["expires_in"],
          "wahoo_connected": true,
          "wahoo_user_id": this.accessCodeResponse["x_user_id"],
        };  
    }

  }

  async registerUser() {

    // if the user needs to be registered then register them
    if (this.devId = "polar") {
      // make request to polar to register the user.
      await request.post(this.registerUserOptions, async (error, response, body) => {
        if (!error && response.statusCode == 200) {
          
          const updates = {
            "polar_registration_date": JSON.parse(body)["registration-date"],
          };
          const userRef = db.collection("users").doc(userId);
          await userRef.set(updates, {merge: true});
        } else if (response.statusCode == 409) {
          // user already registered
          message = "you are already registered with Polar - there is no need to re-register";
        } else {
          console.log("error registering polar user: "+response.statusCode);
        }
      });
    } else if (this.devId = "wahoo") {
      // do registration is needed PV TODO
    }

    return;
  }

  get accessCodeOptions() {
    switch (this.provider) {
      case "polar":
        var _clientIdClientSecret = 
          config[devId]["polarClientId"]+
            ":"+config[devId]["polarSecret"];
        var _buffer = 
          new Buffer.from(_clientIdClientSecret); // eslint-disable-line
        var _base64String = _buffer.toString("base64");
        var _dataString = "code="+
        code+
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
        var _clientIdClientSecret = 
        config[devId]["wahooClientId"]+
          ":"+config[devId]["wahooSecret"];
        var _buffer = 
          new Buffer.from(_clientIdClientSecret); // eslint-disable-line
        var _base64String = _buffer.toString("base64");
        var _dataString = "code="+
        code+
        "&grant_type=authorization_code"+
        "&redirect_uri=https://us-central1-rove-26.cloudfunctions.net/wahooCallback";
        return {
          url: "https://wahoo.com/v2/oauth2/token",
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            "Accept": "application/json;charset=UTF-8",
            "Authorization": "Basic "+_base64String,
          },
          body: _dataString,
        };
        default:
          this.error = true;
          this.errorMessage = "couldn't set secrets, invalid provider"
    }
  }
  get registerUserOptions() {
    switch (this.provider) {
      case "polar":
        var dataString = "{member-id"+this.userId+"</member-id></register>";
        return {
          url: "https://www.polaraccesslink.com/v3/users",
          method: "POST",
          headers: {
            "Content-Type": "application/xml",
            "Accept": "application/json",
            "Authorization": "Bearer "+this.accessCodeResponse["access_token"],
          },
          body: dataString,
        };
        break;
      case "wahoo":
        var dataString = "{member-id"+this.userId+"</member-id></register>";
        return {
          url: "https://www.wahoo.com/v3/users",
          method: "POST",
          headers: {
            "Content-Type": "application/xml",
            "Accept": "application/json",
            "Authorization": "Bearer "+this.accessCodeResponse["access_token"],
          },
          body: dataString,
        };
        break;
        default:
          this.error = true;
          this.errorMessage =
            "couldn't set register user options, invalid provider";
          break;
    }
  }
  registerWebhook() {

  }


}

module.exports = Oauth;
