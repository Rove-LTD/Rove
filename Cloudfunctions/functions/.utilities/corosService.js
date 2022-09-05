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
    this.accessToken = "rg2-6ee918c0c7d3347aeaa1eae04a78d926";
    this.providerUserId = "4211cf484d264f75935047b0d709d76c";
    // for user paulsTestDevcorostestUser
  }
  /**
   * @param {String} testWorkout
   * @param {String} userId
   */
  async getActivityList() {
    this.error = false;
    this.errorMessage = "";
    this.startDate = 20220812 //1000 //1625698800
    this.endDate = 20220912 //new Date.now(); //1662678000
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
