/*
* Library for storing and serving menu
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
// NOTE: this simply checks a static list, but might be repurposed to check active stock
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


// Calculate price of order
lib.calculatePrice_old = (orderData, callback) => {
  orderData = typeof(orderData) ===`object` && orderData !== null ? orderData : {};
  orderData.size = typeof(orderData.size) ===`string` && [`small`, `medium`, `large`].includes(orderData.size) ? orderData.size : null;
  orderData.count = typeof(orderData.count) ===`number` && orderData.count % 1 === 0 && orderData.count >= 1 ? orderData.count : null;
  orderData.toppings = typeof(orderData.toppings) === `object` && orderData.toppings instanceof Array ? orderData.toppings : null;

  if (orderData.id &&
    orderData.count &&
    orderData.size &&
    orderData.toppings) {
    // load menu
    lib.read((err, menu) => {
      if (!err && menu ){
        // get base prices
        const pizza = menu.pizzas[orderData.size];
        const basePrice = +pizza.price.replace(`$`,``);
        const perTopping = +pizza.toppings.replace(`$`,``);

        // calculate total prices
        const toppingPrice = helpers.multiplyFloats([perTopping, orderData.toppings.length]);
        const pizzaPrice = helpers.addFloats([basePrice, toppingPrice]);
        const totalPrice = helpers.multiplyFloats([pizzaPrice, orderData.count]);

        callback(false, totalPrice);
      } else {
        callback({error: `could not load menu`});
      }
    });
  } else {
    callback({error: `missing parameters`});
  }
};


// Calculate price of order
lib.calculatePrice = async (orderData, callback) => {
    lib.read((err, menu) => {
      if (!err && menu ){
        // get base prices
        const pizza = menu.pizzas[orderData.size];
        const basePrice = +pizza.price.replace(`$`,``) * 100;
        const perTopping = +pizza.toppings.replace(`$`,``) * 100;

        // calculate total prices
        const toppingPrice = orderData.toppings.length * perTopping;
        const pizzaPrice = basePrice + toppingPrice;
        const totalPrice = (pizzaPrice * orderData.count) / 100;

        callback(false, totalPrice);
      } else {
        callback({error: `could not load menu`});
      }
    });
};



// Export the module
module.exports = lib;
