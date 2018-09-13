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
const config = require(`./config`);
const handlers = require(`./handlers`);
const helpers = require(`./helpers`);


// TESTING
// TODO: delete this
// _data.create(`test`, `newFile`, {`fizz`: `buzz`}, (err) => {
//   console.log(`error:`, err);
// });
// _data.create(`test`, `newFile`, {`fizz`: `buzz`}, (err) => {
//   console.log(`error:`, err);
// });
// _data.update(`test`, `newFile`, {`foo`: `bar`}, (err) => {
//   console.log(`error:`, err);
// });
// _data.delete(`test`, `newFile`, (err) => {
//   console.log(`error:`, err);
// });
// helpers.sendTwilioSMS('4158375309', 'Is it safe?', (err) => {
//   console.log(`Error:`, err);
// });
///////////////////

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
    // console.log(`Request received with this payload: «${buffer}». (${i})`);
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
      // console.log(`Full path: ${path}`);
      // console.log(`Request received on path: ${trimPath}, with method: ${method}, and with query string parameters:`, queryStrObj);
      // console.log(`Request received with these headers:`, headersObj);
      // console.log(`Request received with this payload: «${buffer}»`);
      console.log(`Returning this response: ${statusCode} ${payloadStr} on port ${port}`);
    });
  });
};

// Define a request router
server.router = {
  'ping': handlers.ping,
  'users': handlers.users,
  'tokens': handlers.tokens,
  'checks': handlers.checks,
  'payload': handlers.payload
};


// Init server
server.init = () => {

  // Start the HTTP server
  server.httpServer.listen(config.httpPort, () => {
    console.log(`The server is listening on port ${config.httpPort} in ${config.envName} mode over HTTP`);
  });

  // Start the HTTPS server
  server.httpsServer.listen(config.httpsPort, () => {
    console.log(`The server is listening on port ${config.httpsPort} in ${config.envName} mode over HTTPS`);
  });

};


// Export the module
module.exports = server;
