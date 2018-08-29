/*
* Define request handlers
*
*/

// Dependencies
const _data = require(`./data`);
const helpers = require(`./helpers`);
// const fs = require(`fs`);
// const path = require(`path`);

// Container for the module (to be exported)
const handlers = {};

// Users handler
handlers.users = (data, callback) => {
  // Determine if the data method has a handler to route the request to
  const acceptableMethods = [`post`, `get`, `put`, `delete`];
  if (-1 !== acceptableMethods[data.method]){
    handlers._users[data.method](data, callback);
  } else {
    // callback an HTTP status code 405: Method Not Allowed
    callback(405);
  }
};

// Users private methods
handlers._users = {};

// Users – post
// Required data: firstName, lastName, phone, password, tosAgreement
// Optional data: none
handlers._users.post = (data, callback) => {
  let firstName = typeof(data.payload.firstName) === `string` && data.payload.firstName.trim().length > 0 ? data.payload.firstName.trim() : null;
  let lastName = typeof(data.payload.lastName) === `string` && data.payload.lastName.trim().length > 0 ? data.payload.lastName.trim() : null;
  let phone = typeof(data.payload.phone) === `string` && data.payload.phone.trim().length === 10 ? data.payload.phone.trim() : null;
  let password = typeof(data.payload.password) === `string` && data.payload.password.trim().length > 0 ? data.payload.password.trim() : null;
  let tosAgreement = typeof(data.payload.tosAgreement) === `boolean` && data.payload.tosAgreement === true ? true : false;

  // console.log(firstName, lastName, phone, password, tosAgreement);

  if (firstName && lastName && phone && password && tosAgreement) {
    // Make sure that the user doesn't already exist
    _data.read(`users`, phone, (err, userData) => {
      if (err) {
        // Hash the password
        let hashedPassword = helpers.hash(password);

        if (hashedPassword) {
          // Create the user object
          let userObj = {
            'firstName': firstName,
            'lastName': lastName,
            'phone': phone,
            'hashedPassword': hashedPassword,
            'tosAgreement': true
          };

          // Store the user
          _data.create(`users`, phone, userObj, (err) => {
            if (!err) {
              callback(200);
            } else {
              callback(500, {'Error': 'Could not create the new user'});
            }
          });
        } else {
          callback(500, {'Error': 'Could not hash the user password'});
        }

      } else {
        callback(400, {'Error': 'A user with that phone number already exists'});
      }
    });
  } else {
    // callback an HTTP status code 400: Bad Request
    callback(400, {'Error': 'Missing required fields'});
  }
};


// Users – get
// Required data: phone
// Optional data: none
handlers._users.get = (data, callback) => {
  // Check that phone number is valid
  let phone = typeof(data.queryStrObj.phone) === `string` && data.queryStrObj.phone.trim().length === 10 ? data.queryStrObj.phone.trim() : null;

  if (phone) {
    // Only let authenticated users access their own data. Don't let them access anyone else's
    // Get the token from the headers
    let token = typeof(data.headers.token) === `string` ? data.headers.token : null;
    // Verify that the given token from the headers is valid for the phone number
    handlers._tokens.verifyToken(token, phone, (tokenIsValid) => {
      if (tokenIsValid) {
        // Look up user
        _data.read(`users`, phone, (err, userData) => {
          if (!err && userData) {
            // Delete hashed password from our object before returning it to the requester
            delete userData.hashedPassword;
            // callback an HTTP status code
            callback(200, userData);
          } else {
            callback(404, {'Error': 'No user with that phone number exists'});
          }
        });
      } else {
        callback(403, {'Error': 'Missing token in headers, or token is invalid'});
      }
    })
  } else {
    // callback an HTTP status code 400: Bad Request
    callback(400, {'Error': 'Missing required field: phone number'});
  }
};


// Users – put
// Required data: phone
// Optional data: firstName, lastName, password (at least one must be specified)
handlers._users.put = (data, callback) => {
  // Check for a valid required field
  let phone = typeof(data.payload.phone) === `string` && data.payload.phone.trim().length === 10 ? data.payload.phone.trim() : null;

  // Check for the optional fields
  let firstName = typeof(data.payload.firstName) === `string` && data.payload.firstName.trim().length > 0 ? data.payload.firstName.trim() : null;
  let lastName = typeof(data.payload.lastName) === `string` && data.payload.lastName.trim().length > 0 ? data.payload.lastName.trim() : null;
  let password = typeof(data.payload.password) === `string` && data.payload.password.trim().length > 0 ? data.payload.password.trim() : null;

  // Error is phone is invalid
  if (phone) {
    if (firstName || lastName || password) {
      // Only let authenticated users update their own data. Don't let them update anyone else's
      // Get the token from the headers
      let token = typeof(data.headers.token) === `string` ? data.headers.token : null;
      // Verify that the given token from the headers is valid for the phone number
      handlers._tokens.verifyToken(token, phone, (tokenIsValid) => {
        if (tokenIsValid) {
          // Look up user
          _data.read(`users`, phone, (err, userData) => {
            if (!err && userData) {
              // Update the requested fields
              if (firstName) {
                userData.firstName = firstName;
              }

              if (lastName) {
                userData.lastName = lastName;
              }

              if (password) {
                userData.hashedPassword = helpers.hash(password);
              }

              // Store the new updates
              _data.update(`users`, phone, userData, (err) => {
                if (!err) {
                  callback(200);
                } else {
                  console.log(err);
                  callback(500, {'Error': 'Could not update the user'});
                }
              });
            } else {
              callback(404, {'Error': 'The specified user does not exists'});
            }
          });
        } else {
          callback(403, {'Error': 'Missing token in headers, or token is invalid'});
        }
      })
    } else {
      // callback an HTTP status code 400: Bad Request
      callback(400, {'Error': 'Missing fields to update'});
    }
  } else {
    // callback an HTTP status code 400: Bad Request
    callback(400, {'Error': 'Missing required field: phone number'});
  }
};


// Users – delete
// Required data: phone
// Optional data: none
// TODO: Clean up (delete) any other data files associated with this user
handlers._users.delete = (data, callback) => {
  // Check that phone number is valid
  let phone = typeof(data.queryStrObj.phone) === `string` && data.queryStrObj.phone.trim().length === 10 ? data.queryStrObj.phone.trim() : null;

  if (phone) {
    // Only let authenticated users delete their own data. Don't let them delete anyone else's
    // Get the token from the headers
    let token = typeof(data.headers.token) === `string` ? data.headers.token : null;
    // Verify that the given token from the headers is valid for the phone number
    handlers._tokens.verifyToken(token, phone, (tokenIsValid) => {
      if (tokenIsValid) {
        _data.read(`users`, phone, (err, userData) => {
          if (!err && userData) {
            // Delete specified user
            _data.delete(`users`, phone, (err) => {
              if (!err) {
                callback(200);
              } else {
                callback(500, {'Error': 'Could not delete the specified user'});
              }
            });

          } else {
            callback(400, {'Error': 'Could not find the specified user'});
          }
        });
      } else {
        callback(403, {'Error': 'Missing token in headers, or token is invalid'});
      }
    })
  } else {
    // callback an HTTP status code 400: Bad Request
    callback(400, {'Error': 'Missing required field: phone number'});
  }
};



// Tokens handler
handlers.tokens = (data, callback) => {
  // Determine if the data method has a handler to route the request to
  const acceptableMethods = [`post`, `get`, `put`, `delete`];
  if (-1 !== acceptableMethods[data.method]){
    handlers._tokens[data.method](data, callback);
  } else {
    // callback an HTTP status code 405: Method Not Allowed
    callback(405);
  }
};

// Tokens private methods
handlers._tokens = {};

// Tokens – post
// Required data: phone, password
// Optional data: none
handlers._tokens.post = (data, callback) => {
  let phone = typeof(data.payload.phone) === `string` && data.payload.phone.trim().length === 10 ? data.payload.phone.trim() : null;
  let password = typeof(data.payload.password) === `string` && data.payload.password.trim().length > 0 ? data.payload.password.trim() : null;

  if (phone && password) {
    // Look up user
    _data.read(`users`, phone, (err, userData) => {
      if (!err && userData) {
        // Hash the password
        let hashedPassword = helpers.hash(password);
        if (hashedPassword === userData.hashedPassword) {
          // If valid, create a new token with a random name
          const tokenId = helpers.createRandomString(20);
          // Set expiration date 1 hour in the future
          const expires = Date.now() + 1000 * 60 * 60;
          const tokenObj = {
            'phone': phone,
            'id': tokenId,
            'expires': expires
          }

          // Store the token
          _data.create(`tokens`, tokenId, tokenObj, (err) => {
            if (!err) {
              callback(200, tokenObj);
            } else {
              callback(500, {'Error': 'Could not create the new token'});
            }
          });
        } else {
          callback(400, {'Error': 'Password not match the specified user‘s stored password'});
        }
      } else {
        callback(400, {'Error': 'Could not find the specified user'});
      }
    });
  } else {
    // callback an HTTP status code 400: Bad Request
    callback(400, {'Error': 'Missing required field(s)'});
  }
}

// Tokens – get
// Required data: id
// Optional data: none
handlers._tokens.get = (data, callback) => {
  // Check that id is valid
  let id = typeof(data.queryStrObj.id) === `string` && data.queryStrObj.id.trim().length === 20 ? data.queryStrObj.id.trim() : null;

  if (id) {
    // Look up the token
    _data.read(`tokens`, id, (err, tokenData) => {
      if (!err && tokenData) {
        // callback an HTTP status code and tokenData payload
        callback(200, tokenData);
      } else {
        callback(404, {'Error': 'No user with that id exists'});
      }
    });
  } else {
    // callback an HTTP status code 400: Bad Request
    callback(400, {'Error': 'Missing required field: id'});
  }
}

// Tokens – put
// Required data: id, extend
// Optional data: none
handlers._tokens.put = (data, callback) => {
  let id = typeof(data.payload.id) === `string` && data.payload.id.trim().length === 20 ? data.payload.id.trim() : null;
  let extend = typeof(data.payload.extend) === `boolean` && data.payload.extend === true ? true : false;

  if (id && extend) {
    // Look up the token
    _data.read(`tokens`, id, (err, tokenData) => {
      if (!err && tokenData) {
        // Check to make sure the token isn't already expired
        if (tokenData.expires > Date.now()) {
          tokenData.expires = Date.now() + 1000 * 60 * 60;

          // Store the token
          _data.update(`tokens`, id, tokenData, (err) => {
            if (!err) {
              callback(200);
            } else {
              callback(500, {'Error': 'Could not update the token expiration'});
            }
          });
        } else {
          callback(400, {'Error': 'The token has already expired, and cannot be extended'});
        }
      } else {
        callback(404, {'Error': 'Specified token does not exist'});
      }
    });
  } else {
    // callback an HTTP status code 400: Bad Request
    callback(400, {'Error': 'Missing required field(s) or field(s) are invalid'});
  }
}

// Tokens – delete
// Required data:
// Optional data: none
handlers._tokens.delete = (data, callback) => {
  // Check that id number is valid
  let id = typeof(data.queryStrObj.id) === `string` && data.queryStrObj.id.trim().length === 20 ? data.queryStrObj.id.trim() : null;

  if (id) {
    _data.read(`tokens`, id, (err, tokenData) => {
      if (!err && tokenData) {
        // Delete specified token
        _data.delete(`tokens`, id, (err) => {
          if (!err) {
            callback(200);
          } else {
            callback(500, {'Error': 'Could not delete the specified token'});
          }
        });

      } else {
        callback(400, {'Error': 'Could not find the specified token'});
      }
    });
  } else {
    // callback an HTTP status code 400: Bad Request
    callback(400, {'Error': 'Missing required field: id'});
  }
}


// Tokens – Verify that a given token id is currently valid for a given user
// Required data:
// Optional data: none
handlers._tokens.verifyToken = (id, phone, callback) => {
  _data.read(`tokens`, id, (err, tokenData) => {
    if (!err && tokenData) {
      // Check that the token is for a given user and has not expired
      if (tokenData.phone == phone && tokenData.expires > Date.now()) {
        callback(true);
      } else {
        callback(false);
      }
    } else {
      callback(false);
    }
  });
}



// Sample handler
handlers.ping = (data, callback) => {
  // callback an HTTP status code
  callback(200);
};

// Sample handler
handlers.payload = (data, callback) => {
  // callback an HTTP status code, and a payload object
  callback(200, {'name': 'payload handler'});
};

// 'not found' handler
handlers.notFound = (data, callback) => {
  callback(404);
};



// Export the module
module.exports = handlers;
