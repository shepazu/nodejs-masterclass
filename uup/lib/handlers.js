/*
* Define request handlers
*
*/

// Dependencies
const _data = require(`./data`);
const helpers = require(`./helpers`);
const config = require(`./config`);
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
              callback(500, {'Error': `Could not create the new user`});
            }
          });
        } else {
          callback(500, {'Error': `Could not hash the user password`});
        }

      } else {
        callback(400, {'Error': `A user with that phone number already exists`});
      }
    });
  } else {
    // callback an HTTP status code 400: Bad Request
    callback(400, {'Error': `Missing required fields`});
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
            callback(404, {'Error': `No user with that phone number exists`});
          }
        });
      } else {
        callback(403, {'Error': `Missing token in headers, or token is invalid`});
      }
    });
  } else {
    // callback an HTTP status code 400: Bad Request
    callback(400, {'Error': `Missing required field: phone number`});
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
                  callback(500, {'Error': `Could not update the user`});
                }
              });
            } else {
              callback(404, {'Error': `The specified user does not exists`});
            }
          });
        } else {
          callback(403, {'Error': `Missing token in headers, or token is invalid`});
        }
      });
    } else {
      // callback an HTTP status code 400: Bad Request
      callback(400, {'Error': `Missing fields to update`});
    }
  } else {
    // callback an HTTP status code 400: Bad Request
    callback(400, {'Error': `Missing required field: phone number`});
  }
};


// Users – delete
// Required data: phone
// Optional data: none
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
                // TODO: Clean up (delete) any other data files associated with this user
                // Delete each of the checks associated with the user
                let userChecks = typeof(userData.checks) === `object` && userData.checks instanceof Array ? userData.checks : [];
                let checksToDelete = userChecks.length;
                if (checksToDelete > 0) {
                  let checksDeleted = 0;
                  let deletionErrors = false;
                  userChecks.forEach((checkId) => {
                    _data.delete(`checks`, checkId, (err) => {
                      if (err) {
                        deletionErrors = true;
                      }
                      checksDeleted++;
                      if (checksDeleted == checksToDelete) {
                        if (!deletionErrors) {
                          callback(200);
                        } else {
                          callback(500, {'Error': `Errors encountered while attempting to delete all of the user checks. Not all checks may have been deleted from the system successfully.`});
                        }
                      }
                    });
                  });
                } else {
                  callback(200);
                }
              } else {
                callback(500, {'Error': `Could not delete the specified user`});
              }
            });

          } else {
            callback(400, {'Error': `Could not find the specified user`});
          }
        });
      } else {
        callback(403, {'Error': `Missing token in headers, or token is invalid`});
      }
    });
  } else {
    // callback an HTTP status code 400: Bad Request
    callback(400, {'Error': `Missing required field: phone number`});
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
              callback(500, {'Error': `Could not create the new token`});
            }
          });
        } else {
          callback(400, {'Error': `Password not match the specified user‘s stored password`});
        }
      } else {
        callback(400, {'Error': `Could not find the specified user`});
      }
    });
  } else {
    // callback an HTTP status code 400: Bad Request
    callback(400, {'Error': `Missing required field(s)`});
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
        callback(404, {'Error': `No user with that id exists`});
      }
    });
  } else {
    // callback an HTTP status code 400: Bad Request
    callback(400, {'Error': `Missing required field: id`});
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
              callback(500, {'Error': `Could not update the token expiration`});
            }
          });
        } else {
          callback(400, {'Error': `The token has already expired, and cannot be extended`});
        }
      } else {
        callback(404, {'Error': `Specified token does not exist`});
      }
    });
  } else {
    // callback an HTTP status code 400: Bad Request
    callback(400, {'Error': `Missing required field(s) or field(s) are invalid`});
  }
}

// Tokens – delete
// Required data:
// Optional data: none
handlers._tokens.delete = (data, callback) => {
  // Check that id is valid
  let id = typeof(data.queryStrObj.id) === `string` && data.queryStrObj.id.trim().length === 20 ? data.queryStrObj.id.trim() : null;

  if (id) {
    _data.read(`tokens`, id, (err, tokenData) => {
      if (!err && tokenData) {
        // Delete specified token
        _data.delete(`tokens`, id, (err) => {
          if (!err) {
            callback(200);
          } else {
            callback(500, {'Error': `Could not delete the specified token`});
          }
        });

      } else {
        callback(400, {'Error': `Could not find the specified token`});
      }
    });
  } else {
    // callback an HTTP status code 400: Bad Request
    callback(400, {'Error': `Missing required field: id`});
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





// checks handler
handlers.checks = (data, callback) => {
  // Determine if the data method has a handler to route the request to
  const acceptableMethods = [`post`, `get`, `put`, `delete`];
  if (-1 !== acceptableMethods[data.method]){
    handlers._checks[data.method](data, callback);
  } else {
    // callback an HTTP status code 405: Method Not Allowed
    callback(405);
  }
};

// Checks private methods
handlers._checks = {};

// Checks – post
// Required data: protocol, url, method, successCodes, timeoutSeconds
// Optional data: none
handlers._checks.post = (data, callback) => {
  // Validate inputs
  let protocol = typeof(data.payload.protocol) === `string` && [`http`, `https`].indexOf(data.payload.protocol.toLowerCase()) > -1 ? data.payload.protocol : null;
  let url = typeof(data.payload.url) === `string` && data.payload.url.trim().length > 0 ? data.payload.url.trim() : null;
  let method = typeof(data.payload.method) === `string` && [`post`, `get`, `put`, `delete`].indexOf(data.payload.method.toLowerCase()) > -1 ? data.payload.method : null;
  let successCodes = typeof(data.payload.successCodes) === `object` && data.payload.successCodes instanceof Array && data.payload.successCodes.length > 0 ? data.payload.successCodes : null;
  let timeoutSeconds = typeof(data.payload.timeoutSeconds) === `number` && data.payload.timeoutSeconds % 1 === 0 && data.payload.timeoutSeconds >= 1  && data.payload.timeoutSeconds <= 5 ? data.payload.timeoutSeconds : null;

  if (protocol && url && method && successCodes && timeoutSeconds) {
    // Only let authenticated users access their own data. Don't let them access anyone else's
    // Get the token from the headers
    let token = typeof(data.headers.token) === `string` ? data.headers.token : null;
    // Look up token
    _data.read(`tokens`, token, (err, tokenData) => {
      if (!err && tokenData) {
        const userPhone = tokenData.phone;
        // Look up user
        _data.read(`users`, userPhone, (err, userData) => {
          if (!err && userData) {
            let userChecks = typeof(userData.checks) === `object` && userData.checks instanceof Array ? userData.checks : [];
            // Verify that the user has less than the number of max-checks-per-user
            if (userChecks.length < config.maxChecks) {
              // Create a random id for the check
              const checkId = helpers.createRandomString(20);

              // Create the check object, and include the user's phone
              const checkObj = {
                'id': checkId,
                'userPhone': userPhone,
                'protocol': protocol,
                'url': url,
                'method': method,
                'successCodes': successCodes,
                'timeoutSeconds': timeoutSeconds
              };

              // Store the check
              _data.create(`checks`, checkId, checkObj, (err) => {
                if (!err) {
                  // Add the check id to the user's object
                  userData.checks = userChecks;
                  userData.checks.push(checkId);

                  // Save the new user data
                  _data.update(`users`, userPhone, userData, (err) => {
                    if (!err) {
                      // Return the data about the new check to the requester
                      callback(200, checkObj);
                    } else {
                      console.log(err);
                      callback(500, {'Error': `Could not update the user with the new check`});
                    }
                  });
                } else {
                  callback(500, {'Error': `Could not create the new check`});
                }
              });
            } else {
              callback(400, {'Error': `The user already has the maximum number of checks (${config.maxChecks})`});
            }
          } else {
            callback(403);
          }
        });
      } else {
        callback(403);
      }
    });
  } else {
    callback(400, {'Error': `Missing required inputs, or input(s) are invalid`});
  }
}


// Checks – get
// Required data: id
// Optional data: none
handlers._checks.get = (data, callback) => {
  // Check that id is valid
  let id = typeof(data.queryStrObj.id) === `string` && data.queryStrObj.id.trim().length === 20 ? data.queryStrObj.id.trim() : null;

  if (id) {
    _data.read(`checks`, id, (err, checkData) => {
      if (!err && checkData) {
        // Only let authenticated users access their own data. Don't let them access anyone else's
        // Get the token from the headers
        let token = typeof(data.headers.token) === `string` ? data.headers.token : null;
        // Verify that the given token from the headers is valid for the id and belongs to the user
        handlers._tokens.verifyToken(token, checkData.userPhone, (tokenIsValid) => {
          if (tokenIsValid) {
            callback(200, checkData);
          } else {
            callback(403, {'Error': `Missing token in headers, or token is invalid`});
          }
        });
      } else {
        callback(404);
      }
    });
  } else {
    // callback an HTTP status code 400: Bad Request
    callback(400, {'Error': `Missing required field: id`});
  }
}

// Checks – put
// Required data:
// Optional data: protocol, url, method, successCodes, timeoutSeconds (at least one must be specified)
handlers._checks.put = (data, callback) => {
  // Check for a valid required field
  let id = typeof(data.payload.id) === `string` && data.payload.id.trim().length === 20 ? data.payload.id.trim() : null;

  // Check for the optional fields
  let protocol = typeof(data.payload.protocol) === `string` && [`http`, `https`].indexOf(data.payload.protocol.toLowerCase()) > -1 ? data.payload.protocol : null;
  let url = typeof(data.payload.url) === `string` && data.payload.url.trim().length > 0 ? data.payload.url.trim() : null;
  let method = typeof(data.payload.method) === `string` && [`post`, `get`, `put`, `delete`].indexOf(data.payload.method.toLowerCase()) > -1 ? data.payload.method : null;
  let successCodes = typeof(data.payload.successCodes) === `object` && data.payload.successCodes instanceof Array && data.payload.successCodes.length > 0 ? data.payload.successCodes : null;
  let timeoutSeconds = typeof(data.payload.timeoutSeconds) === `number` && data.payload.timeoutSeconds % 1 === 0 && data.payload.timeoutSeconds >= 1  && data.payload.timeoutSeconds <= 5 ? data.payload.timeoutSeconds : null;

  if (id) {
    if (protocol || url || method || successCodes || timeoutSeconds) {
      _data.read(`checks`, id, (err, checkData) => {
        if (!err && checkData) {
          // Only let authenticated users access their own data. Don't let them access anyone else's
          // Get the token from the headers
          let token = typeof(data.headers.token) === `string` ? data.headers.token : null;
          // Verify that the given token from the headers is valid for the id and belongs to the user
          handlers._tokens.verifyToken(token, checkData.userPhone, (tokenIsValid) => {
            if (tokenIsValid) {
              if (protocol) {
                checkData.protocol = protocol;
              }

              if (url) {
                checkData.url = url;
              }

              if (method) {
                checkData.method = method;
              }

              if (successCodes) {
                checkData.successCodes = successCodes;
              }

              if (timeoutSeconds) {
                checkData.timeoutSeconds = timeoutSeconds;
              }

              console.log(checkData);

              // Store the new updates
              _data.update(`checks`, id, checkData, (err) => {
                if (!err) {
                  callback(200);
                } else {
                  console.log(err);
                  callback(500, {'Error': `Could not update the check`});
                }
              });

            } else {
              callback(403, {'Error': `Missing token in headers, or token is invalid`});
            }
          });
        } else {
          callback(400, {'Error': `Check id did not exist`});
        }
      });
    } else {
      callback(400, {'Error': `Missing required field(s) to update`});
    }
  } else {
    // callback an HTTP status code 400: Bad Request
    callback(400, {'Error': `Missing required field: id`});
  }
}

// Checks – delete
// Required data:
// Optional data: none
handlers._checks.delete = (data, callback) => {
  // Check that phone number is valid
  let id = typeof(data.queryStrObj.id) === `string` && data.queryStrObj.id.trim().length === 20 ? data.queryStrObj.id.trim() : null;

  if (id) {
    _data.read(`checks`, id, (err, checkData) => {
      if (!err && checkData) {
        // Only let authenticated users delete their own data. Don't let them delete anyone else's
        // Get the token from the headers
        let token = typeof(data.headers.token) === `string` ? data.headers.token : null;
        // Verify that the given token from the headers is valid for the id
        handlers._tokens.verifyToken(token, checkData.userPhone, (tokenIsValid) => {
          if (tokenIsValid) {
            // Delete specified check
            _data.delete(`checks`, id, (err) => {
              if (!err) {
                _data.read(`users`, checkData.userPhone, (err, userData) => {
                  if (!err && userData) {
                    let userChecks = typeof(userData.checks) === `object` && userData.checks instanceof Array ? userData.checks : [];

                    // Remove the check from the user's list of checks
                    let checkPosition = userChecks.indexOf(id);
                    if (checkPosition > -1) {
                      userChecks.splice(checkPosition, 1);
                      // Re-save the user checks
                      _data.update(`users`, checkData.userPhone, userData, (err) => {
                        if (!err) {
                          callback(200);
                        } else {
                          callback(500, {'Error': `Could not update the specified user checks`});
                        }
                      });

                    } else {
                      callback(500, {'Error': `Could not find the check in the list of checks on the user object, so could not remove the check from that list`});
                    }
                  } else {
                    callback(500, {'Error': `Could not find the user who created the check, so could not remove the check from the list of checks on the user object`});
                  }
                });
              } else {
                callback(500, {'Error': `Could not delete the specified check`});
              }
            });
          } else {
            callback(403, {'Error': `Missing token in headers, or token is invalid`});
          }
        });
      } else {
        callback(400, {'Error': `Check id did not exist`});
      }
    });
  } else {
    // callback an HTTP status code 400: Bad Request
    callback(400, {'Error': `Missing required field: id`});
  }
}



// Sample handler
handlers.ping = (data, callback) => {
  // callback an HTTP status code
  callback(200);
};

// Sample handler
handlers.payload = (data, callback) => {
  // callback an HTTP status code, and a payload object
  callback(200, {'name': `payload handler`});
};

// 'not found' handler
handlers.notFound = (data, callback) => {
  callback(404);
};



// Export the module
module.exports = handlers;
