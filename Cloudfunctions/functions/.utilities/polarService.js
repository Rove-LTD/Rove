/* eslint-disable max-len */
const got = require("got");
/**
* WahooService is a class to help manage the communication with the wahoo
* fitness activity provider
*/
class PolarService {
  /**
  *
  * @param {Object} config
  */
  constructor(config, secret_lookup) {
    this.config = config;
    this.provider = "polar";
    this.polarClientId = config[secret_lookup]["polarClientId"];
    this.polarSecret = config[secret_lookup]["polarSecret"];
  }
  get base64EncodedString() {
    return Buffer.from(this.polarClientId+":"+this.polarSecret)
        .toString("base64");
  }
  /**
   * @param {String} testWorkout
   * @param {String} userId
   */
  async getWebhooks() {
    this.error = false;
    this.errorMessage = "";
    try {
      const response = await this.makeCall("webhooks", "GET");
      if (this.error) {
        console.log("error getting webhooks: "+this.error.message);
        return;
      } else {
        console.log("success - found Polar webhooks");
        return response.body;
      }
    } catch (error) {
      this.error = true;
      this.errorMessage = error;
      return;
    }
  }

  async makeCall(service, callType) {
    const options = {
      url: "https://www.polaraccesslink.com/v3/"+service,
      headers: {
        "Authorization": "Basic "+this.base64EncodedString,
      },
      method: callType,
    };
    let response;
    switch (options.method) {
      case "GET":
        response = await got.get(options);
        break;
    }
    if (response.statusCode == 200) {
      return response;
    } else {
      this.error = true;
      this.errorMessage = "error: "+response.statusCode+" " +response.body;
      return response;
    }
  }

}

module.exports = PolarService;
