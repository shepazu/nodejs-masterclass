/*
* Manage email for receipts
*
*/

// Dependencies
const https = require(`https`);
const config = require(`./config`);

// Container for the module (to be exported)
const email = {};

// Send an SMS message via Twilio
email.sendEmailReceipt = (email, msg, callback) => {
  // TODO: replace phone checks with email
  const emailRegex = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
  email = typeof(email) === `string` && email.trim().length === 10 ? email.trim() : null;
  msg = typeof(msg) === `string` && msg.trim().length > 0  && msg.trim().length <= 1600 ? msg.trim() : null;

  if (email && msg) {
    // Configure the request payload
    const payloadObj = {
      'From': config.twilio.fromPhone,
      'To': email,
      'Body': msg
    };

    // Stringify the request payload
    let payloadStr = querystring.stringify(payloadObj);
    // Configure the request details
    const receiptDetails = {
      'from': `mailgun@fizz.studio`,
      'to': `test@fizz.studio`,
      'subject': `Hello`,
      'text': `Testing the Mailgun API!`
    };

    // Configure the request details
    const requestDetails = {
      'protocol': `https:`,
      'hostname': `api.twilio.com`,
      'method': `POST`,
      'path': `/2010-04-01/Accounts/${config.twilio.accountSid}/Messages.json`,
      'auth': `${config.twilio.accountSid}:${config.twilio.authToken}`,
      'headers': {
        'Content-Type': `application/x-www-form-urlencoded`,
        'Content-Length': Buffer.byteLength(payloadStr)
      }
    };
// curl -s --user 'api:YOUR_API_KEY' \
//     https://api.mailgun.net/v3/YOUR_DOMAIN_NAME/messages \
//     -F from='Excited User <mailgun@YOUR_DOMAIN_NAME>' \
//     -F to=YOU@YOUR_DOMAIN_NAME \
//     -F to=bar@example.com \
//     -F subject='Hello' \
//     -F text='Testing some Mailgun awesomeness!'

    console.log(payloadObj);
    console.log(requestDetails);

    // Instantiate the request object
    const req = https.request(requestDetails, (res) => {
      // Grab the status of the sent request
      const status = res.statusCode;
      // Callback successfully if the reqest went through
      if (status === 200 || status === 201) {
        callback(false);
      } else {
        callback(`Status returned was ${status}`);
      }
    });

    // Bind to the error event so it doesn't get thrown
    req.on(`error`, (e) => {
      callback(e);
    });

    // Add the payload
    req.write(payloadStr);

    // End the request
    req.end();
  } else {
    callback(`Given parameters were missing or invalid`);
  }
}


/*
var mailgun = require("mailgun-js");
var api_key = 'YOUR_API_KEY';
var DOMAIN = 'YOUR_DOMAIN_NAME';
var mailgun = require('mailgun-js')({apiKey: api_key, domain: DOMAIN});

var data = {
  from: 'Excited User <me@samples.mailgun.org>',
  to: 'bar@example.com, YOU@YOUR_DOMAIN_NAME',
  subject: 'Hello',
  text: 'Testing some Mailgun awesomness!'
};

mailgun.messages().send(data, function (error, body) {
  console.log(body);
});
*/

// Export the module
module.exports = email;
