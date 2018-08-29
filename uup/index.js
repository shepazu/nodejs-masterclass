/*
* Uup: web service uptime monitor
* Primary file for the API
*
*/

// console.log("Uup?");

// Dependencies
const http = require(`http`);
const https = require(`https`);
const url = require(`url`);
const StringDecoder = require(`string_decoder`).StringDecoder;
const fs = require(`fs`);
const config = require(`./lib/config`);
const handlers = require(`./lib/handlers`);
const helpers = require(`./lib/helpers`);
// const _data = require(`./lib/data`);

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
const unifiedServer = (req, res, port) => {

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
    let chosenHandler = typeof(router[trimPath]) !== `undefined` ? router[trimPath] : handlers.notFound;

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


  //
  // return res.status(200).json({
  //   message: `success!`,
  //   response: `success!`
  // });

};

// Define a request router
const router = {
  'ping': handlers.ping,
  'users': handlers.users,
  'tokens': handlers.tokens,
  'payload': handlers.payload
};
