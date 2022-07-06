// Follow the instructions in README.md for running these tests.
// Visit https://firebase.google.com/docs/functions/unit-testing to learn more
// about using the `firebase-functions-test` SDK.

// -----------------------COMMON TEST SETUP---------------------------//
// Chai is a commonly used library for creating unit test suites. It is easily 
// extended with plugins.
const chai = require('chai');
const assert = chai.assert;
// Sinon is a library used for mocking or verifying function calls in JavaScript.
const sinon = require('sinon');
// -------------------END COMMON TEST SETUP---------------------------//

// -----------INITIALISE THE ROVE TEST PARAMETERS----------------------------//
const testParameters = require('../testParameters.json');
const firebaseConfig = testParameters.firebaseConfig;
const testUser = testParameters.testUser
const testDev = testParameters.testDev
const test = require('firebase-functions-test')(firebaseConfig, testParameters.testKeyFile);
const myFunctions = require('../../index.js');

// -----------END INITIALISE ROVE TEST PARAMETERS----------------------------//

// -----------------INCLUDE ANY FUNCTIONS TO STUB-----------------------//
// include the functions that we are going to be stub in the
// testing processes - these have to have the same constant
// name as in the function we are testing
const got = require('got');
// ------------------------END OF STUB FUNCTIONS----------------------------//

// --------------START CONNECTSERVICE TESTS----------------------------------//
describe.only("Testing that the developer can call API to connectService() and receive redirection URL: ", () => {
  it('should get error if the provider is not correct...', async () => {
      // set the request object with the incorrect provider, correct developerId, devKey and userId
      const req = {url: 'https//test.com/?devId='+testDev+'&userId='+testUser+'&devKey=test-key&provider=badFormat'};
      // set the assertions for the expected response object
      const res = {
          send: (url) => {
              assert.equal(url, "error: the provider was badly formatted, missing or not supported");
          },
          redirect: (url) => {
            // ignore the redirect call
          },
          status: (code) => {
              assert.equal(code, 400);
          }
      }

      await myFunctions.connectService(req, res);

  });

  it("Should get an error if the devID is not correctly formatted or missing", async () => {
      // set the request object with the correct provider, incorrect developerId and correct userId
      const req = {url: 'https//test.com/?devId='+"incorrectDev"+'&userId='+testUser+'&provider=wahoo'};
      // set the assertions for the expected response object
      const res = {
          send: (url) => {
              assert.equal(url, "error: the developerId was badly formatted, missing or not authorised");
          },
          status: (code) => {
              assert.equal(code, 400);
          }
      }

      await myFunctions.connectService(req, res);
  });

  it("Should get an error if the developer is not correctly authorised", async () => {
      // set the request object with the correct provider, developerId and userId
      const req = {url: 'https//test.com/?devId='+testDev+'&userId='+testUser+'&devKey=wrong-key&provider=wahoo&isRedirect=false'};
      // set the assertions for the expected response object
      const res = {
          send: (url) => {
              assert.equal(url, "error: the developerId was badly formatted, missing or not authorised");
          },
          status: (code) => {
              assert.equal(code, 400);
          }
      }

      await myFunctions.connectService(req, res);
  });

  it("Should get an error if the userId is not provided", async () => {
      // set the request object with the correct provider, developerId and userId
      const req = {url: 'https//test.com/?devId='+testDev+'&devKey=test-key&provider=wahoo&isRedirect=false'};
      // set the assertions for the expected response object
      const res = {
          send: (url) => {
              assert.equal(url, "error: the userId parameter is missing");
          },
          status: (code) => {
              assert.equal(code, 400);
          }
      }

      await myFunctions.connectService(req, res);
  });
  
  it('should get a properly formatted strava redirect url...', async () => {
      // set the request object with the correct provider, developerId and userId
      const req = {url: 'https//test.com/?devId='+testDev+'&userId='+testUser+'&devKey=test-key&provider=strava&isRedirect=false'};
      // set the assertions for the expected response object
      const res = {
          redirect: (url) => {
              assert.equal(url, "https://www.strava.com/oauth/authorize?client_id=72486&response_type=code&redirect_uri=https://us-central1-rove-26.cloudfunctions.net/stravaCallback?userId="+testUser+":"+testDev+"&approval_prompt=force&scope=profile:read_all,activity:read_all");
              recievedStravaUrl = url;
          },
      }

      await myFunctions.connectService(req, res);

  })
  it('should get a properly formatted garmin redirect url...', async () => {
      // set the request object with the correct provider, developerId and userId
      const req = {url: 'https//test.com/?devId='+testDev+'&userId='+testUser+'&devKey=test-key&provider=garmin&isRedirect=false'};
      // set the assertions for the expected response object
      const res = {
          redirect: (url) => {
              assert.include(url, "https://connect.garmin.com/oauthConfirm?oauth_token=");
              assert.include(url, "&oauth_callback=https://us-central1-rove-26.cloudfunctions.net/oauthCallbackHandlerGarmin?oauth_token_secret=");
              assert.include(url, "-userId="+testUser);
              assert.include(url, "-devId="+testDev);
              recievedGarminUrl = url;
          },
      }
      // set up the stub to mimic the response to the Garmin service
      const responseObject = {
          body: "oauth_token=test-Oauth-token&oauth_token_secret=test-Oauth-secret"
      };

      const stubbedcall = sinon.stub(got, "get" );
      stubbedcall.returns(responseObject);

      await myFunctions.connectService(req, res);
      // check the stubbed function was called with the correct arguments
      calledWith = stubbedcall.args[0].toString();
      assert.include(calledWith, "https://connectapi.garmin.com/oauth-service/oauth/request_token?oauth_consumer_key=eb0a9a22-db68-4188-a913-77ee997924a8&oauth_nonce=" );
      assert.include(calledWith, "&oauth_signature_method=HMAC-SHA1&oauth_timestamp=");
      assert.include(calledWith, "&oauth_signature=");
      assert.include(calledWith, "&oauth_version=1.0");

      sinon.restore();


  })
  it('should get a properly formatted polar redirect url...', async () => {
      // set the request object with the correct provider, developerId and userId
      const req = {url: 'https//test.com/?devId='+testDev+'&userId='+testUser+'&devKey=test-key&provider=polar&isRedirect=false'};
      // set the assertions for the expected response object
      const res = {
        redirect: (url) => {
              assert.equal(url, "https://flow.polar.com/oauth2/authorization?client_id=654623e7-7191-4cfe-aab5-0bc24785fdee&response_type=code&redirect_uri=https://us-central1-rove-26.cloudfunctions.net/polarCallback&scope=accesslink.read_all&state="+testUser+":"+testDev);
              recievedPolarUrl = url;
          },
      }

      await myFunctions.connectService(req, res);

  })

  it('should get a properly formatted wahoo redirect url...', async () => {
      // set the request object with the correct provider, developerId and userId
      const req = {url: 'https//test.com/?devId='+testDev+'&userId='+testUser+'&devKey=test-key&provider=wahoo&isRedirect=false'};
      // set the assertions for the expected response object
      const res = {
        redirect: (url) => {
              assert.include(url, "https://api.wahooligan.com/oauth/authorize?");
              assert.include(url, "client_id=iA2JRS_dBkikcb0uEnHPtb6IDt1vDYNbityEEhp801I");
              assert.include(url, "&redirect_uri=https://us-central1-rove-26.cloudfunctions.net/wahooCallback?state=");
              assert.include(url, "state="+testUser+":"+testDev);
          },
      }

      await myFunctions.connectService(req, res);

  })
  it('should go to the redirect function whe isRedirect=undefined', async () => {
    // set the request object with the correct provider, developerId and userId
    const req = {url: 'https//test.com/?devId='+testDev+'&userId='+testUser+'&devKey=test-key&provider=wahoo'};
    // set the assertions for the expected response object
    const res = {
      redirect: (url) => {
            assert.equal(url,"../redirectPage?provider=wahoo&devId="+testDev+"&userId="+testUser+"&devKey=test-key");
        },
    }

    await myFunctions.connectService(req, res);

})
});