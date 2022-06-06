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
  constructor(devId, devsUserTag, config, provider) {
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
  fromCallbackData(provider, data) {
    this.devId = data["devId"];
    this.userId = data["userId"];
    this.code = data["code"];
    this.provider = provider;
    this.status = {redirectUrl: true,
      gotCode: true,
      gotAccessToken: false,
      gotUserData: false,
      tokenExpired: false};
    this.error = false;
    this.errorMessage = "";
    this.redirectUrl = undefined;
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
}

module.exports = Oauth;
