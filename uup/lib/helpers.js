/*
* Define helpers for various tasks
*
*/

// Dependencies
const crypto = require(`crypto`);
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



// Export the module
module.exports = helpers;
