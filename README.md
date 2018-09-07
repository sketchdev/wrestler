# Wrestler

[![Build Status](https://img.shields.io/travis/sketchdev/wrestler/master.svg?style=flat-square)](https://travis-ci.org/sketchdev/wrestler)
[![Dependencies](https://img.shields.io/david/sketchdev/wrestler.svg?style=flat-square)](https://david-dm.org/sketchdev/wrestler)
[![Maintainability](https://api.codeclimate.com/v1/badges/8195382474536e36f321/maintainability)](https://codeclimate.com/github/sketchdev/wrestler/maintainability)
[![Coverage Status](https://coveralls.io/repos/github/sketchdev/wrestler/badge.svg?branch=master)](https://coveralls.io/github/sketchdev/wrestler?branch=master)
![Gitter](https://img.shields.io/gitter/room/wrestlerjs/wrestler.js.svg)
[![Version npm](https://img.shields.io/npm/v/wrestler.svg?style=flat-square)](https://www.npmjs.com/package/wrestler)
[![npm Downloads](https://img.shields.io/npm/dm/wrestler.svg?style=flat-square)](https://npmcharts.com/compare/wrestler?minimal=true)

<img src="https://raw.githubusercontent.com/sketchdev/wrestler/master/logo.png" height="200px" alt="Wrestler" align="right"/>

Wrestler jumpstarts your productivity by removing the need to build a backend API for your application.
Keep focusing on your mobile application or other front-end (React, Angular, or Vue) while the backend API comes for free!


__Wrestler is currently in-development and it's usage is likely to change.__

## Features

* Dynamic RESTful API
* Easy integration with existing solutions.
* Middleware library for [Express.js](https://expressjs.com/) instead of it's own web framework.
* Whitelist and validate resources to prevent garbage data.
* User management with authentication, authorization, recovery, and more.
* Email delivery for new user sign ups, password recovery, etc.
* Consistent error responses.
* Allows inserting your own handlers for situations that REST doesn't support.


## Installation

Install the library using your package manager of choice. Below is an example of installing with [Yarn](https://yarnpkg.com/en/).

```bash
yarn add wrestler
```

Or use [NPM](https://www.npmjs.com/)

```sh
npm i wrestler --save
```

## Quick start

Use Wrestler as middleware in an [Express](https://expressjs.com/) application.

```javascript
const express = require('express');
const app = express();
const wrestler = require('wrestler');

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(wrestler());

app.listen(3000, () => console.log('Example app listening on port 3000!'))
```

## Even quicker quick start

Use the [wrestler-cli](https://github.com/sketchdev/wrestler-cli) project to fire up a Wrestler instance without installing anything!

```bash
npx wrestler-cli
```

```bash
 __        __             _   _           
 \ \      / / __ ___  ___| |_| | ___ _ __ 
  \ \ /\ / / '__/ _ \/ __| __| |/ _ \ '__|
   \ V  V /| | |  __/\__ \ |_| |  __/ |   
    \_/\_/ |_|  \___||___/\__|_|\___|_|   
                                          
Listening on port 3077...
```



## Guides

Wrestler is fantastic for prototyping; however, it can be extended further for production use.
Below are some guides that allow you to setup Wrestler for your specific requirements.

### Persisting data

By default, Wrestler only stores information in-memory. If you stop the server, then say bye-bye to your data.
This is great for some cases like testing and prototyping, but not so much if you want to make the next big thing.

You have a couple options to save data for the long term.

* File system
* MongoDB
* Custom driver

If you only need to save data in-between starts and stops for prototyping, then
you can use the file system.

```js
app.use(wrestler({
  database: { persistentDataPath: '/some/path/to/a/directory' }
}));
```

If you need a more robust solution, then either use MongoDB (below) or write your own custom driver (which isn't very hard).

### Using [MongoDB](https://www.mongodb.com/)

Okay, so you're not prototyping or testing and you need a better database solution.
We've got you covered with the MongoDB driver.

All you need to do is set two environment variables.
`MONGO_DB_URI` and `MONGO_DB_NAME`.

`MONGO_DB_URI` is the URI for connecting. 

Here's an example `mongodb+srv://<USER>:<PASSWORD>@cluster0-83hA7.mongodb.net/test`

`MONGO_DB_NAME` is the name of your database.

Note that Wrestler doesn't attempt to connect until after the first request. This is so the
server starts up quicker. So, verify your connection by sending a `GET` request or something.

### Enabling user logins

Most applications need some type of user support. Wrestler has great support for users
with just a single option.

```js
app.use(wrestler({ users: true }))
```

When the `users` option is set to `true` each request is scoped to the authenticated user.
In other words, any resource created by one user can only be accessed by that user.

When the `users` option is set to `'roles'` then the following things occur.

* A root user is created
  - By default the username is `wrestler` with a password of `wrestler`
  - If environment variables of `ROOT_USER` and `ROOT_PASS` exist, then the root user will have those credentials
* Every __new__ user will have a `role`
  - The root user's role will be `'admin'`
* Any __new__ user created will have a `role` of `'guest'`
  - Unless an `'admin'` user is creating the user, then `role` can be anything.
* Any user can create, read, update, or delete themselves
* Any `'admin'` can create, read, update, or delete any other user.

When the `users` option is a function, then it will be called like traditional Express middleware.
This gives you the ability to create whatever authorization logic works for you.
A good library for authorization is [node_acl](https://github.com/OptimalBits/node_acl).

Below are the endpoints exposed when user support is enabled.

```http
POST   /user                    { email, password, ...anything else }
POST   /user/login              { email, password }
POST   /user/confirm            { email, confirmationCode }
POST   /user/resend-confirm     { email }
POST   /user/forgot-password    { email }
POST   /user/recover-password   { email, recoveryCode }
GET    /user
GET    /user/:id
PATCH  /user/:id                { email, password, ...anything else } IN-PROGRESS
DELETE /user/:id 
```

### Handling requests that aren't RESTful

### Overriding requests

### Whitelisting resource endpoints

### Validating requests

### Custom email transporter

### Customized email content

### Adding authorization

### Writing a database driver



## Reference

### Importing

### Setup

### Authentication

### Authorization

### Whitelisting

### Validation

### Users

### RESTful

### Emailing

### Errors
