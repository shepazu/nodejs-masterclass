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
const debug = util.debuglog('uup_workers');

// Instantiating the workers module object
const workers = {};

// Look up all checks, get their data, send to a validator
workers.gatherAllChecks = () => {
  // Get all checks
  _data.list(`checks`, (err, checks) => {
    if (!err && checks && checks.length > 0) {
      checks.forEach( (check) => {
        // Read in the check data
        _data.read(`checks`, check, (err, originalCheckData) => {
          if (!err && originalCheckData) {
            // Pass it to the check validator, and let that function continue or log errors as needed
            workers.validateCheckData(originalCheckData);
          } else {
            debug(`Error: could not read one of the checks' data: ${check}`);
          }
        });
      });
    } else {
      debug(`Error: could not find any checks to process`);
    }
  });
};


// Sanity-check the check data
workers.validateCheckData = (originalCheckData) => {
  originalCheckData = typeof(originalCheckData) ===`object` && originalCheckData !== null ? originalCheckData : {};
  originalCheckData.id = typeof(originalCheckData.id) === `string` && originalCheckData.id.trim().length === 20 ? originalCheckData.id.trim() : null;
  originalCheckData.userPhone = typeof(originalCheckData.userPhone) === `string` && originalCheckData.userPhone.trim().length === 10 ? originalCheckData.userPhone.trim() : null;
  originalCheckData.protocol = typeof(originalCheckData.protocol) === `string` && [`http`, `https`].indexOf(originalCheckData.protocol) > -1 ? originalCheckData.protocol : null;
  originalCheckData.url = typeof(originalCheckData.url) === `string` && originalCheckData.url.trim().length > 0 ? originalCheckData.url.trim() : null;
  originalCheckData.method = typeof(originalCheckData.method) ===`string` && [`post`, `get`, `put`, `delete`].indexOf(originalCheckData.method) > -1 ? originalCheckData.method : null;
  originalCheckData.successCodes = typeof(originalCheckData.successCodes) ===`object` && originalCheckData.successCodes instanceof Array && originalCheckData.successCodes.length > 0 ? originalCheckData.successCodes : null;
  originalCheckData.timeoutSeconds = typeof(originalCheckData.timeoutSeconds) ===`number` && originalCheckData.timeoutSeconds % 1 === 0 && originalCheckData.timeoutSeconds >= 1 && originalCheckData.timeoutSeconds <= 5 ? originalCheckData.timeoutSeconds : null;

  // If all checks pass, pass the data along to the next step in the process
  if(originalCheckData.id &&
  originalCheckData.userPhone &&
  originalCheckData.protocol &&
  originalCheckData.url &&
  originalCheckData.method &&
  originalCheckData.successCodes &&
  originalCheckData.timeoutSeconds){
    workers.performCheck(originalCheckData);
  } else {
    // If checks fail, log the error and fail silently
    debug("Error: one of the checks is not properly formatted. Skipping.");
  }
};


// Perform the check, send the originalCheckData and the outcome of the process to the next step
workers.performCheck = (originalCheckData) => {
  // Prepare the initial check outcome
  let checkOutcome = {
    'error': false,
    'responseCode': false
  };

  // Mark that the outcome has not yet been set
  let outcomeSent = false;

  // Parse the hostname and the path out of the original check data
  const parsedUrl = url.parse(`${originalCheckData.protocol}://${originalCheckData.url}`, true);
  const hostName = parsedUrl.hostname;
  const path = parsedUrl.path; // using path and not "pathname" because we want the querystring

  // Construct the reqest
  const requestDetails = {
    'protocol': `${originalCheckData.protocol}:`,
    'hostname': hostName,
    'method': originalCheckData.method.toUpperCase(),
    'path': path,
    'timeout': originalCheckData.timeoutSeconds * 1000
  };

  // Instantiate the request object (using either http or https module)
  const _moduleToUse = originalCheckData.protocol === `http` ? http : https;
  const req = _moduleToUse.request(requestDetails, (res) => {
    // Grab the status of the sent request
    const status = res.statusCode;

    // Update the checkOutcome and pass the data along
    checkOutcome.responseCode = status;
    if (!outcomeSent) {
      workers.processCheckOutcome(originalCheckData, checkOutcome);
      outcomeSent = true;
    }
  });

  // Bind to the error event so it doesn't get thrown
  req.on(`error`, (e) => {
    // Update the checkOutcome and pass the data along
    checkOutcome.error = {
      'error': true,
      'value': e
    };

    if (!outcomeSent) {
      workers.processCheckOutcome(originalCheckData, checkOutcome);
      outcomeSent = true;
    }
  });

  // Bind to the timeout event
  req.on(`timeout`, (e) => {
    // Update the checkOutcome and pass the data along
    checkOutcome.error = {
      'error': true,
      'value': `timeout`
    };

    if (!outcomeSent) {
      workers.processCheckOutcome(originalCheckData, checkOutcome);
      outcomeSent = true;
    }
  });

  // End the request
  req.end();
};


// Process the check outcome, update the check data as needed, trigger an alert if needed
// Special logic for accomodating a check that's never been tested before (no alert)
workers.processCheckOutcome = (originalCheckData, checkOutcome) => {
  // Decide if check is considered up or down
  const state = !checkOutcome.error && checkOutcome.responseCode && originalCheckData.successCodes.indexOf(checkOutcome.responseCode) > -1 ? `up` : `down`;

  // Decide if an alert is warranted
  const alertWarranted = originalCheckData.lastChecked && originalCheckData.state !== state ? true : false;

  // Log the outcome
  const timeOfCheck = Date.now();
  workers.log(originalCheckData, checkOutcome, state, alertWarranted, timeOfCheck);

  // Update the check data
  let newCheckData = originalCheckData;
  newCheckData.state = state;
  newCheckData.lastChecked = timeOfCheck;

  // Save the updates
  _data.update(`checks`, newCheckData.id, newCheckData, (err) => {
    if (!err) {
      // Send the new check data is the next phase in the process if needed
      if (alertWarranted) {
        workers.alertUserToStatusChange(newCheckData);
      } else {
        debug(`Check outcome has not changed, no alert needed`);
      }
    } else {
      debug(`Error trying to save updates to one of the checks: ${newCheckData.id}`);
    }
  });

};


// Alert the user to the change in their check status
workers.alertUserToStatusChange = (newCheckData) => {
  let msg = `Alert: Your check for ${newCheckData.method.toUpperCase()} ${newCheckData.protocol}://${newCheckData.url} is currently ${newCheckData.state}`;
  helpers.sendTwilioSMS(newCheckData.userPhone, msg, (err) => {
    if (!err) {
      debug(`Success: User was alerted to a change in their check, via SMS: ${msg}`);
    } else {
      debug(`Error: Could not send SMS alert to user who had a state check: ${msg}`);
    }
  });
}


workers.log = (originalCheckData, checkOutcome, state, alertWarranted, timeOfCheck) => {
  // Form the log data
  const logData = {
    'check': originalCheckData,
    'outcome': checkOutcome,
    'state': state,
    'alert': alertWarranted,
    'time': timeOfCheck
  };

  // Convert log to a string
  let logStr = JSON.stringify(logData);

  // Determine log file name
  const logFileName = originalCheckData.id;

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
workers.loop = () => {
  setInterval(() => {
    workers.gatherAllChecks();
  }, 1000 * 60);
};


// Rotate (compress) the log files
workers.rotateLogs = () => {
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
workers.logRotationLoop = () => {
  setInterval(() => {
    workers.rotateLogs();
  }, 1000 * 60 * 60 * 24);
};



// Init workers
workers.init = () => {
  // Send to console, in yellow
  console.log(`\x1b[33m%s\x1b[0m`, `Background workers are running`);

  // Execute all of the checks immediately
  workers.gatherAllChecks();

  // Call the loop so the checks will execute periodically, to keep the server process alive
  workers.loop();

  // Compress all the logs immediately
  workers.rotateLogs();

  // Call the compression loop to schedule later compression of the logs
  workers.logRotationLoop();
};


// Export the module
module.exports = workers;
