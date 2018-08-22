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
Keep focusing on your React, Angular, or Vue front-end while the backend API comes for free!

## Features

* Dynamic RESTful API
* Easy integration with existing solutions.
* Middleware library for [Express.js](https://expressjs.com/) instead of it's own web framework.
* Whitelist and validate resources to prevent garbage data.
* User management with authentication, authorization, recovery, and more.
* Email delivery for new user sign ups, password recovery, etc.
* Consistent error responses.
* Allows inserting your own handlers for situations that REST doesn't support.


## Middleware Usage

Install the library using your package manager of choice. Below is an example of installing with Yarn.

```bash
yarn add wrestler
```

Or, install using `npm`

```sh
npm i wrestler
```

Next, use Wrestler as middleware in an express application.

```javascript
const express = require('express');
const app = express();
const wrestler = require('wrestler');

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(wrestler());

app.listen(3000, () => console.log('Example app listening on port 3000!'))
```

Done! Now you can call your local application in a RESTful way and it'll automatically work!

## Reference

TBD

## Contributing

TBD
