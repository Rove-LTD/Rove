class Oauth {
    devId;
    userId;
    roveUserId;
    provider;
    redirectUrl;
    status;
    error;
    errorMessage;
    redurectUrl;

    constructor (devId, devsUserTag, config, provider) {
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
    
    fromCallbackData(provider, data) {
        this.devId = data["devId"];
        this.userId = data['userId'];
        this.code = data['code'];
        this.provider = provider;
        this.status = {redirectUrl: true,
            gotCode: true,
            gotAccessToken: false,
            gotUserData: false,
            tokenExpired: false};
        this.error = false;
        this.errorMessage = "";
        this.redirectUrl = undefined;
    };

    getRedirect() {
        switch (this.provider) {
            case "polar":
                this.clientId = this.config[devId]["polarClientId"];
                this.clientSecret = this.config[devId]["polarSecret"];
                this.callbackBaseUrl = "https://us-central1-rove-26.cloudfunctions.net/polarCallback";
                this.baseUrl = "https://flow.polar.com/oauth2/authorization?"
                this.scope =  "accessLink.read_all";
                this.state = this.userId+":"+this.devId;
                break;
            case "wahoo":
                this.clientId = this.config[this.devId]["wahooClientId"];
                this.clientId = this.config[this.devId]["wahooSecret"];
                this.callbackBaseUrl = "https://us-central1-rove-26.cloudfunctions.net/wahooCallback";
                this.scope = "email%20user_read%20workouts_read%20offline_data";
                this.state = this.userId+":"+this.devId;
                this.baseUrl = "https://connect.wahoo.com//authorization?"
                break;
            case "strava":
                this.clientId = this.config[devId]["stravaClientId"];
                this.clientId = this.config[devId]["stravaSecret"];
                this.callbackBaseUrl = "https://us-central1-rove-26.cloudfunctions.net/stravaCallback";
                break;
            case "garmin":
                this.clientId = this.config[devId]["garminClientId"];
                this.clientId = this.config[devId]["garminClientId"];
                this.callbackBaseUrl = "https://us-central1-rove-26.cloudfunctions.net/oauthCallbackHandlerGarmin";
                break;
            default:
                this.error = true;
                this.errorMessage = "error: the provider was badly formatted, missing or not supported";
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
            const encodedValue = parameters[k];
            const encodedKey = k;
            if (encodedValue != undefined) {
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