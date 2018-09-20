/*
* Library for storing and rotating logs
*
*/

// Dependencies
const fs = require(`fs`);
const path = require(`path`);
const helpers = require(`./helpers`);

// Container for the module (to be exported)
const lib = {};

// Base directory of the data folder
lib.baseDir = path.join(__dirname, `../.menu/`);

// Read data from a file
lib.read = (callback) => {
  // Open the file for writing
  fs.readFile(`${lib.baseDir}/menu.json`, `utf8`, (err, data) => {
    if (!err && data) {
      // parse data into JSON
      let parsedData = helpers.parseJSONtoObject(data);
      callback(err, parsedData);
    } else {
      callback(err, data);
    }
  });
}


// Verify that the toppings are available
lib.validateToppings = (toppings, callback) => {
  toppings = typeof(toppings) === `object` && toppings instanceof Array ? toppings : null;
  if (toppings) {
    // load menu
    lib.read((err, menu) => {
      if (!err && menu ){
        // confirm that the toppings on the order are available toppings
        const availableToppings = [...menu.toppings];
        let unavailableToppings = [];
        toppings.forEach( (topping) => {
          if (!availableToppings.includes(topping)) {
            unavailableToppings.push(topping);
          }
        });

        // if there are any unavailable toppings, return the list of unvailable toppings; otherwise callback false for no error
        if (!unavailableToppings.length) {
          callback(false)
        } else {
        callback({error: `The following toppings are not available: ${unavailableToppings.join(', ')}`});
        }
      } else {
        callback({error: `could not load menu`});
      }
    });
  }
};



// Export the module
module.exports = lib;
