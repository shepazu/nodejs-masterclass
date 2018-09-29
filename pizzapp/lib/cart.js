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
              callback(false, cartData);
            }
          } else {
            callback({error: `could not validate one of the orders' data: ${order}`});
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


// Delete the order files, and create an archived order with the ids of the payment and email receipt, for future reference by the customer
cart.archiveOrders = (userData, orderDetails, callback) => {
  // Store the archived order in a JSON file
  _data.create(`orders`, orderDetails.id, orderDetails, (err) => {
    if (!err) {
      let undeletedOrders = [];
      // Loop through all orders to delete old order files, to empty the cart
      while (userData.orders.length) {
        // Remove order from user's list of orders
        let order = userData.orders.pop();
        // Delete order file
        _data.delete(`orders`, order, (err) => {
          // if the order can't be deleted, add to list of undeleted orders
          if (err) {
            undeletedOrders.push(order)
          }
        });
      }

      // Create status message for file deletion operation
      let statusMsg = ``;
      if (undeletedOrders.length) {
        statusMsg = `Could not delete the specified orders: ${undeletedOrders.join(',')}.`;
      }

      // update user information
      // TEMP: assume we don't want to lose undeleted orders at thsi point
      userData.orders = undeletedOrders;

      // Save the new user data
      _data.update(`users`, userData.email, userData, (err) => {
        if (!err) {
          // Return the data about the new order to the requester
          callback(false);
        } else {
          callback({'Error': `Could not update the user with the new order. ${statusMsg}`});
        }
      });
    } else {
      callback({'Error': `Could not create the archived order`});
    }
  });
}


// Init cart
cart.processCart = async (orders, callback) => {
  // Send to console, in yellow
  console.log(`\x1b[33m%s\x1b[0m`, `Cart is running`);

  // Execute all of the orders immediately
  await cart.compileCart(orders, callback);
};


// Export the module
module.exports = cart;
