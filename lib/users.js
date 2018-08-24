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
const moment = require('moment');
const { LoginError, ValidationError, UnknownError } = require('./errors');

const ITERATIONS = 10000;
const KEYLEN = 64;
const DIGEST = 'sha512';
const JWT_SECRET_KEY = process.env.JWT_SECRET_KEY || 'efwpoeiurpoijk123`3asd;lkj32E@#;l3kj3#Eeplk3j34fpoiu-Oiu;lkj';

exports.checkAuthentication = async (req, res, next) => {
  if (req.wrestler.options.users && !isCreateUser(req) && !isLogin(req) && !isConfirmation(req) && !isResendConfirmation(req) && !isForgotPassword(req)) {
    if (req.headers.authorization) {
      const [scheme, token] = req.headers.authorization.split(' ');
      if (scheme === 'Bearer') {
        try {
          const user = await jwtVerify(token, JWT_SECRET_KEY, { algorithm: 'HS512' });
          req.wrestler.user = transformOne(user);
          return next();
        } catch (err) {
          return next(err);
        }
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
  if (isUserRequest(req) && isLogin(req)) {
    const user = await req.wrestler.dbDriver.findOne(req.wrestler.resource, { email: req.body.email });
    if (!user || !user.confirmed) {
      res.wrestler.errors = { base: { messages: ['Invalid email or password'] } };
      return next(new LoginError());
    }
    const passwordHash = await hashPasswordFromUser(user, req.body.password);
    if (passwordHash !== user.passwordHash) {
      res.wrestler.errors = { base: { messages: ['Invalid email or password'] } };
      return next(new LoginError());
    }
    try {
      const token = await jwtSign(transformOne(user), JWT_SECRET_KEY, { algorithm: 'HS512', expiresIn: '1h' });
      return res.json({ token });
    } catch (err) {
      if (process.env.NODE_ENV !== 'test') console.error(err);
      res.wrestler.errors = { base: { messages: ['Unexpected error'] } };
      return next(new UnknownError());
    }
  }
  next();
};

exports.handleConfirmation = async (req, res, next) => {
  if (isUserRequest(req) && isConfirmation(req)) {
    try {
      const { email, confirmationCode } = req.body;
      const user = await req.wrestler.dbDriver.findOne(req.wrestler.resource, { email });
      if (!user) {
        res.wrestler.errors = { email: { messages: ['Invalid email'] } };
        return next(new ValidationError());
      }
      const now = new Date();
      if (confirmationCode === user.confirmationCode) {
        if (user.confirmationExpiresAt > now) {
          const newUser = await req.wrestler.dbDriver.findOneAndUpdate('user', { email }, { confirmed: true });
          return res.json(transformOne(newUser));
        } else {
          res.wrestler.errors = { confirmationCode: { messages: ['Expired confirmationCode'] } };
          return next(new ValidationError());
        }
      } else {
        res.wrestler.errors = { confirmationCode: { messages: ['Invalid confirmationCode'] } };
        return next(new ValidationError());
      }
    } catch (err) {
      if (process.env.NODE_ENV !== 'test') console.error(err);
      res.wrestler.errors = { base: { messages: ['Unexpected error'] } };
      return next(new UnknownError());
    }
  }
  next();
};

exports.handleResendConfirmation = async (req, res, next) => {
  if (isUserRequest(req) && isResendConfirmation(req)) {
    try {
      const { email } = req.body;
      const user = await req.wrestler.dbDriver.findOne(req.wrestler.resource, { email });
      if (!user) {
        return res.sendStatus(200);
      }
      const { confirmationCode, confirmationExpiresAt } = buildConfirmation();
      await req.wrestler.dbDriver.findOneAndUpdate(req.wrestler.resource, { email }, { confirmationCode, confirmationExpiresAt });
      res.wrestler.email = buildConfirmationEmail(req, email, req.wrestler.confirmationCode);
      res.sendStatus(200);
      req.wrestler.bypassRest = true;
    } catch (err) {
      if (process.env.NODE_ENV !== 'test') console.error(err);
      res.wrestler.errors = { base: { messages: ['Unexpected error'] } };
      return next(new UnknownError());
    }
  }
  next();
};

exports.handleForgotPassword = async (req, res, next) => {
  if (isUserRequest(req) && isForgotPassword(req)) {
    try {
      const { email } = req.body;
      const user = await req.wrestler.dbDriver.findOne(req.wrestler.resource, { email });
      if (!user) {
        return res.sendStatus(200);
      }
      const { recoveryCode, recoveryExpiresAt } = buildRecovery();
      await req.wrestler.dbDriver.findOneAndUpdate(req.wrestler.resource, { email }, { recoveryCode, recoveryExpiresAt });
      res.wrestler.email = buildRecoveryEmail(req, email, req.wrestler.recoveryCode);
      res.sendStatus(200);
      req.wrestler.bypassRest = true;
    } catch (err) {
      if (process.env.NODE_ENV !== 'test') console.error(err);
      res.wrestler.errors = { base: { messages: ['Unexpected error'] } };
      return next(new UnknownError());
    }
  }
  next();
};

exports.handleUserGetRequest = async (req, res, next) => {
  if (isUserRequest(req) && req.method === 'GET') {
    if (req.wrestler.id && req.wrestler.user.id !== req.wrestler.id) {
      return res.sendStatus(404);
    }
    res.wrestler.transformer = req.wrestler.id ? transformOne : transformMany;
  }
  next();
};

exports.handleUserPostRequest = async (req, res, next) => {
  if (isUserRequest(req) && isCreateUser(req)) {
    const { email, password } = req.body;
    req.body = sanitizeBody(req);

    const errors = await validateInsert(req, email, password);
    if (errors) {
      res.wrestler.errors = errors;
      return next(new ValidationError());
    }

    req.body = await hashPassword(req, password);
    req.body = addConfirmation(req);

    res.wrestler.email = buildConfirmationEmail(req, email, req.wrestler.confirmationCode);
    res.wrestler.transformer = transformOne;
  }
  next();
};

exports.handleUserPutRequest = async (req, res, next) => {
  if (isUserRequest(req) && req.method === 'PUT') {
    return res.sendStatus(405);
  }
  next();
};

exports.handleUserPatchRequest = async (req, res, next) => {
  if (isUserRequest(req) && req.method === 'PATCH') {
    const { email, password } = req.body;
    req.body = sanitizeBody(req);

    const errors = await validatePatch(req, email);
    if (errors) {
      res.wrestler.errors = errors;
      return next(new ValidationError());
    }

    if (password) {
      req.body = await hashPassword(req, password);
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

const hashPassword = async (req, password) => {
  const salt = crypto.randomBytes(128).toString('base64');
  const derivedKey = await pbkdf2(password, salt, ITERATIONS, KEYLEN, DIGEST);
  const passwordHash = derivedKey.toString('hex');
  return Object.assign({}, req.body, { salt, iterations: ITERATIONS, keylen: KEYLEN, digest: DIGEST, passwordHash });
};

const hashPasswordFromUser = async (user, password) => {
  const derivedKey = await pbkdf2(password, user.salt, user.iterations, user.keylen, user.digest);
  return derivedKey.toString('hex');
};

const buildRecovery = () => {
  const recoveryCode = uuid();
  const recoveryExpiresAt = moment().add(1, 'hour').toDate();
  return { recoveryCode, recoveryExpiresAt };
};

const buildConfirmation = () => {
  const confirmationCode = uuid();
  const confirmationExpiresAt = moment().add(1, 'hour').toDate();
  return { confirmationCode, confirmationExpiresAt };
};

const addConfirmation = (req) => {
  const { confirmationCode, confirmationExpiresAt } = buildConfirmation();
  return Object.assign({}, req.body, { confirmationCode, confirmationExpiresAt, confirmed: false });
};

const buildConfirmationEmail = (req, to, confirmationCode) => {
  return {
    from: _.get(req, 'wrestler.options.email.from', 'no-reply@wrestlerjs.com'),
    to,
    subject: _.get(req, 'wrestler.options.email.confirm.subject', 'Your account has been created!'),
    text: _.get(req, 'wrestler.options.email.confirm.text', `Please confirm your email. Your confirmation code is ${confirmationCode}`),
    html: _.get(req, 'wrestler.options.email.confirm.html'),
  };
};

const buildRecoveryEmail = (req, to, recoveryCode) => {
  return {
    from: _.get(req, 'wrestler.options.email.from', 'no-reply@wrestlerjs.com'),
    to,
    subject: _.get(req, 'wrestler.options.email.recovery.subject', 'Recover your password'),
    text: _.get(req, 'wrestler.options.email.recovery.text', `You requested to recover your password. Your recovery code is ${recoveryCode}`),
    html: _.get(req, 'wrestler.options.email.recovery.html'),
  };
};

const isCreateUser = (req) => {
  return req.method === 'POST' && req.path === '/user';
};

const isLogin = (req) => {
  return req.method === 'POST' && req.path === '/user/login';
};

const isConfirmation = (req) => {
  return req.method === 'POST' && req.path === '/user/confirm';
};

const isResendConfirmation = (req) => {
  return req.method === 'POST' && req.path === '/user/resend-confirm';
};

const isForgotPassword = (req) => {
  return req.method === 'POST' && req.path === '/user/forgot-password';
};

const isUserRequest = (req) => {
  return req.wrestler.options.users && req.wrestler.resource === 'user';
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

const validateInsert = async (req, email, password) => {
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
  await validateEmailUniqueness(req, email, errors);
  return Object.keys(errors).length > 0 ? errors : undefined;
};

const validatePatch = async (req, email) => {
  const errors = {};
  if (email && !validator.isEmail(email)) {
    errors.email = { messages: ['Email is invalid'] };
  }
  await validateEmailUniqueness(req, email, errors);
  return Object.keys(errors).length > 0 ? errors : undefined;
};

const validateEmailUniqueness = async (req, email, errors) => {
  try {
    if (email && errors.email === undefined && (await req.wrestler.dbDriver.countDocuments(req.wrestler.resource, { email })) !== 0) {
      errors.email = { messages: ['Email already exists'] };
    }
  } catch (err) {
    if (process.env.NODE_ENV !== 'test') console.error(err);
    errors.base = { messages: 'Unexpected error' };
  }
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
