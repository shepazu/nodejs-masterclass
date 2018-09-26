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
const _menu = require(`./menu`);

// Instantiating the cart module object
const cart = {};

// Look up all orders, get their data, send to a validator
cart.compileCart = async (orders, callback) => {
  // Get all orders
  let cartData = {
    totalPrice: 0,
    orderSummaries: []
  };

  // loop through each order and concatenate all results together
  // NOTE: cannot use forEach here, since it won't work async
  let o = 0;
  const o_len = orders.length;
  for (let order of orders) {
    // Read in the order data
    await _data.read(`orders`, order, async (err, orderData) => {
      if (!err && orderData) {
        // Pass it to the order validator, and let that function continue or log errors as needed
        await cart.validateOrderData(orderData, null, (err, orderCartData) => {
          if (!err && orderCartData) {
            cartData.totalPrice = (((+cartData.totalPrice * 100) + (+orderCartData.price * 100)) / 100).toFixed(2);
            cartData.orderSummaries.push(orderCartData.summary);

            // when all orders have been processed, call back the total price and summaries
            if (++o === o_len) {
              // console.log(cartData);
              callback(false, cartData);
            }
          } else {
            callback({error: `could not validate one of the orders' data: ${order}`});
            // console.log(err);
          }
        });
      } else {
        callback({error: `could not read one of the orders' data: ${order}`});
      }
    });
  };
};


// Sanity-order the order data
cart.validateOrderData = async (orderData, userEmail, callback) => {
  // orderData.email = userEmail === helpers.validateEmail(orderData.email) ? helpers.validateEmail(orderData.email) : null;
  orderData = typeof(orderData) ===`object` && orderData !== null ? orderData : {};
  orderData.email = helpers.validateEmail(orderData.email);
  orderData.id = typeof(orderData.id) === `string` && orderData.id.trim().length === 20 ? orderData.id.trim() : null;
  orderData.size = typeof(orderData.size) ===`string` && [`small`, `medium`, `large`].includes(orderData.size) ? orderData.size : null;
  orderData.count = typeof(orderData.count) ===`number` && orderData.count % 1 === 0 && orderData.count >= 1 ? orderData.count : null;
  orderData.toppings = typeof(orderData.toppings) === `object` && orderData.toppings instanceof Array ? orderData.toppings : null;

  // If all orders pass, pass the data along to the next step in the process
  if(orderData.email &&
    orderData.id &&
    orderData.count &&
    orderData.size &&
    orderData.toppings) {
    await cart.processOrder(orderData, (err, orderCartData) => {
      if (!err && orderCartData) {
        callback(false, orderCartData);
      } else {
        callback({error: `one of the orders could not be processed`});
        console.log(err);
      }
    });
  } else {
    // If orders fail, log the error and fail silently
    callback({error: `one of the orders is not properly formatted. Skipping.`});
  }
};


// Process the order, calculate the total, create a text summary, and callback the results
cart.processOrder = async (orderData, callback) => {
  await _menu.calculatePrice(orderData, (err, price) => {
    if (!err && price) {
      // compose text list of toppings
      const t = orderData.toppings;
      let toppings = (t.join(', ').replace(/,([^,]+)$/,`${t[2]?',':''} and$1`)).replace(/^/, (t[0]?'with ':''));

      // compose text summary of order
      const summary = `${orderData.count} ${orderData.size} pizza${orderData.count > 1 ? 's':''} ${toppings}: $${price.toFixed(2)}`;

      callback(false, {price, summary});
    } else {
      callback({error: err});
    }
  });
};


// Rotate (compress) the order files, with the ids of the payment and email receipt, for future reference by the customer
cart.archiveOrders = () => {
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


// Init cart
cart.processCart = async (orders, callback) => {
  // Send to console, in yellow
  console.log(`\x1b[33m%s\x1b[0m`, `Cart is running`);

  // Execute all of the orders immediately
  await cart.compileCart(orders, callback);

  // // Call the loop so the orders will execute periodically, to keep the server process alive
  // cart.loop();

  // // Compress all the logs immediately
  // cart.rotateLogs();

  // // Call the compression loop to schedule later compression of the logs
  // cart.logRotationLoop();
};


// Export the module
module.exports = cart;
