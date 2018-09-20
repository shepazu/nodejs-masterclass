/*
* Worker-related tasks
*
*/

// Dependencies
const path = require(`path`);
const fs = require(`fs`);
const http = require(`http`);
const https = require(`https`);
const url = require(`url`);
const util = require(`util`);
const helpers = require(`./helpers`);
const _data = require(`./data`);
const _logs = require(`./logs`);
// const config = require(`./config`);
// const handlers = require(`./handlers`);

// Create custom debug logger
const debug = util.debuglog('uup_cart');

// Instantiating the cart module object
const cart = {};

// Look up all orders, get their data, send to a validator
cart.compileCart = (orders, callback) => {
  // Get all orders
  orders.forEach( (order) => {
    // Read in the order data
    _data.read(`orders`, order, (err, orderData) => {
      if (!err && orderData) {
        // Pass it to the order validator, and let that function continue or log errors as needed
        cart.validateOrderData(orderData);
      } else {
        debug(`Error: could not read one of the orders' data: ${order}`);
      }
    });
  });
};


// Sanity-order the order data
cart.validateOrderData = (orderData, userEmail) => {
  orderData.email = userEmail === helpers.validateEmail(orderData.email) ? helpers.validateEmail(orderData.email) : null;
  orderData = typeof(orderData) ===`object` && orderData !== null ? orderData : {};
  orderData.id = typeof(orderData.id) === `string` && orderData.id.trim().length === 20 ? orderData.id.trim() : null;
  orderData.size = typeof(orderData.size) ===`string` && [`small`, `medium`, `large`].includes(orderData.size) ? orderData.size : null;
  orderData.count = typeof(orderData.count) ===`number` && orderData.count % 1 === 0 && orderData.count >= 1 ? orderData.count : null;
  orderData.toppings = typeof(orderData.toppings) === `object` && orderData.toppings instanceof Array ? orderData.toppings : null;

  // If all orders pass, pass the data along to the next step in the process
  if(orderData.email &&
  orderData.id &&
  orderData.count &&
  orderData.size &&
  orderData.toppings){
    cart.performOrder(orderData);
  } else {
    // If orders fail, log the error and fail silently
    debug("Error: one of the orders is not properly formatted. Skipping.");
  }
};

// Perform the order, send the originalOrderData and the outcome of the process to the next step
cart.performOrder = (originalOrderData) => {
  // Prepare the initial order outcome
  let orderOutcome = {
    'error': false,
    'responseCode': false
  };

  // Mark that the outcome has not yet been set
  let outcomeSent = false;

  // Parse the hostname and the path out of the original order data
  const parsedUrl = url.parse(`${originalOrderData.protocol}://${originalOrderData.url}`, true);
  const hostName = parsedUrl.hostname;
  const path = parsedUrl.path; // using path and not "pathname" because we want the querystring

  // Construct the reqest
  const requestDetails = {
    'protocol': `${originalOrderData.protocol}:`,
    'hostname': hostName,
    'method': originalOrderData.method.toUpperCase(),
    'path': path,
    'timeout': originalOrderData.timeoutSeconds * 1000
  };

  // Instantiate the request object (using either http or https module)
  const _moduleToUse = originalOrderData.protocol === `http` ? http : https;
  const req = _moduleToUse.request(requestDetails, (res) => {
    // Grab the status of the sent request
    const status = res.statusCode;

    // Update the orderOutcome and pass the data along
    orderOutcome.responseCode = status;
    if (!outcomeSent) {
      cart.processOrderOutcome(originalOrderData, orderOutcome);
      outcomeSent = true;
    }
  });

  // Bind to the error event so it doesn't get thrown
  req.on(`error`, (e) => {
    // Update the orderOutcome and pass the data along
    orderOutcome.error = {
      'error': true,
      'value': e
    };

    if (!outcomeSent) {
      cart.processOrderOutcome(originalOrderData, orderOutcome);
      outcomeSent = true;
    }
  });

  // Bind to the timeout event
  req.on(`timeout`, (e) => {
    // Update the orderOutcome and pass the data along
    orderOutcome.error = {
      'error': true,
      'value': `timeout`
    };

    if (!outcomeSent) {
      cart.processOrderOutcome(originalOrderData, orderOutcome);
      outcomeSent = true;
    }
  });

  // End the request
  req.end();
};


// Process the order outcome, update the order data as needed, trigger an alert if needed
// Special logic for accomodating a order that's never been tested before (no alert)
cart.processOrderOutcome = (originalOrderData, orderOutcome) => {
  // Decide if order is considered up or down
  const state = !orderOutcome.error && orderOutcome.responseCode && originalOrderData.successCodes.includes(orderOutcome.responseCode) ? `up` : `down`;

  // Decide if an alert is warranted
  const alertWarranted = originalOrderData.lastOrdered && originalOrderData.state !== state ? true : false;

  // Log the outcome
  const timeOfOrder = Date.now();
  cart.log(originalOrderData, orderOutcome, state, alertWarranted, timeOfOrder);

  // Update the order data
  let newOrderData = originalOrderData;
  newOrderData.state = state;
  newOrderData.lastOrdered = timeOfOrder;

  // Save the updates
  _data.update(`orders`, newOrderData.id, newOrderData, (err) => {
    if (!err) {
      // Send the new order data is the next phase in the process if needed
      if (alertWarranted) {
        cart.alertUserToStatusChange(newOrderData);
      } else {
        debug(`Order outcome has not changed, no alert needed`);
      }
    } else {
      debug(`Error trying to save updates to one of the orders: ${newOrderData.id}`);
    }
  });

};


// Alert the user to the change in their order status
cart.alertUserToStatusChange = (newOrderData) => {
  let msg = `Alert: Your order for ${newOrderData.method.toUpperCase()} ${newOrderData.protocol}://${newOrderData.url} is currently ${newOrderData.state}`;
  helpers.sendTwilioSMS(newOrderData.userPhone, msg, (err) => {
    if (!err) {
      debug(`Success: User was alerted to a change in their order, via SMS: ${msg}`);
    } else {
      debug(`Error: Could not send SMS alert to user who had a state order: ${msg}`);
    }
  });
}


cart.log = (originalOrderData, orderOutcome, state, alertWarranted, timeOfOrder) => {
  // Form the log data
  const logData = {
    'order': originalOrderData,
    'outcome': orderOutcome,
    'state': state,
    'alert': alertWarranted,
    'time': timeOfOrder
  };

  // Convert log to a string
  let logStr = JSON.stringify(logData);

  // Determine log file name
  const logFileName = originalOrderData.id;

  // Append the log string to the file
  _logs.append(logFileName, logStr, (err) => {
    if (!err) {
      debug(`Success: logged to file.`);
    } else {
      debug(`Error: logging to file failed.`);

    }
  });
}

// Timer to execute the worker process once per minute
cart.loop = () => {
  setInterval(() => {
    cart.compileCart();
  }, 1000 * 60);
};


// Rotate (compress) the log files
cart.rotateLogs = () => {
  // List all the non-compressed log files
  _logs.list(false, (err, logs) => {
    if (!err && logs && logs.length > 0) {
      logs.forEach( (logName) => {
        // Compress the data to a different file
        const logId = logName.replace(`.log`, ``);
        const newFileId = `${logId}-${Date.now()}`;

        // Compress the log data
        _logs.compress(logId, newFileId, (err) => {
          if (!err) {
            // Truncate the log
            _logs.truncate(logId, (err) => {
              if (!err) {
                debug(`Success truncating the log file`);
              } else {
                debug(`Error truncating the log file: ${logId}, ${err}`);
              }
            });
          } else {
            debug(`Error: could not compress one of the log files: ${logId}, ${err}`);
          }
        });
      });
    } else {
      debug(`Error: could not find any logs to rotate`);
    }
  });
}

// Timer to execute the log-rotation process once per day
cart.logRotationLoop = () => {
  setInterval(() => {
    cart.rotateLogs();
  }, 1000 * 60 * 60 * 24);
};



// Init cart
cart.processCart = (orders, callback) => {
  // Send to console, in yellow
  console.log(`\x1b[33m%s\x1b[0m`, `Cart is running`);

  // Execute all of the orders immediately
  cart.compileCart();

  // // Call the loop so the orders will execute periodically, to keep the server process alive
  // cart.loop();

  // // Compress all the logs immediately
  // cart.rotateLogs();

  // // Call the compression loop to schedule later compression of the logs
  // cart.logRotationLoop();
};


// Export the module
module.exports = cart;
