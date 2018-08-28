/*
* Hello World: NodeJS Master Class Homework Assignment #1
* Primary file for the API
*
*/

// Dependencies
const http = require('http');
const https = require('https');
const url = require('url');
const StringDecoder = require('string_decoder').StringDecoder;
const fs = require('fs');
const config = require('./config');

// Instantiating the HTTP server
const httpServer = http.createServer( (req, res) => {
  unifiedServer(req, res, config.httpPort);
});

// Start the server, and have it listen on port 3000
httpServer.listen(config.httpPort, () => {
  console.log(`The server is listening on port ${config.httpPort} in ${config.envName} mode over HTTP`);
});


// Instantiating the HTTP server
const httpsServerOptions = {
  'key': fs.readFileSync('./https/key.pem'),
  'cert': fs.readFileSync('./https/cert.pem')
};

const httpsServer = https.createServer(httpsServerOptions, (req, res) => {
  unifiedServer(req, res, config.httpsPort);
});

// Start the server, and have it listen on port 3000
httpsServer.listen(config.httpsPort, () => {
  console.log(`The server is listening on port ${config.httpsPort} in ${config.envName} mode over HTTPS`);
});


// All the server logic for both the HTTP and HTTPS servers
const unifiedServer = (req, res) => {

  // Get the URL and parse it
  const parsedUrl = url.parse(req.url, true);

  //  Get the path from URL
  const path = parsedUrl.pathname;
  const trimPath = path.replace(/^\/+|\/+$/g, '');

  // Get query string parameters as object
  const queryStrObj = parsedUrl.query;

  // Get HTTP method
  const method = req.method.toLowerCase();

  // Get headers as object
  const headersObj = req.headers;

  // Get the payload, if any
  const decoder = new StringDecoder('utf-8');
  let buffer = '';
  req.on('data', (data) => {
    buffer += decoder.write(data);
  });
  req.on('end', () => {
    buffer += decoder.end();

    // Choose the handler this request should go to.
    //   If one is not found, use the notFound handler
    let chosenHandler = typeof(router[trimPath]) !== 'undefined' ? router[trimPath] : handlers.notFound;

    // Construct the data object to send to handler
    let data = {
      'trimPath': trimPath,
      'queryStrObj': queryStrObj,
      'method': method,
      'headers': headersObj,
      'payload': buffer
    };

    // Route the request to the handler specified in the router
    chosenHandler(data, (statusCode, payload) => {
      // Use the status code called back by the handler, or default to 200
      statusCode = typeof(statusCode) === 'number' ? statusCode : 200;

      // Use the payload called back by the handler, or default to and empty object
      payload = typeof(payload) === 'object' ? payload : {};

      // Convert the payload to a string
      let payloadStr = JSON.stringify(payload);

      // Return the response
      res.setHeader('Content-Type', 'application/json');
      res.writeHead(statusCode);
      res.end(payloadStr);
    });
  });
};

// Define handlers
const handlers = {};

// Hello World handler
handlers.hello = (data, callback) => {
  // compose a JSON payload, containing the user's queries, headers, and POST body content (if any)
  let response = {};
  response.query = data.queryStrObj;
  response.headers = data.headers;
  response.content = data.payload;

  // callback an HTTP status code, and the JSON payload
  callback(200, response);
};

// 'not found' handler
handlers.notFound = (data, callback) => {
  callback(404);
};

// Define a request router
const router = {
  'hello': handlers.hello
};
