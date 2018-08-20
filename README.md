# Wrestler

Restful scaffolding that grows with you!

[![Build Status](https://img.shields.io/travis/sketchdev/wrestler/master.svg?style=flat-square)](https://travis-ci.org/sketchdev/wrestler)
[![Dependencies](https://img.shields.io/david/sketchdev/wrestler.svg?style=flat-square)](https://david-dm.org/sketchdev/wrestler)
[![Coverage Status](https://coveralls.io/repos/github/sketchdev/wrestler/badge.svg?branch=master)](https://coveralls.io/github/sketchdev/wrestler?branch=master)

![Gitter](https://img.shields.io/gitter/room/wrestlerjs/wrestler.js.svg)

[![Version npm](https://img.shields.io/npm/v/wrestler.svg?style=flat-square)](https://www.npmjs.com/package/winston)
[![npm Downloads](https://img.shields.io/npm/dm/wrestler.svg?style=flat-square)](https://npmcharts.com/compare/wrestler?minimal=true)

[![NPM](https://nodei.co/npm/wrestler.png)](https://nodei.co/npm/wrestler/)

## Getting Started

Install the library using your package manager of choice. Below is an example of installing with Yarn.

```bash
yarn add wrestler
```

Create the express application.

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

## Run Tests

```bash
yarn test
```
