/* eslint-disable max-len */
const got = require("got");
/**
* WahooService is a class to help manage the communication with the wahoo
* fitness activity provider
*/
class corosService {
  /**
  *
  * @param {Object} config
  * @param {String} devId
  */
  constructor(config, devId) {
    this.config = config;
    this.provider = "wahoo";
    this.devId = devId;
    this.accessToken = "rg2-2ea808eaa0ea200c47a13e55477441c5";
    this.providerUserId = "25ae6a09af044c0fbe34c751c9fcdca1";
    // for user paulsTestDevcorostestUser
  }
  /**
   * @param {String} testWorkout
   * @param {String} userId
   */
  async getActivityList() {
    this.error = false;
    this.errorMessage = "";
    this.startDate = 20220904 //1000 //1625698800
    this.endDate = 20220906 //new Date.now(); //1662678000
    try {
      const response = await this.makeCall();
      if (this.error) {
        console.log("error creating workout: "+this.error.message);
        return;
      } else {
        console.log("success - created workout");
        return response.body;
      }
    } catch (error) {
      this.error = true;
      this.errorMessage = error;
      return;
    }
  }

  async makeCall() {
    const options = {
      url: 'https://open.coros.com/v2/coros/sport/list'+
      "?token="+this.accessToken+
      "&openId="+this.providerUserId+
      "&startDate="+this.startDate+
      "&endDate="+this.endDate,
      method: "GET",
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

module.exports = corosService;
