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
const devTestData = testParameters.devTestData
const devUserData = testParameters.devUserData
const test = require('firebase-functions-test')(firebaseConfig, testParameters.testKeyFile);
const admin = require("firebase-admin");
myFunctions = require('../../index.js');
// -----------END INITIALISE ROVE TEST PARAMETERS----------------------------//

// ---------REQUIRE FUNCTONS TO BE STUBBED----------------------//
// include the functions that we are going to be stub in the
// testing processes - these have to have the same constant
// name as in the function we are testing
const request = require('request');
const strava = require("strava-v3");
//-------------TEST 2--- Test Callbacks from Strava-------
 describe("Check that the deauthorise call fails when parameters are incorrect: ", () => {
  it('call deauthorise and get an error if the devId doesnt exist', async () => {
    req = {
      url: "https://ourDomain.com?devId=incorrect&userId="+testUser+"&provider=wahoo&devKey=test-key",
    };
    res = {
      status: (code) => {
        assert.equal(code, 400);
      },
      send: (message) => {
        assert.equal(message, "error: the developerId was badly formatted, missing or not authorised")
      }
    }
    
    await myFunctions.disconnectService(req, res);

  })

  it('call deauthorise and get an error if the userId doesnt exist', async () => {
    req = {
      url: "https://ourDomain.com?devId="+testDev+"&userId=incorrect&provider=wahoo&devKey=test-key",
    };
    res = {
      status: (code) => {
        assert.equal(code, 400);
      },
      send: (message) => {
        assert.equal(message, "error: the userId was badly formatted or does not exist")
      }
    }
    
    await myFunctions.disconnectService(req, res);

  })

  it('call deauthorise and get an error if the devId not supplied', async () => {
    req = {
      url: "https://ourDomain.com?userId="+testUser+"&provider=wahoo&devKey=test-key",
    };
    res = {
      status: (code) => {
        assert.equal(code, 400);
      },
      send: (message) => {
        assert.equal(message, "error: the developerId parameter is missing")
      }
    }
    
    await myFunctions.disconnectService(req, res);

  })

  it('call deauthorise and get an error if the userId not supplied', async () => {
    req = {
      url: "https://ourDomain.com?devId="+testDev+"&provider=wahoo&devKey=test-key",
    };
    res = {
      status: (code) => {
        assert.equal(code, 400);
      },
      send: (message) => {
        assert.equal(message, "error: the userId parameter is missing")
      }
    }
    
    await myFunctions.disconnectService(req, res);

  })
  it('call deauthorise and get an error if the provider not supplied', async () => {
    req = {
      url: "https://ourDomain.com?devId="+testDev+"&userId="+testUser+"&devKey=test-key",
    };
    res = {
      status: (code) => {
        assert.equal(code, 400);
      },
      send: (message) => {
        assert.equal(message, "error: the provider was badly formatted, missing or not supported")
      }
    }
    
    await myFunctions.disconnectService(req, res);

  })
  it('call deauthorise and get an error if the provider not supported', async () => {
    req = {
      url: "https://ourDomain.com?devId="+testDev+"&userId="+testUser+"&provider=incorrect&devKey=test-key"
    };
    res = {
      status: (code) => {
        assert.equal(code, 400);
      },
      send: (message) => {
        assert.equal(message, "error: the provider was badly formatted, missing or not supported")
      }
    }
    
    await myFunctions.disconnectService(req, res);

  })
  //https://ourDomain.com?devId="+testDev+"&userId="+testUser+"&provider=wahoo&devKey=test-key"

});//End TEST 2--- Test Callbacks for Strava--------------
