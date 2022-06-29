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
const got = require('got');

//------------------------Set Up of Test Data Project Complete ---------------//

describe("Testing that the developer can set up polar webhook", () => {
    beforeEach( () => {
        // stub out the got functions.
        const getExampleResponse = {
            body: JSON.stringify({
                "data": {
                    "id": "abdf33",
                    "events": "EXERCISE, SLEEP",
                    "url": "https://myapp.example.com/acl_webhook"
                }
            }),
            statusCode: 200

        };
        const deleteExampleResponse = {
            body: JSON.stringify({
                "timestamp": "2019-08-24T14:15:22Z",
                "status": 0,
                "errorType": "string",
                "message": "string",
                "corrId": "string"
            }),
            statusCode: 204,
        };
        const postExampleResponse = {
            body: JSON.stringify({
            "data": {
                "id": "abdf33",
                "events": "EXERCISE, SLEEP",
                "url": "https://myapp.example.com/acl_webhook",
                "signature_secret_key": "abe1f3ae-fd33-11e8-8eb2-f2801f1b9fd1"
                },                  
            }),
            statusCode: 201,
        };
    

        const stubbedGet = sinon.stub(got, "get");
        const stubbedDelete = sinon.stub(got, "delete");
        const stubbedPost = sinon.stub(got, "post");
        stubbedGet.returns(getExampleResponse);
        stubbedDelete.returns(deleteExampleResponse);
        stubbedPost.returns(postExampleResponse);
    });
    afterEach( () => {
        // restore the got functions
        sinon.restore();
    });

    it('should register up polar webhook correctly...', async () => {
        // set the request object with the incorrect provider, correct developerId, devKey and userId
        const req = {url: 'https//test.com/?devId='+testDev+"&action=register"};
        // set the assertions for the expected response object
        const res = {
            send: (url) => {
                assert.equal(url, 'webhook created successfully{"data":{"id":"abdf33","events":"EXERCISE, SLEEP","url":"https://myapp.example.com/acl_webhook","signature_secret_key":"abe1f3ae-fd33-11e8-8eb2-f2801f1b9fd1"}}');
            }
        };

        await myFunctions.polarWebhookSetup(req, res);

    });
    it('should delete a polar webhook correctly...', async () => {
        // set the request object with the incorrect provider, correct developerId, devKey and userId
        const req = {url: 'https//test.com/?devId='+testDev+"&action=delete&webhookId=abdf33"};
        // set the assertions for the expected response object
        const res = {
            send: (url) => {
                assert.equal(url, "webhook deleted successfully");
            }
        };
        
        await myFunctions.polarWebhookSetup(req, res);

    });
    it('should get up polar webhook correctly...', async () => {
        // set the request object with the incorrect provider, correct developerId, devKey and userId
        const req = {url: 'https//test.com/?devId='+testDev+"&action=get"};
        // set the assertions for the expected response object
        const res = {
            send: (url) => {
                assert.equal(url, 'webhook: {"data":{"id":"abdf33","events":"EXERCISE, SLEEP","url":"https://myapp.example.com/acl_webhook"}}');
            }
        };
        
        await myFunctions.polarWebhookSetup(req, res);

    });

}); // End TEST