# Homework Assignment #2

This is the second homework assignment for the NodeJS Masterclass, for the section 'Building a RESTful API'.

This is based on the course code, with slight modifications to create a "shopping cart" composed of a set of "orders" (forked from the "checks" functionality) placed by an authenticated user. The body of an order might look like this:

```
{
  "pizzaSize": "small",
  "pizzaCount": 2,
  "toppings": [ "onions", "sausage", "mushrooms", "bacon" ]
}
```

This also includes helpers to process payments via Stripe, compose and send email receipts via MailGun, a generalized email format verification method, and a module to handle the cart, including compiling a shopping cart from multiple orders, calculating the price, summarizing each order, and finally archiving past orders.

## The Assignment (Scenario):

You are building the API for a pizza-delivery company. Don't worry about a frontend, just build the API. Here's the spec from your project manager:

1. New users can be created, their information can be edited, and they can be deleted. We should store their name, email address, and street address.
- [x] create user
- [x] edit user
- [x] delete user
- [x] store name, email address, and street address
2. Users can log in and log out by creating or destroying a token.
- [x] log in
- [x] log out
3. When a user is logged in, they should be able to GET all the possible menu items (these items can be hardcoded into the system).
- [x] get menu
4. A logged-in user should be able to fill a shopping cart with menu items
- [x] add orders to "shopping cart"
5. A logged-in user should be able to create an order. You should integrate with the Sandbox of Stripe.com to accept their payment. Note: Use the stripe sandbox for your testing. Follow this link and click on the "tokens" tab to see the fake tokens you can use server-side to confirm the integration is working: https://stripe.com/docs/testing#cards
- [x] process test card number via Stripe
6. When an order is placed, you should email the user a receipt. You should integrate with the sandbox of Mailgun.com for this. Note: Every Mailgun account comes with a sandbox email account domain (whatever@sandbox123.mailgun.org) that you can send from by default. So, there's no need to setup any DNS for your domain for this task https://documentation.mailgun.com/en/latest/faqs.html#how-do-i-pick-a-domain-name-for-my-mailgun-account
- [x] send receipt to user

## Handlers
### `/users`

`/post`
- Required data: username, email, and streetAddress, password, tosAgreement
- Optional data: none
- Parameters: `data`, `callback`

`/get`
- Required data: email
- Optional data: none
- Parameters: `data`, `callback`

`/put`
- Required data: email
- Optional data: username, streetAddress, password (at least one must be specified)
- Parameters: `data`, `callback`

`/delete`
- Required data: email
- Optional data: none
- Parameters: `data`, `callback`

### `/tokens`

`/post`
- Required data: email, password
- Optional data: none
- Parameters: `data`, `callback`

`/get`
- Required data: id
- Optional data: none
- Parameters: `data`, `callback`

`/put`
- Required data: id, extend
- Optional data: none
- Parameters: `data`, `callback`

`/delete`
- Required data:
- Optional data: none
- Parameters: `data`, `callback`

`/verifyToken`: verify that a given token id is currently valid for a given user
- Required data:
- Optional data: none
- Parameters: `id`, `email`, `callback`

### `/menu`
`/get`: returns a JSON file of the menu, with available sizes, prices, and toppings
- Required data: none
- Optional data: none
- Parameters: `data`, `callback`

### `/orders`
`/post`
- Required data: pizzaSize, pizzaCount, toppings
- Optional data: none
- Parameters: `data`, `callback`

`/get`
- Required data: id
- Optional data: none
- Parameters: `data`, `callback`

`/put`
- Required data: id
- Optional data: pizzaSize, pizzaCount, toppings (at least one must be specified)
- Parameters: `data`, `callback`

`/delete`
- Required data:
- Optional data: none
- Parameters: `data`, `callback`

### `/checkout`
`/post`
- Required data: token (header), email address (body), payAuthToken (body)
- Optional data: none
- Parameters: `data`, `callback`

### `/notFound`
