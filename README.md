<p align="center">
  <img src="logo.svg" height="100px" alt="Wrestler"/>
</p>

<p align="center"> 

  # Wrestler
  Restful scaffolding that grows with you!
  
</p>

<p align="center">

  [![Build Status](https://img.shields.io/travis/sketchdev/wrestler/master.svg?style=flat-square)](https://travis-ci.org/sketchdev/wrestler)
  [![Dependencies](https://img.shields.io/david/sketchdev/wrestler.svg?style=flat-square)](https://david-dm.org/sketchdev/wrestler)
  [![Coverage Status](https://coveralls.io/repos/github/sketchdev/wrestler/badge.svg?branch=master)](https://coveralls.io/github/sketchdev/wrestler?branch=master)
  
  ![Gitter](https://img.shields.io/gitter/room/wrestlerjs/wrestler.js.svg)
  
  [![Version npm](https://img.shields.io/npm/v/wrestler.svg?style=flat-square)](https://www.npmjs.com/package/winston)
  [![npm Downloads](https://img.shields.io/npm/dm/wrestler.svg?style=flat-square)](https://npmcharts.com/compare/wrestler?minimal=true)
  
  [![NPM](https://nodei.co/npm/wrestler.png)](https://nodei.co/npm/wrestler/)
</p>


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

## Configuration

Wrestler is very opinionated on purpose. By default many conventions are used which can be helpful to quickly get a prototype API running.
However, these defaults might not be for everyone. If so, we've included many options which might be exactly what you need.

### Users

Many APIs need some type of user support. Wrestler includes a common email/password user model with Bearer authentication.

__Examples__

```
# returns the authenticated user
# requires Authorization: Bearer <token>
GET /user                        

# returns the authenticated user
# requires Authorization: Bearer <token>
GET /user/:id                    

# creates a user; sends a confirmation email
# requires email and password; all other json properties are stored on the user
POST /user                        

# confirms a user; not active until confirmation; returns a JWT
# JWT includes all other json properties stored on the user
POST /user/confirm                

# authenicates a user with email/password; returns a JWT
# JWT includes all other json properties stored on the user
POST /user/login                  

# sends a recovery code via email; expires in 1 hour
# requires email
POST /user/forgot-password        

# changes password
# requires recovery_code and new_password; returns a JWT
# JWT includes all other json properties stored on the user
POST /user/recover-password       

# not supported because this would completely replace a user
# this wouldn't be ideal. instead, use a PATCH request
PUT /user/:id                    

# updates a user
# any properties on user are replaced
# requires Authorization: Bearer <token>
PATCH /user/id                     

# deletes the user
# requires Authorization: Bearer <token>
DELETE /user/:id
```

__Authorization__

Access control is handled by supplying a custom middleware function that determines if the logged in user
has the ability to perform the specific action.

The `req` parameter will contain `resource`, `method`, and `wrestler.user` values which help in determining access. 

__Example__

```js
app.use(wrestler({
  users: { // enables user support
    authorization: (req, res, next) => {
      if (req.resource === 'widget') {
        if (req.wrestler.user && req.wrestler.user.email === 'tom@mailinator.com') return next();
        return res.sendStatus(403);
      }
      next();
    }
  }
}));
```

__Simple Authorization__

Set `users.authorization` equal to `simple` if you just need to make sure that users can only manage their own stuff.

```js
app.use(wrestler({
  users: { // enables user support
    authorization: 'simple' // users can only CRUD their own data
  }
}));
```


## Run Tests

```bash
yarn test
```
