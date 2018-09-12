const util = require('util');
const validator = require('validator');
const jwt = require('jsonwebtoken');
const _ = require('lodash');
const common = require('./users/common');
const validateEmailUniqueness = require('./users/common').validateEmailUniqueness;
const jwtSign = util.promisify(jwt.sign);
const jwtVerify = util.promisify(jwt.verify);
const buildEmailCodeWithExpiry = require('./users/common').buildEmailCodeWithExpiry;
const buildEmail = require('./users/common').buildEmail;
const isUserRequest = require('./users/common').isUserRequest;
const { LoginError, ValidationError, UnknownError } = require('./errors');

const JWT_SECRET_KEY = process.env.JWT_SECRET_KEY || 'efwpoeiurpoijk123`3asd;lkj32E@#;l3kj3#Eeplk3j34fpoiu-Oiu;lkj';

exports.checkAuthentication = async (req, res, next) => {
  if (req.wrestler.options.users) {
    if (req.headers.authorization) {
      const [scheme, token] = req.headers.authorization.split(' ');
      if (scheme === 'Bearer') {
        try {
          let user = await jwtVerify(token, JWT_SECRET_KEY, { algorithm: 'HS512' });
          user = transformOne(user);
          req.wrestler.user = user;
          req.session = Object.assign({}, req.session, { user, userId: user.id });
          return next();
        } catch (err) {
          if (requiresAuthentication(req)) {
            return res.status(401).json({ base: { messages: ['Invalid authorization token'] } });
          }
        }
      }
    }
    if (requiresAuthentication(req)) {
      return res.sendStatus(401);
    }
  }
  next();
};

exports.checkAuthorization = async (req, res, next) => {
  if (isLogin(req) || isConfirmation(req)) {
    return next();
  }
  if (req.wrestler.options.users && typeof req.wrestler.options.users.authorization === 'function') {
    req.wrestler.options.users.authorization(req, res);
  }
  if (!res.headersSent) {
    const allows = _.get(req, 'wrestler.options.users.allow', []);
    if (allows.length > 0) {
      let authorized = false;
      for (const allow of allows) {
        const resourceAuthorized = allow.resource === _.get(req, 'wrestler.resource');
        const roleAuthorized = allow.roles === '*' || allow.roles.includes(_.get(req, 'wrestler.user.role'));
        const methodAuthorized = allow.methods === '*' || allow.methods.includes(req.method);
        if (resourceAuthorized && roleAuthorized && methodAuthorized) {
          if (allow.onlyOwned) {
            if (req.wrestler.resource === common.USER_COLLECTION_NAME) {
              if (req.wrestler.user.id === req.wrestler.id) {
                req.wrestler.user.filter = { _id: req.wrestler.dbDriver.toObjectId(req.wrestler.user.id) };
                authorized = true;
              }
            } else {
              req.wrestler.user.filter = { createdBy: req.wrestler.user.id };
              authorized = true;
            }
          } else {
            authorized = true;
          }
          break;
        }
      }
      if (!authorized) {
        return res.sendStatus(403);
      }
    }
    next();
  }
};

exports.handleLogin = async (req, res, next) => {
  if (isUserRequest(req) && isLogin(req)) {
    let user;
    user = await req.wrestler.dbDriver.findOne(req.wrestler.resource, { email: req.body.email });
    if (!user || !user.confirmed) {
      res.wrestler.errors = { base: { messages: ['Invalid email or password'] } };
      return next(new LoginError());
    }
    const passwordHash = await common.hashPasswordFromUser(user, req.body.password);
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
          await req.wrestler.dbDriver.findOneAndUpdate(common.USER_COLLECTION_NAME, { email }, { confirmed: true });
          return res.sendStatus(204);
        } else {
          res.wrestler.errors = { confirmationCode: { messages: ['Expired confirmation code'] } };
          return next(new ValidationError());
        }
      } else {
        res.wrestler.errors = { confirmationCode: { messages: ['Invalid confirmation code'] } };
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
        return res.sendStatus(204);
      }
      const { confirmationCode, confirmationExpiresAt } = buildConfirmation();
      await req.wrestler.dbDriver.findOneAndUpdate(req.wrestler.resource, { email }, { confirmationCode, confirmationExpiresAt });
      res.wrestler.email = buildConfirmationEmail(req, email, confirmationCode);
      res.sendStatus(204);
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
        return res.sendStatus(204);
      }
      const { recoveryCode, recoveryExpiresAt } = buildRecovery();
      await req.wrestler.dbDriver.findOneAndUpdate(req.wrestler.resource, { email }, { recoveryCode, recoveryExpiresAt });
      res.wrestler.email = buildRecoveryEmail(req, email, recoveryCode);
      res.sendStatus(204);
      req.wrestler.bypassRest = true;
    } catch (err) {
      if (process.env.NODE_ENV !== 'test') console.error(err);
      res.wrestler.errors = { base: { messages: ['Unexpected error'] } };
      return next(new UnknownError());
    }
  }
  next();
};

exports.handleRecoverPassword = async (req, res, next) => {
  if (isUserRequest(req) && isRecoverPassword(req)) {
    try {
      const { email, recoveryCode, password } = req.body;
      const errors = await validateRecover(email, recoveryCode, password);
      if (errors) {
        res.wrestler.errors = errors;
        return next(new ValidationError());
      }
      const user = await req.wrestler.dbDriver.findOne(req.wrestler.resource, { email });
      if (!user) {
        res.wrestler.errors = { email: { messages: ['Invalid email'] } };
        return next(new ValidationError());
      }
      const now = new Date();
      if (recoveryCode === user.recoveryCode) {
        if (user.recoveryExpiresAt > now) {
          const doc = await common.hashPassword({ recoveryCode: undefined, recoveryExpiresAt: undefined }, password);
          await req.wrestler.dbDriver.findOneAndUpdate(common.USER_COLLECTION_NAME, { email }, doc);
          return res.sendStatus(204);
        } else {
          res.wrestler.errors = { recoveryCode: { messages: ['Expired recovery code'] } };
          return next(new ValidationError());
        }
      } else {
        res.wrestler.errors = { recoveryCode: { messages: ['Invalid recovery code'] } };
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

exports.handleUserGetRequest = async (req, res, next) => {
  if (isUserRequest(req) && req.method === 'GET') {
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

    req.body = await common.hashPassword(req.body, password);
    req.body = addConfirmation(req);

    res.wrestler.email = buildConfirmationEmail(req, email, req.body.confirmationCode);
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
      req.body = await common.hashPassword(req.body, password);
    }

    res.wrestler.transformer = transformOne;
  }
  next();
};

exports.handleUserDeleteRequest = async (req, res, next) => {
  // TODO: cleanup child resources?
  next();
};

const buildRecovery = () => {
  return buildEmailCodeWithExpiry('recovery');
};

const buildConfirmation = () => {
  return buildEmailCodeWithExpiry('confirmation');
};

const addConfirmation = (req) => {
  const { confirmationCode, confirmationExpiresAt } = buildConfirmation();
  return Object.assign({}, req.body, { confirmationCode, confirmationExpiresAt, confirmed: false });
};

const buildConfirmationEmail = (req, to, confirmationCode) => {
  const defaultSubject = 'Your account has been created!';
  const defaultBody = 'Please confirm your email. Your confirmation code is {{confirmationCode}}';
  return buildEmail(req, 'confirm', to, defaultSubject, defaultBody, { confirmationCode });
};

const buildRecoveryEmail = (req, to, recoveryCode) => {
  const defaultSubject = 'Recover your password';
  const defaultBody = 'You requested to recover your password. Your recovery code is {{recoveryCode}}';
  return buildEmail(req, 'recovery', to, defaultSubject, defaultBody, { recoveryCode });
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

const isRecoverPassword = (req) => {
  return req.method === 'POST' && req.path === '/user/recover-password';
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

const validateRecover = async (email, recoveryCode, password) => {
  const errors = {};
  if (!email) {
    errors.email = { messages: ['Email is required'] };
  }
  if (!recoveryCode) {
    errors.recoveryCode = { messages: ['Recovery code is required'] };
  }
  if (!password) {
    errors.password = { messages: ['Password is required'] };
  }
  return Object.keys(errors).length > 0 ? errors : undefined;
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
  if (email) {
    errors.email = { messages: ['Cannot update email with a PATCH request'] };
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

const requiresAuthentication = (req) => {
  return !(isCreateUser(req) || isLogin(req) || isConfirmation(req) || isResendConfirmation(req) || isForgotPassword(req) || isRecoverPassword(req))
};
