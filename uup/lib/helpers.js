/*
* Define helpers for various tasks
*
*/

// Dependencies
const crypto = require(`crypto`);
const querystring = require(`querystring`);
const https = require(`https`);
const config = require(`./config`);
// const _data = require(`./data`);
// const helpers = require(`./helpers`);
// const path = require(`path`);

// Container for the module (to be exported)
const helpers = {};

// Create a SHA256 hash
helpers.hash = (str, callback) => {
  if (typeof(str) === `string` && str.length > 0) {
    // Hash the password
    let hash = crypto.createHmac(`sha256`, config.hashingSecret).update(str).digest(`hex`);
    return hash;
  } else {
    return false;
  }
};


// Parse a JSON string to an Object in all cases without throwing
helpers.parseJSONtoObject = (str) => {
  try {
    let obj = JSON.parse(str);
    return obj;
  } catch (err) {
    return {};
  }
};


// Create a string of random alphanumeric characters, of a given length
helpers.createRandomString = (strLength) => {
  strLength = typeof(strLength) === `number` && strLength > 0 ? strLength : 0;
  if (strLength) {
    // Define all the possible characters that could go into a string
    const possibleCharacters = `abcdefghijklmnopqrstuvwxyz0123456789`;

    // Start the final string
    let str = ``;
    for (let s = 0; strLength > s; ++s) {
      // Get a random character from the possibleCharacters string
      let randomCharacter = possibleCharacters.charAt(Math.floor(Math.random() * possibleCharacters.length));
      // Append this character to the final string
      str += randomCharacter;
    }

    // Return the final string
    return str;
  } else {
    return false;
  }
};


// Send an SMS message via Twilio
helpers.sendTwilioSMS = (phone, msg, callback) => {
  phone = typeof(phone) === `string` && phone.trim().length === 10 ? phone.trim() : null;
  msg = typeof(msg) === `string` && msg.trim().length > 0  && msg.trim().length <= 1600 ? msg.trim() : null;

  if (phone && msg) {
    // Configure the request payload
    const payloadObj = {
      'From': config.twilio.fromPhone,
      'To': `+1${phone}`,
      'Body': msg
    };

    // Stringify the request payload
    let payloadStr = querystring.stringify(payloadObj);

    // Configure the request details
    const requestDetails = {
      'protocol': `https:`,
      'hostname': `api.twilio.com`,
      'method': `POST`,
      'path': `/2010-04-01/Accounts/${config.twilio.accountSid}/Messages.json`,
      'auth': `${config.twilio.accountSid}:${config.twilio.authToken}`,
      'headers': {
        'Content-Type': `application/x-www-form-urlencoded`,
        'Content-Length': Buffer.byteLength(payloadStr)
      }
    };

    // Instantiate the request object
    const req = https.request(requestDetails, (res) => {
      // Grab the status of the sent request
      const status = res.statusCode;
      // Callback successfully if the reqest went through
      if (status === 200 || status === 201) {
        callback(false);
      } else {
        callback(`Status returned was ${status}`);
      }
    });

    // Bind to the error event so it doesn't get thrown
    req.on(`error`, (e) => {
      callback(e);
    });

    // Add the payload
    req.write(payloadStr);

    // End the request
    req.end();
  } else {
    callback(`Given parameters were missing or invalid`);
  }
}


// Export the module
module.exports = helpers;
