/*
* Server-related tasks
*
*/

// console.log("Uup?");

// Dependencies
const http = require(`http`);
const https = require(`https`);
const url = require(`url`);
const path = require(`path`);
const fs = require(`fs`);
const StringDecoder = require(`string_decoder`).StringDecoder;
const util = require(`util`);
const config = require(`./config`);
const handlers = require(`./handlers`);
const helpers = require(`./helpers`);

// Create custom debug logger
const debug = util.debuglog('uup_server');

// Instantiating the server module object
const server = {};

// Instantiating the HTTP server
server.httpServer = http.createServer( (req, res) => {
  server.unifiedServer(req, res, config.httpPort);
});

// Instantiating the HTTPS server
server.httpsServerOptions = {
  'key': fs.readFileSync(path.join(__dirname, '/../https/key.pem')),
  'cert': fs.readFileSync(path.join(__dirname, '/../https/cert.pem'))
};

server.httpsServer = https.createServer(server.httpsServerOptions, (req, res) => {
  server.unifiedServer(req, res, config.httpsPort);
});


// All the server logic for both the HTTP and HTTPS servers
server.unifiedServer = (req, res, port) => {

  // Get the URL and parse it
  const parsedUrl = url.parse(req.url, true);

  //  Get the path from URL
  const path = parsedUrl.pathname;
  const trimPath = path.replace(/^\/+|\/+$/g, ``);

  // Get query string parameters as object
  const queryStrObj = parsedUrl.query;

  // Get HTTP method
  const method = req.method.toLowerCase();

  // Get headers as object
  const headersObj = req.headers;

  // Get the payload, if any
  const decoder = new StringDecoder(`utf-8`);
  let buffer = ``;
  let i = 0;
  req.on(`data`, (data) => {
    buffer += decoder.write(data);
    i++;
    // debug(`Request received with this payload: «${buffer}». (${i})`);
  });
  req.on(`end`, () => {
    buffer += decoder.end();

    // Choose the handler this request should go to.
    //   If one is not found, use the notFound handler
    let chosenHandler = typeof(server.router[trimPath]) !== `undefined` ? server.router[trimPath] : handlers.notFound;

    // Construct the data object to send to handler
    let data = {
      'trimPath': trimPath,
      'queryStrObj': queryStrObj,
      'method': method,
      'headers': headersObj,
      'payload': helpers.parseJSONtoObject(buffer)
    };

    // Route the request to the handler specified in the router
    chosenHandler(data, (statusCode, payload) => {
      // Use the status code called back by the handler, or default to 200
      statusCode = typeof(statusCode) === `number` ? statusCode : 200;

      // Use the payload called back by the handler, or default to and empty object
      payload = typeof(payload) === `object` ? payload : {};

      // Convert the payload to a string
      let payloadStr = JSON.stringify(payload);

      // Return the response
      res.setHeader(`Content-Type`, `application/json`);
      res.writeHead(statusCode);
      res.end(payloadStr);

      // res.end("Uup?\n");

      // Log the request path
      // debug(`Full path: ${path}`);
      // debug(`Request received on path: ${trimPath}, with method: ${method}, and with query string parameters:`, queryStrObj);
      // debug(`Request received with these headers:`, headersObj);
      // debug(`Request received with this payload: «${buffer}»`);

      // If the response is 200, print green, otherwise print red
      let msgFormat = `\x1b[31m%s\x1b[0m`;
      if (statusCode === 200) {
        msgFormat = `\x1b[32m%s\x1b[0m`;
      }
      debug(msgFormat, `Response for ${method.toUpperCase()} to /${trimPath} on port ${port}: ${statusCode} ${payloadStr}`);
    });
  });
};

// Define a request router
server.router = {
  'menu': handlers.menu,
  'users': handlers.users,
  'tokens': handlers.tokens,
  'orders': handlers.orders,
  'checkout': handlers.checkout
};


// Init server
server.init = () => {

  // Start the HTTP server
  server.httpServer.listen(config.httpPort, () => {
    console.log(`\x1b[36m%s\x1b[0m`, `The server is listening on port ${config.httpPort} in ${config.envName} mode over HTTP`);
  });

  // Start the HTTPS server
  server.httpsServer.listen(config.httpsPort, () => {
    console.log(`\x1b[35m%s\x1b[0m`, `The server is listening on port ${config.httpsPort} in ${config.envName} mode over HTTPS`);
  });

};


// Export the module
module.exports = server;
