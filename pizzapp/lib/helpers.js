/*
* Define helpers for various tasks
*
*/

// Dependencies
const crypto = require(`crypto`);
const querystring = require(`querystring`);
const https = require(`https`);
const config = require(`./config`);
// const _data = require(`./data`);
// const helpers = require(`./helpers`);
// const path = require(`path`);

// Container for the module (to be exported)
const helpers = {};

// Create a SHA256 hash
helpers.hash = (str, callback) => {
  if (typeof(str) === `string` && str.length > 0) {
    // Hash the password
    let hash = crypto.createHmac(`sha256`, config.hashingSecret).update(str).digest(`hex`);
    return hash;
  } else {
    return false;
  }
};


// Parse a JSON string to an Object in all cases without throwing
helpers.parseJSONtoObject = (str) => {
  try {
    let obj = JSON.parse(str);
    return obj;
  } catch (err) {
    return {};
  }
};


// Create a string of random alphanumeric characters, of a given length
helpers.createRandomString = (strLength) => {
  strLength = typeof(strLength) === `number` && strLength > 0 ? strLength : 0;
  if (strLength) {
    // Define all the possible characters that could go into a string
    const possibleCharacters = `abcdefghijklmnopqrstuvwxyz0123456789`;

    // Start the final string
    let str = ``;
    for (let s = 0; strLength > s; ++s) {
      // Get a random character from the possibleCharacters string
      let randomCharacter = possibleCharacters.charAt(Math.floor(Math.random() * possibleCharacters.length));
      // Append this character to the final string
      str += randomCharacter;
    }

    // Return the final string
    return str;
  } else {
    return false;
  }
};



// Validate email address
helpers.validateEmail = (email) => {
  if (typeof(email) === `string`) {
    const emailRegex = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    const emailMatch = email.match(emailRegex);
    if (emailMatch instanceof Array) {
      return emailMatch[0];
    }
  }
  // if email is not string and doesn't have a match, return null
  return null;
}


// Send an payment request via Stripe
helpers.processPayment = async (email, orderDetails, callback) => {
  console.log(`processPayment`);
  console.log(email, orderDetails);
  email = helpers.validateEmail(email);
  // orderDetails = typeof(orderDetails) === `string` && orderDetails.trim().length > 0  && orderDetails.trim().length <= 1600 ? orderDetails.trim() : null;

  if (email && orderDetails){
    const stripePostData = querystring.stringify({
      currency: 'usd',
      amount: orderDetails.charge * 100, // amount in cents
      description: `Pizzapp charges for order# ${orderDetails.id}`,
      source: `tok_visa`
    });
      // source: orderDetails.creditCard

    const stripeOptions = {
      protocol: 'https:',
      hostname: 'api.stripe.com',
      port: 443,
      path: '/v1/charges',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(stripePostData),
        'Authorization': 'Bearer '+ config.stripe.secret
      }
    };
    console.log(stripePostData, stripeOptions);

    // send request to Stripe, pass outcome back to processor
    const res = await helpers.remoteAPIRequest(stripeOptions, stripePostData);
    console.log(res);
    callback(false, res);
  } else {
    callback({error: `Missing required fields`});
  }
}


// Send an payment request via Stripe
helpers.sendReceiptEmail = async (email, orderDetails, callback) => {
  email = helpers.validateEmail(email);
  // orderDetails = typeof(orderDetails) === `string` && orderDetails.trim().length > 0  && orderDetails.trim().length <= 1600 ? orderDetails.trim() : null;

  if (email && orderDetails){
    // notify user
    const mailgunPostData = querystring.stringify({
      from: 'Pizzapp <fizz@samples.mailgun.org>',
      to: email,
      subject: `Receipt for the orderId ${orderDetails.id}`,
      text: `Thank you for ordering from Pizzapp!\n\n${orderDetails.summary}\nYour order has been paid with credit card ending in ${orderDetails.creditCard.number.slice(-4)}.`
    });

    const mailgunOptions = {
      protocol: config.mailgun.apiProtocol,
      hostname: config.mailgun.apiHostName,
      port: 443,
      path: config.mailgun.apiPath,
      method: 'POST',
      auth: 'api:'+ config.mailgun.apiKey,
      retry: 1,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(mailgunPostData),
      }
    };

    // send request to MailGun, pass outcome back to processor
    const mailStatus = await helpers.remoteAPIRequest(mailgunOptions, mailgunPostData);
    console.log(mailStatus);
    callback(false, mailStatus);
  } else {
    callback({error: `Missing required fields`});
  }
}




// Send an payment request via Stripe
helpers.processPayment_old = async (email, orderTotal, callback) => {
  console.log(`processPayment`);
  return(false, {});
  // return Promise.resolve(false, {});
  return new Promise( (resolve, reject) => {
    try {
      resolve(false, {});
    } catch (err) {
      resolve(400);
    }
  });




  // return new Promise((resolve, reject)=>{
  //       request( `http://www.omdbapi.com/?t=${movieTitle}`, (error, res, movieData)=>{
  //           if (error) reject(error);
  //           else resolve(movieData);
  //       });
  //   });
  // callback(false, {});
// return new Promise ( (reslove, reject) = > { ... } )
  // return;

/*
  // notify user
  const mailgunPostData = querystring.stringify({
    from: 'Pizzapp <fizz@samples.mailgun.org>',
    to: email,
    subject: 'Receipt for the orderId ',
    text: 'Your order has been paid'
  });
  const mailgunOptions = {
    protocol: config.mailgun.apiProtocol,
    hostname: config.mailgun.apiHostName,
    port: 443,
    path: config.mailgun.apiPath,
    method: 'POST',
    auth: 'api:'+ config.mailgun.apiKey,
    retry: 1,
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': Buffer.byteLength(mailgunPostData),
    }
  };

  const mailStatus = await helpers.remoteAPIRequest(mailgunOptions, mailgunPostData);
  console.log(mailStatus);
  */
  // phone = typeof(phone) === `string` && phone.trim().length === 10 ? phone.trim() : null;
  // msg = typeof(msg) === `string` && msg.trim().length > 0  && msg.trim().length <= 1600 ? msg.trim() : null;
  //
  // if (phone && msg) {
  //   // Configure the request payload
  //   const payloadObj = {
  //     'From': config.twilio.fromPhone,
  //     'To': `+1${phone}`,
  //     'Body': msg
  //   };
  //
  //   // Stringify the request payload
  //   let payloadStr = querystring.stringify(payloadObj);
  //
  //   // Configure the request details
  //   const requestDetails = {
  //     'protocol': `https:`,
  //     'hostname': `api.twilio.com`,
  //     'method': `POST`,
  //     'path': `/2010-04-01/Accounts/${config.twilio.accountSid}/Messages.json`,
  //     'auth': `${config.twilio.accountSid}:${config.twilio.authToken}`,
  //     'headers': {
  //       'Content-Type': `application/x-www-form-urlencoded`,
  //       'Content-Length': Buffer.byteLength(payloadStr)
  //     }
  //   };
  //
  //   console.log(payloadObj);
  //   console.log(requestDetails);
  //
  //   // Instantiate the request object
  //   const req = https.request(requestDetails, (res) => {
  //     // Grab the status of the sent request
  //     const status = res.statusCode;
  //     // Callback successfully if the reqest went through
  //     if (status === 200 || status === 201) {
  //       callback(false);
  //     } else {
  //       callback(`Status returned was ${status}`);
  //     }
  //   });
  //
  //   // Bind to the error event so it doesn't get thrown
  //   req.on(`error`, (e) => {
  //     callback(e);
  //   });
  //
  //   // Add the payload
  //   req.write(payloadStr);
  //
  //   // End the request
  //   req.end();
  // } else {
  //   callback(`Given parameters were missing or invalid`);
  // }
}

helpers.remoteAPIRequest = async (options, postData)  => {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let response;
      res.setEncoding('utf-8');
      res.on('data', (chunk) => {
        response = chunk;
      });
      res.on('end', () => {
        console.log(typeof response);
        try {
          resolve(JSON.parse(response));
        } catch (err) {
          resolve(response);
        }
      });
    });

    req.on('error', (e) => {
      console.log(e);
      reject(formatResponse(400, `problem with request: ${e.message}`));
    });

    // write data to request body
    req.write(postData);
    req.end();
  });
};


// Export the module
module.exports = helpers;
