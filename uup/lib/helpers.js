/*
* Define helpers for various tasks
*
*/

// Dependencies
const crypto = require('crypto');
const config = require('./config');
// const _data = require('./data');
// const helpers = require('./helpers');
// const path = require('path');

// Container for the module (to be exported)
const helpers = {};

// Create a SHA256 hash
helpers.hash = (str, callback) => {
  if (typeof(str) === 'string' && str.length > 0) {
    // Hash the password
    let hash = crypto.createHmac('sha256', config.hashingSecret).update(str).digest('hex');
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



// Export the module
module.exports = helpers;
