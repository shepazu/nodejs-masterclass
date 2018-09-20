/*
* Uup: web service uptime monitor
* Primary file for the API
*
*/

// console.log("Uup?");

// Dependencies
const server = require(`./lib/server`);

// Declare the app
const app = {};

// Init function
app.init = () => {
  // Start the server
  server.init();

};

// Execute
app.init();


// Export the module
module.exports = app;
