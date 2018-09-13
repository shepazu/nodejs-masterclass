/*
* Create and export configuration variables
*
*/

// Container for all the environments
const environments = {};

// Staging (default) environment
environments.staging = {
  'httpPort': 3000,
  'httpsPort': 3001,
  'envName': `staging`,
  'hashingSecret': `thisIsASecret`,
  'maxChecks': 5,
  'twilio-mine': {
    'accountSid': `ACed12466d22bb6c4aebd4e6dd5466ca2a`,
    'authToken': `4d9668f5cf43b16ae34e2a7df2be7759`,
    'fromPhone': `+15736351691`
  },
  'twilio' : {
    'accountSid' : 'ACb32d411ad7fe886aac54c665d25e5c5d',
    'authToken' : '9455e3eb3109edc12e3d8c92768f7a67',
    'fromPhone' : '+15005550006'
  }

};

// Production environment
environments.production = {
  'httpPort': 5000,
  'httpsPort': 5001,
  'envName': `production`,
  'hashingSecret': `thisIsAlsoASecret`,
  'maxChecks': 5,
  'twilio': {
    'accountSid': `ACed12466d22bb6c4aebd4e6dd5466ca2a`,
    'authToken': `4d9668f5cf43b16ae34e2a7df2be7759`,
    'fromPhone': `+19198245482`
  }
};

// Determine which environment was passed in as a command-line argument
let currentEnvironment = typeof(process.env.NODE_ENV) === `string` ? process.env.NODE_ENV.toLowerCase() : ``;

// Check that the current environment is one of the environments defined above;
//   if not default to staging
let environmentToExport = typeof(environments[currentEnvironment]) === `object` ? environments[currentEnvironment] : environments.staging;

// Export the module
module.exports = environmentToExport;
