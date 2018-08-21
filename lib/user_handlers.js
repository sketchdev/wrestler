/** @namespace req.body.passwordConfirmation */
/** @namespace req.headers.authorization */

const crypto = require('crypto');
const util = require('util');
const validator = require('validator');
const jwt = require('jsonwebtoken');
const uuid = require('uuid/v4');
const jwtSign = util.promisify(jwt.sign);
const jwtVerify = util.promisify(jwt.verify);
const pbkdf2 = util.promisify(crypto.pbkdf2);
const _ = require('lodash');
const { LoginError, CreateUserError, UpdateUserError } = require('./errors');

const ITERATIONS = 10000;
const KEYLEN = 64;
const DIGEST = 'sha512';
const JWT_SECRET_KEY = process.env.JWT_SECRET_KEY || 'efwpoeiurpoijk123`3asd;lkj32E@#;l3kj3#Eeplk3j34fpoiu-Oiu;lkj';

exports.checkAuthentication = async (req, res, next) => {
  if (req.wrestler.options.users && !isCreateUser(req) && !isLogin(req)) {
    if (req.headers.authorization) {
      const [scheme, token] = req.headers.authorization.split(' ');
      if (scheme === 'Bearer') {
        const user = await jwtVerify(token, JWT_SECRET_KEY, { algorithm: 'HS512' });
        req.wrestler.user = transformOne(user);
        return next();
      }
    }
    return res.sendStatus(401);
  }
  next();
};

exports.checkAuthorization = async (req, res, next) => {
  if (req.wrestler.options.users && typeof req.wrestler.options.users.authorization === 'function') return req.wrestler.options.users.authorization(req, res, next);
  next();
};

exports.handleLogin = async (req, res, next) => {
  if (userHandlingIsEnabled(req) && isLogin(req)) {
    const user = await req.db.findOne(req.resource, { email: req.body.email });
    if (!user) {
      res.wrestler.errors = { base: { messages: ['Invalid email or password'] } };
      return next(new LoginError());
    }
    const derivedKey = await pbkdf2(req.body.password, user.salt, user.iterations, user.keylen, user.digest);
    const passwordHash = derivedKey.toString('hex');
    if (passwordHash !== user.passwordHash) {
      res.wrestler.errors = { base: { messages: ['Invalid email or password'] } };
      return next(new LoginError());
    }
    try {
      const token = await jwtSign(transformOne(user), JWT_SECRET_KEY, { algorithm: 'HS512', expiresIn: '1h' });
      return res.json({ token });
    } catch (err) {
      console.error(err);
      res.wrestler.errors = { base: { messages: ['Unexpected error'] } };
      return next(new LoginError());
    }
  }
  next();
};

exports.handleUserGetRequest = async (req, res, next) => {
  if (userHandlingIsEnabled(req) && req.method === 'GET') {
    res.wrestler.transformer = transformMany;
  }
  next();
};

exports.handleUserPostRequest = async (req, res, next) => {
  if (userHandlingIsEnabled(req) && isCreateUser(req)) {
    const { email, password } = req.body;
    req.body = sanitizeBody(req);

    const errors = await validateUpsert(req, email, password);
    if (errors) {
      res.wrestler.errors = errors;
      return next(new CreateUserError());
    }

    const confirmationCode = uuid();
    const salt = crypto.randomBytes(128).toString('base64');
    const derivedKey = await pbkdf2(password, salt, ITERATIONS, KEYLEN, DIGEST);
    const passwordHash = derivedKey.toString('hex');
    req.body = Object.assign({}, req.body, { salt, iterations: ITERATIONS, keylen: KEYLEN, digest: DIGEST, passwordHash, confirmationCode, confirmed: false });

    res.wrestler.email = {
      from: _.get(req, 'wrestler.options.email.from', 'no-reply@wrestlerjs.com'),
      to: email,
      subject: _.get(req, 'wrestler.options.email.register.subject', 'Your account has been created!'),
      text: _.get(req, 'wrestler.options.email.register.text', `Please confirm your email. Your confirmation code is ${confirmationCode}`),
      html: _.get(req, 'wrestler.options.email.register.html', undefined),
    };

    res.wrestler.transformer = transformOne;
  }
  next();
};

exports.handleUserPutRequest = async (req, res, next) => {
  if (userHandlingIsEnabled(req) && req.method === 'PUT') {
    return res.sendStatus(405);
  }
  next();
};

exports.handleUserPatchRequest = async (req, res, next) => {
  if (userHandlingIsEnabled(req) && req.method === 'PATCH') {
    const { email, password } = req.body;
    req.body = sanitizeBody(req);

    const errors = await validatePatch(req, email);
    if (errors) {
      res.wrestler.errors = errors;
      return next(new UpdateUserError());
    }

    if (password) {
      const salt = crypto.randomBytes(128).toString('base64');
      const derivedKey = await pbkdf2(password, salt, ITERATIONS, KEYLEN, DIGEST);
      const passwordHash = derivedKey.toString('hex');
      req.body = Object.assign({}, req.body, { salt, iterations: ITERATIONS, keylen: KEYLEN, digest: DIGEST, passwordHash });
    }

    // TODO: send email (if email or password is changed)

    res.wrestler.transformer = transformOne;
  }
  next();
};

exports.handleUserDeleteRequest = async (req, res, next) => {
  // TODO: cleanup child resources?
  next();
};

const isCreateUser = (req) => {
  return req.method === 'POST' && req.path === '/user';
};

const isLogin = (req) => {
  return req.method === 'POST' && req.path === '/user/login';
};

const userHandlingIsEnabled = (req) => {
  return req.wrestler.options.users && req.resource === 'user';
};

const sanitizeBody = (req) => {
  const body = Object.assign({}, req.body);
  if (!body.email) {
    delete body.email;
  }
  delete body.password;
  delete body.salt;
  delete body.iterations;
  delete body.keylen;
  delete body.digest;
  delete body.passwordHash;
  delete body.confirmationCode;
  delete body.confirmed;
  return body;
};

const validateUpsert = async (req, email, password) => {
  const errors = {};
  if (!email) {
    errors.email = { messages: ['Email is required'] };
  }
  if (email && !validator.isEmail(email)) {
    errors.email = { messages: ['Email is invalid'] };
  }
  if (!password) {
    errors.password = { messages: ['Password is required'] };
  }
  try {
    if (email && errors.email === undefined && (await req.db.countDocuments(req.resource, { email })) !== 0) {
      errors.email = { messages: ['Email already exists'] };
    }
  } catch (err) {
    console.error(err); // TODO: do better logging
    errors.base = { messages: 'Unexpected error' };
  }
  return Object.keys(errors).length > 0 ? errors : undefined;
};

const validatePatch = async (req, email) => {
  const errors = {};
  if (email && !validator.isEmail(email)) {
    errors.email = { messages: ['Email is invalid'] };
  }
  try {
    if (email && errors.email === undefined && (await req.db.countDocuments(req.resource, { email })) !== 0) {
      errors.email = { messages: ['Email already exists'] };
    }
  } catch (err) {
    console.error(err); // TODO: do better logging
    errors.base = { messages: 'Unexpected error' };
  }
  return Object.keys(errors).length > 0 ? errors : undefined;
};

const transformMany = (entities) => {
  return entities.map(e => transformOne(e));
};

const transformOne = (doc) => {
  const user = Object.assign({}, doc);
  if (user._id) {
    user.id = user._id;
  }
  delete user._id;
  delete user.salt;
  delete user.iterations;
  delete user.keylen;
  delete user.digest;
  delete user.passwordHash;
  delete user.confirmationCode;
  delete user.confirmed;
  return user;
};
