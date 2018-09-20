/*
* Library for storing and rotating logs
*
*/

// Dependencies
const fs = require(`fs`);
const path = require(`path`);
const zlib = require(`zlib`);
const helpers = require(`./helpers`);

// Container for the module (to be exported)
const lib = {};

// Base directory of the data folder
lib.baseDir = path.join(__dirname, `../.logs/`);


// Append a string to a file. Create the file if it doesn't exist
lib.append = (file, str, callback) => {
  // Open the file for writing
  fs.open(`${lib.baseDir}${file}.log`, `a`, (err, fileDescriptor) => {
    if (!err && fileDescriptor) {
      // Append to the file and close it
      fs.appendFile(fileDescriptor, `${str}\n`, (err) => {
        if (!err) {
          // Write to the file and close it
          fs.close(fileDescriptor, (err) => {
            if (!err) {
              callback(false);
            } else {
              callback(`Error closing file that was being appended`);
            }
          });
        } else {
          callback(`Error truncating file`);
        }
      });
    } else {
      callback(`Could not open the file for appending`);
    }
  });
}


// List all of the logs, and optionally include the compressed logs
lib.list = (includeCompressedLogs, callback) => {
  // Open the file for writing
  fs.readdir(`${lib.baseDir}/`, (err, data) => {
    if (!err && data && data.length > 0) {
      let trimFileNames = [];
      data.forEach((fileName) => {
        // Add the .log files
        if (fileName.includes(`.log`)) {
          trimFileNames.push(fileName.replace(`.log`,``));
        } else if (includeCompressedLogs && fileName.includes(`.gz.b64`)) {
          // Add on the .gz files
          trimFileNames.push(fileName.replace(`.gz.b64`,``));
        }
      });
      callback(false, trimFileNames);
    } else {
      callback(err, data);
    }
  });
}


// Compress the contents of one .log file into a .gz.b64 file within the same directory
lib.compress = (logId, newFileId, callback) => {
  const sourceFile = `${logId}.log`;
  const destFile = `${newFileId}.gz.b64`;

  // Read source file
  fs.readFile(`${lib.baseDir}${sourceFile}`, `utf8`, (err, inputStr) => {
    if (!err && inputStr) {
      // Compress the data using gzip
      zlib.gzip(inputStr, (err, buffer) => {
        if (!err && buffer) {
          // Send the data to the destination file
          fs.open(`${lib.baseDir}${destFile}`, `wx`, (err, fileDescriptor) => {
            if (!err && fileDescriptor) {
              // Write to the destination file and close it
              fs.writeFile(fileDescriptor, buffer.toString(`base64`), (err) => {
                if (!err) {
                  // Close the destination file
                  fs.close(fileDescriptor, (err) => {
                    if (!err) {
                      callback(false);
                    } else {
                      callback(`Error closing file: ${err}`);
                    }
                  });
                } else {
                  callback(`Error writing to file: ${err}`);
                }
              });
            } else {
              callback(`Error opening file: ${err}`);
            }
          });
        } else {
          callback(`Error compressing file: ${err}`);
        }
      });
    } else {
      callback(err, data);
    }
  });
};


// Decompress the contents of a .gz.b64 file into a string variable
lib.decompress = (fileId, callback) => {
  const fileName = `${fileId}.gz.b64`;
  // Read compressed file
  fs.readFile(`${lib.baseDir}${fileName}`, `utf8`, (err, str) => {
    if (!err && str) {
      // Decompress the data
      let inputBuffer = Buffer.from(str, `base64`);
      zlib.unzip(inputBuffer, (err, outputBuffer) => {
        if (!err && outputBuffer) {
          const str = outputBuffer.toString();
          callback(false, str);
        } else {
          callback(`Error unzipping file: ${err}`);
        }
      });
    } else {
      callback(`Error decompressing file: ${err}`);
    }
  });
};


// Truncate a log file
lib.truncate = (logId, callback) => {
  // Truncate the file
  fs.truncate(`${lib.baseDir}${logId}.log`, 0, (err) => {
    if (!err) {
      callback(false);
    } else {
      callback(`Error truncating file: ${err}`);
    }
  });
}


// Export the module
module.exports = lib;
