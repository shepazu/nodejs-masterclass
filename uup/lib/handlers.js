/*
* Define request handlers
*
*/

// Dependencies
const _data = require('./data');
const helpers = require('./helpers');
// const fs = require('fs');
// const path = require('path');

// Container for the module (to be exported)
const handlers = {};

// Users handler
handlers.users = (data, callback) => {
  // Determine if the data method has a handler to route the request to
  const acceptableMethods = ['post', 'get', 'put', 'delete'];
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
  let firstName = typeof(data.payload.firstName) === 'string' && data.payload.firstName.trim().length > 0 ? data.payload.firstName.trim() : null;
  let lastName = typeof(data.payload.lastName) === 'string' && data.payload.lastName.trim().length > 0 ? data.payload.lastName.trim() : null;
  let phone = typeof(data.payload.phone) === 'string' && data.payload.phone.trim().length === 10 ? data.payload.phone.trim() : null;
  let password = typeof(data.payload.password) === 'string' && data.payload.password.trim().length > 0 ? data.payload.password.trim() : null;
  let tosAgreement = typeof(data.payload.tosAgreement) === 'boolean' && data.payload.tosAgreement === true ? true : false;

  // console.log(firstName, lastName, phone, password, tosAgreement);

  if (firstName && lastName && phone && password && tosAgreement) {
    // Make sure that the user doesn't already exist
    _data.read('users', phone, (err, data) => {
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
          _data.create('users', phone, userObj, (err) => {
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
// TODO: only let authenticated users access their own data. Don't let them access anyone else's
handlers._users.get = (data, callback) => {
  // Check that phone number is valid
  let phone = typeof(data.queryStrObj.phone) === 'string' && data.queryStrObj.phone.trim().length === 10 ? data.queryStrObj.phone.trim() : null;

  if (phone) {
    _data.read('users', phone, (err, data) => {
      if (!err && data) {
        // Delete hashed password from our object before returning it to the requester
        delete data.hashedPassword;
        // callback an HTTP status code
        callback(200, data);
      } else {
        callback(404, {'Error': 'No user with that phone number exists'});
      }
    });
  } else {
    // callback an HTTP status code 400: Bad Request
    callback(400, {'Error': 'Missing required field: phone number'});
  }
};


// Users – put
// Required data: phone
// Optional data: firstName, lastName, password (at least one must be specified)
// TODO: only let authenticated users update their own data. Don't let them update anyone else's
handlers._users.put = (data, callback) => {
  // Check for a valid required field
  let phone = typeof(data.payload.phone) === 'string' && data.payload.phone.trim().length === 10 ? data.payload.phone.trim() : null;

  // Check for the optional fields
  let firstName = typeof(data.payload.firstName) === 'string' && data.payload.firstName.trim().length > 0 ? data.payload.firstName.trim() : null;
  let lastName = typeof(data.payload.lastName) === 'string' && data.payload.lastName.trim().length > 0 ? data.payload.lastName.trim() : null;
  let password = typeof(data.payload.password) === 'string' && data.payload.password.trim().length > 0 ? data.payload.password.trim() : null;

  // Error is phone is invalid
  if (phone) {
    if (firstName || lastName || password) {
      // Look up user
      _data.read('users', phone, (err, userData) => {
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
          _data.update('users', phone, userData, (err) => {
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
// TODO: only let authenticated users delete their own data. Don't let them delete anyone else's
// TODO: Clean up (delete) any other data files associated with this user
handlers._users.delete = (data, callback) => {
  // Check that phone number is valid
  let phone = typeof(data.queryStrObj.phone) === 'string' && data.queryStrObj.phone.trim().length === 10 ? data.queryStrObj.phone.trim() : null;

  if (phone) {
    _data.read('users', phone, (err, data) => {
      if (!err && data) {
        // Delete specified user
        _data.delete('users', phone, (err) => {
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
    // callback an HTTP status code 400: Bad Request
    callback(400, {'Error': 'Missing required field: phone number'});
  }
};


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
