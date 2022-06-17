/* eslint-disable max-len */
const got = require("got");
/**
* WahooService is a class to help manage the communication with the wahoo
* fitness activity provider
*/
class WahooService {
  /**
  *
  * @param {Object} config
  * @param {String} devId
  */
  constructor(config, devId) {
    this.config = config;
    this.provider = "wahoo";
    this.devId = devId;
    this.accessToken = "sCwEt6mBXXXGshNu9Y_E6puLAz9KosuFx-Mz8T_jehk";
  }
  /**
   * @param {String} testWorkout
   * @param {String} userId
   */
  async createWorkout(testWorkout, wahooUserId) {
    this.providerUserId = wahooUserId;
    this.error = false;
    this.errorMessage = "";
    try {
      const response = await this.makeCall("workouts", "create", testWorkout);
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

  async makeCall(service, callType, data) {
    const options = {
      url: "https://api.wahooligan.com/v1/"+service,
      headers: {
        "Authorization": "Bearer "+this.accessToken,
      },
      method: "POST",
      body:JSON.stringify(data),
    };
    let response;
    switch (options.method) {
      case "POST":
        response = await got.post(options);
        break;
    }
    if (response.statusCode == 200) {
      return response.body;
    } else {
      this.error = true;
      this.errorMessage = "error: "+response.statusCode+" " +response.body;
      return response.body;
    }
  }
}

module.exports = WahooService;
