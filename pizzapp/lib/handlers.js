/*
* Define request handlers
*
*/

// Dependencies
const _data = require(`./data`);
const _email = require(`./email`);
const _menu = require(`./menu`);
const helpers = require(`./helpers`);
const config = require(`./config`);
const cart = require(`./cart`);

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
// Required data: username, email, and streetAddress, password, tosAgreement
// Optional data: none
handlers._users.post = (data, callback) => {
  let email = helpers.validateEmail(data.payload.email);
  let username = typeof(data.payload.username) === `string` && data.payload.username.trim().length > 0 ? data.payload.username.trim() : null;
  let streetAddress = typeof(data.payload.streetAddress) === `string` && data.payload.streetAddress.trim().length > 0 ? data.payload.streetAddress.trim() : null;
  let password = typeof(data.payload.password) === `string` && data.payload.password.trim().length > 0 ? data.payload.password.trim() : null;
  let tosAgreement = typeof(data.payload.tosAgreement) === `boolean` && data.payload.tosAgreement === true ? true : false;

  // console.log(email, username, streetAddress, password, tosAgreement);

  if (email && username && streetAddress && password && tosAgreement) {
    // Make sure that the user doesn't already exist
    _data.read(`users`, email, (err, userData) => {
      if (err) {
        // Hash the password
        let hashedPassword = helpers.hash(password);

        if (hashedPassword) {
          // Create the user object
          let userObj = {
            'email': email,
            'username': username,
            'streetAddress': streetAddress,
            'hashedPassword': hashedPassword,
            'tosAgreement': true
          };

          // Store the user
          _data.create(`users`, email, userObj, (err) => {
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
        callback(400, {'Error': `A user with that email address already exists`});
      }
    });
  } else {
    // callback an HTTP status code 400: Bad Request
    callback(400, {'Error': `Missing required fields`});
  }
};


// Users – get
// Required data: email
// Optional data: none
handlers._users.get = (data, callback) => {
  // Check that email address is valid
  let email = helpers.validateEmail(data.queryStrObj.email);

  if (email) {
    // Only let authenticated users access their own data. Don't let them access anyone else's
    // Get the token from the headers
    let token = typeof(data.headers.token) === `string` ? data.headers.token : null;
    // Verify that the given token from the headers is valid for the email address
    handlers._tokens.verifyToken(token, email, (tokenIsValid) => {
      if (tokenIsValid) {
        // Look up user
        _data.read(`users`, email, (err, userData) => {
          if (!err && userData) {
            // Delete hashed password from our object before returning it to the requester
            delete userData.hashedPassword;
            // callback an HTTP status code
            callback(200, userData);
          } else {
            callback(404, {'Error': `No user with that email address exists`});
          }
        });
      } else {
        callback(403, {'Error': `Missing token in headers, or token is invalid`});
      }
    });
  } else {
    // callback an HTTP status code 400: Bad Request
    callback(400, {'Error': `Missing required field: email address`});
  }
};


// Users – put
// Required data: email
// Optional data: username, streetAddress, password (at least one must be specified)
handlers._users.put = (data, callback) => {
  // Check for a valid required field
  let email = helpers.validateEmail(data.payload.email);

  // Check for the optional fields
  let username = typeof(data.payload.username) === `string` && data.payload.username.trim().length > 0 ? data.payload.username.trim() : null;
  let streetAddress = typeof(data.payload.streetAddress) === `string` && data.payload.streetAddress.trim().length > 0 ? data.payload.streetAddress.trim() : null;
  let password = typeof(data.payload.password) === `string` && data.payload.password.trim().length > 0 ? data.payload.password.trim() : null;

  // Error is email is invalid
  if (email) {
    if (username || streetAddress || password) {
      // Only let authenticated users update their own data. Don't let them update anyone else's
      // Get the token from the headers
      let token = typeof(data.headers.token) === `string` ? data.headers.token : null;
      // Verify that the given token from the headers is valid for the email address
      handlers._tokens.verifyToken(token, email, (tokenIsValid) => {
        if (tokenIsValid) {
          // Look up user
          _data.read(`users`, email, (err, userData) => {
            if (!err && userData) {
              // Update the requested fields
              if (username) {
                userData.username = username;
              }

              if (streetAddress) {
                userData.streetAddress = streetAddress;
              }

              if (password) {
                userData.hashedPassword = helpers.hash(password);
              }

              // Store the new updates
              _data.update(`users`, email, userData, (err) => {
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
    callback(400, {'Error': `Missing required field: email address`});
  }
};


// Users – delete
// Required data: email
// Optional data: none
handlers._users.delete = (data, callback) => {
  // Check that email address is valid
  let email = helpers.validateEmail(data.queryStrObj.email);

  if (email) {
    // Only let authenticated users delete their own data. Don't let them delete anyone else's
    // Get the token from the headers
    let token = typeof(data.headers.token) === `string` ? data.headers.token : null;
    // Verify that the given token from the headers is valid for the email address
    handlers._tokens.verifyToken(token, email, (tokenIsValid) => {
      if (tokenIsValid) {
        _data.read(`users`, email, (err, userData) => {
          if (!err && userData) {
            // Delete specified user
            _data.delete(`users`, email, (err) => {
              if (!err) {
                // TODO: Clean up (delete) any other data files associated with this user
                // Delete each of the orders associated with the user
                let userOrders = typeof(userData.orders) === `object` && userData.orders instanceof Array ? userData.orders : [];
                let ordersToDelete = userOrders.length;
                if (ordersToDelete > 0) {
                  let ordersDeleted = 0;
                  let deletionErrors = false;
                  userOrders.forEach((orderId) => {
                    _data.delete(`orders`, orderId, (err) => {
                      if (err) {
                        deletionErrors = true;
                      }
                      ordersDeleted++;
                      if (ordersDeleted == ordersToDelete) {
                        if (!deletionErrors) {
                          callback(200);
                        } else {
                          callback(500, {'Error': `Errors encountered while attempting to delete all of the user orders. Not all orders may have been deleted from the system successfully.`});
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
    callback(400, {'Error': `Missing required field: email address`});
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
// Required data: email, password
// Optional data: none
handlers._tokens.post = (data, callback) => {
  let email = helpers.validateEmail(data.payload.email);
  let password = typeof(data.payload.password) === `string` && data.payload.password.trim().length > 0 ? data.payload.password.trim() : null;

  if (email && password) {
    // Look up user
    _data.read(`users`, email, (err, userData) => {
      if (!err && userData) {
        // Hash the password
        let hashedPassword = helpers.hash(password);
        if (hashedPassword === userData.hashedPassword) {
          // If valid, create a new token with a random name
          const tokenId = helpers.createRandomString(20);
          // Set expiration date 1 hour in the future
          const expires = Date.now() + 1000 * 60 * 60;
          const tokenObj = {
            'email': email,
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
handlers._tokens.verifyToken = (id, email, callback) => {
  _data.read(`tokens`, id, (err, tokenData) => {
    if (!err && tokenData) {
      // Check that the token is for a given user and has not expired
      if (tokenData.email == email && tokenData.expires > Date.now()) {
        callback(true);
      } else {
        callback(false);
      }
    } else {
      callback(false);
    }
  });
}





// menu handler
handlers.menu = (data, callback) => {
  // Determine if the data method has a handler to route the request to
  const acceptableMethods = [`get`];
  if (-1 !== acceptableMethods[data.method]){
    handlers._menu[data.method](data, callback);
  } else {
    // callback an HTTP status code 405: Method Not Allowed
    callback(405);
  }
};

// Menu private methods
handlers._menu = {};

// Menu – get
// Required data: none
// Optional data: none
handlers._menu.get = (data, callback) => {
  _menu.read((err, data) => {
    if (!err && data) {
      callback(200, data);
    } else {
      callback(404);
    }
  });
}



// orders handler
handlers.orders = (data, callback) => {
  // Determine if the data method has a handler to route the request to
  const acceptableMethods = [`post`, `get`, `put`, `delete`];
  if (-1 !== acceptableMethods[data.method]){
    handlers._orders[data.method](data, callback);
  } else {
    // callback an HTTP status code 405: Method Not Allowed
    callback(405);
  }
};

// Orders private methods
handlers._orders = {};

// Orders – post
// Required data: pizzaSize, pizzaCount, toppings
// Optional data: none
handlers._orders.post = (data, callback) => {
  // Validate inputs
  let pizzaSize = typeof(data.payload.pizzaSize) === `string` && [`small`, `medium`, `large`].includes(data.payload.pizzaSize.toLowerCase()) ? data.payload.pizzaSize : null;
  let pizzaCount = typeof(data.payload.pizzaCount) === `number` && data.payload.pizzaCount % 1 === 0 && data.payload.pizzaCount >= 1 ? data.payload.pizzaCount : null;
  let toppings = typeof(data.payload.toppings) === `object` && data.payload.toppings instanceof Array ? data.payload.toppings : null;

  if (pizzaSize && pizzaCount && toppings) {
    // confirm that all toppings are available
    _menu.validateToppings(data.payload.toppings, (err) => {
      if (!err) {
        // Only let authenticated users access their own data. Don't let them access anyone else's
        // Get the token from the headers
        let token = typeof(data.headers.token) === `string` ? data.headers.token : null;
        // Look up token
        _data.read(`tokens`, token, (err, tokenData) => {
          if (!err && tokenData) {
            const email = tokenData.email;
            // Look up user
            _data.read(`users`, email, (err, userData) => {
              if (!err && userData) {
                let userOrders = typeof(userData.orders) === `object` && userData.orders instanceof Array ? userData.orders : [];
                // Create a random id for the order
                const orderId = helpers.createRandomString(20);

                // Create the order object, and include the user's email
                const orderObj = {
                  'id': orderId,
                  'email': email,
                  'size': pizzaSize,
                  'count': pizzaCount,
                  'toppings': toppings
                };

                // Store the order
                _data.create(`orders`, orderId, orderObj, (err) => {
                  if (!err) {
                    // Add the order id to the user's object
                    userData.orders = userOrders;
                    userData.orders.push(orderId);

                    // Save the new user data
                    _data.update(`users`, email, userData, (err) => {
                      if (!err) {
                        // Return the data about the new order to the requester
                        callback(200, orderObj);
                      } else {
                        console.log(err);
                        callback(500, {'Error': `Could not update the user with the new order`});
                      }
                    });
                  } else {
                    callback(500, {'Error': `Could not create the new order`});
                  }
                });
              } else {
                callback(403);
              }
            });
          } else {
            callback(403);
          }
        });
      } else {
        callback(412, {'Error': err.error});
      }
    });
  } else {
    callback(400, {'Error': `Missing required inputs, or input(s) are invalid`});
  }
}


// Orders – get
// Required data: id
// Optional data: none
handlers._orders.get = (data, callback) => {
  // Check that id is valid
  let id = typeof(data.queryStrObj.id) === `string` && data.queryStrObj.id.trim().length === 20 ? data.queryStrObj.id.trim() : null;

  if (id) {
    _data.read(`orders`, id, (err, orderData) => {
      if (!err && orderData) {
        // Only let authenticated users access their own data. Don't let them access anyone else's
        // Get the token from the headers
        let token = typeof(data.headers.token) === `string` ? data.headers.token : null;
        // Verify that the given token from the headers is valid for the id and belongs to the user
        handlers._tokens.verifyToken(token, orderData.email, (tokenIsValid) => {
          if (tokenIsValid) {
            callback(200, orderData);
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

// Orders – put
// Required data: id
// Optional data: pizzaSize, pizzaCount, toppings (at least one must be specified)
handlers._orders.put = (data, callback) => {
  // TODO: require that user is checked in
  // Check for a valid required field
  let id = typeof(data.payload.id) === `string` && data.payload.id.trim().length === 20 ? data.payload.id.trim() : null;

  // Check for the optional fields
  let pizzaSize = typeof(data.payload.pizzaSize) === `string` && [`small`, `medium`, `large`].includes(data.payload.pizzaSize.toLowerCase()) ? data.payload.pizzaSize : null;
  let pizzaCount = typeof(data.payload.pizzaCount) === `number` && data.payload.pizzaCount % 1 === 0 && data.payload.pizzaCount >= 1 ? data.payload.pizzaCount : null;
  let toppings = typeof(data.payload.toppings) === `object` && data.payload.toppings instanceof Array ? data.payload.toppings : null;

  if (id) {
    if (pizzaSize || pizzaCount || toppings) {
      _data.read(`orders`, id, (err, orderData) => {
        if (!err && orderData) {
          // Only let authenticated users access their own data. Don't let them access anyone else's
          // Get the token from the headers
          let token = typeof(data.headers.token) === `string` ? data.headers.token : null;
          // Verify that the given token from the headers is valid for the id and belongs to the user
          handlers._tokens.verifyToken(token, orderData.email, (tokenIsValid) => {
            if (tokenIsValid) {
              if (pizzaSize) {
                orderData.size = pizzaSize;
              }

              if (pizzaCount) {
                orderData.count = pizzaCount;
              }

              if (toppings) {
                orderData.toppings = toppings;
              }

              // console.log(orderData);

              // Store the new updates
              _data.update(`orders`, id, orderData, (err) => {
                if (!err) {
                  callback(200);
                } else {
                  console.log(err);
                  callback(500, {'Error': `Could not update the order`});
                }
              });

            } else {
              callback(403, {'Error': `Missing token in headers, or token is invalid`});
            }
          });
        } else {
          callback(400, {'Error': `Order id did not exist`});
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

// Orders – delete
// Required data:
// Optional data: none
handlers._orders.delete = (data, callback) => {
  // TODO: require that user is checked in
  // Check that order id is valid
  let id = typeof(data.queryStrObj.id) === `string` && data.queryStrObj.id.trim().length === 20 ? data.queryStrObj.id.trim() : null;

  if (id) {
    _data.read(`orders`, id, (err, orderData) => {
      if (!err && orderData) {
        // Only let authenticated users delete their own data. Don't let them delete anyone else's
        // Get the token from the headers
        let token = typeof(data.headers.token) === `string` ? data.headers.token : null;
        // Verify that the given token from the headers is valid for the id
        handlers._tokens.verifyToken(token, orderData.email, (tokenIsValid) => {
          if (tokenIsValid) {
            // Delete specified order
            _data.delete(`orders`, id, (err) => {
              if (!err) {
                _data.read(`users`, orderData.email, (err, userData) => {
                  if (!err && userData) {
                    let userOrders = typeof(userData.orders) === `object` && userData.orders instanceof Array ? userData.orders : [];

                    // Remove the order from the user's list of orders
                    let orderPosition = userOrders.indexOf(id);
                    if (orderPosition > -1) {
                      userOrders.splice(orderPosition, 1);
                      // Re-save the user orders
                      _data.update(`users`, orderData.email, userData, (err) => {
                        if (!err) {
                          callback(200);
                        } else {
                          callback(500, {'Error': `Could not update the specified user orders`});
                        }
                      });

                    } else {
                      callback(500, {'Error': `Could not find the order in the list of orders on the user object, so could not remove the order from that list`});
                    }
                  } else {
                    callback(500, {'Error': `Could not find the user who created the order, so could not remove the order from the list of orders on the user object`});
                  }
                });
              } else {
                callback(500, {'Error': `Could not delete the specified order`});
              }
            });
          } else {
            callback(403, {'Error': `Missing token in headers, or token is invalid`});
          }
        });
      } else {
        callback(400, {'Error': `Order id did not exist`});
      }
    });
  } else {
    // callback an HTTP status code 400: Bad Request
    callback(400, {'Error': `Missing required field: id`});
  }
}






// orders handler
handlers.checkout = (data, callback) => {
  // Determine if the data method has a handler to route the request to
  const acceptableMethods = [`post`, `get`, `put`, `delete`];
  if (-1 !== acceptableMethods[data.method]){
    handlers._checkout[data.method](data, callback);
  } else {
    // callback an HTTP status code 405: Method Not Allowed
    callback(405);
  }
};

// checkout private methods
handlers._checkout = {};

// checkout – post
// Required data: token, email address
// Optional data: none
handlers._checkout.post = async (data, callback) => {
  // Only let authenticated users access their own data. Don't let them access anyone else's
  // Get the token and email from the headers
  let token = typeof(data.headers.token) === `string` ? data.headers.token : null;
  // let email = helpers.validateEmail(data.headers.email);
  let email = helpers.validateEmail(data.payload.email);
  let payAuthToken = typeof(data.payload.payAuthToken) === `string` && data.payload.payAuthToken.trim().length > 0 ? data.payload.payAuthToken.trim() : null;

  if (token && email && payAuthToken) {
    // Verify that the given token from the headers is valid for the email address
    handlers._tokens.verifyToken(token, email, (tokenIsValid) => {
      if (tokenIsValid) {
        // Look up user
        _data.read(`users`, email, async (err, userData) => {
          if (!err && userData) {
            // Concatenate all orders in the shopping cart, calculate price, and create a receipt
            cart.processCart(userData.orders, async (err, cartData) => {
              if (!err && cartData) {
                console.log(`cartData`, cartData);
                // TODO: require that user is checked in
                // const userEmail = `dev@fizz.studio`; // TODO: get email
                // Compile all active orders from cart

                // Create cart charge info
                let summary = `${cartData.orderSummaries.join('\n')}\n\nTotal: $${cartData.totalPrice}`;
                let creditCard = {
                  object: 'card',
                  number: '4242424242424242',
                  exp_month: '12',
                  exp_year: '2020',
                  cvc: '123',
                  auth: payAuthToken
                };

                // Email receipt
                const orderDetails = {
                  id: `${userData.email}-${helpers.createRandomString(20)}`,
                  customerData: {
                    name: userData.username,
                    email: userData.email,
                    address: userData.streetAddress,
                    creditCard
                  },
                  charge: +cartData.totalPrice,
                  summary
                };

                // Charge credit card
                await helpers.processPayment(email, orderDetails, async (err, paymentData) => {
                  // console.log(`back in _checkout.post`);
                  // console.log(err, data);
                  if (!err && paymentData) {
                    // move all orders to past order archive, include email id in archive
                    // console.log(paymentData.id);
                    orderDetails.paymentId = paymentData.id;

                    await helpers.sendReceiptEmail(email, orderDetails, (err, receiptData) => {
                      if (!err && receiptData) {
                        // move all orders to past order archive, include email id in archive
                        // console.log(cartData);
                        // console.log(receiptData.id);
                        orderDetails.receiptId = receiptData.id;
                        console.log(orderDetails);
                        callback(200, orderDetails.summary);
                      } else {
                        callback(424, {'Error': `Problem sending email receipt`});
                      }
                    });
                  } else {
                    callback(402, {'Error': `Problem processing credit card`});
                  }
                });
              } else {
                console.log(err);
              }
            });
          } else {
            callback(404, {'Error': `No user with that email address exists`});
          }
        });
      } else {
        callback(403, {'Error': `Missing token in headers, or token is invalid`});
      }
    });
  } else {
    callback(403, {'Error': `Missing required fields`});
  }
}



// 'not found' handler
handlers.notFound = (data, callback) => {
  callback(404);
};



// Export the module
module.exports = handlers;
