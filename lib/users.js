const util = require('util');
const validator = require('validator');
const jwt = require('jsonwebtoken');
const _ = require('lodash');
const common = require('./users/common');
const ForbiddenError = require('./errors').ForbiddenError;
const validateEmailUniqueness = require('./users/common').validateEmailUniqueness;
const jwtSign = util.promisify(jwt.sign);
const jwtVerify = util.promisify(jwt.verify);
const buildEmailCodeWithExpiry = require('./users/common').buildEmailCodeWithExpiry;
const buildEmail = require('./users/common').buildEmail;
const isUserRequest = require('./users/common').isUserRequest;
const { LoginError, ValidationError, UnknownError } = require('./errors');
const JWT_SECRET_KEY = require('./users/common').JWT_SECRET_KEY;

exports.checkAuthentication = async (req, res, next) => {
  try {
    if (req.wrestler.options.users) {
      if (req.headers.authorization) {
        const [scheme, token] = req.headers.authorization.split(' ');
        if (scheme === 'Bearer') {
          try {
            let user = await jwtVerify(token, JWT_SECRET_KEY, { algorithm: 'HS512' });
            const dbUser = await req.wrestler.dbDriver.findOne(common.USER_COLLECTION_NAME, { id: user.id });
            if (!dbUser || !dbUser.active || !dbUser.confirmed) {
              return res.sendStatus(403);
            }
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
  } catch (err) {
    next(err);
  }
};

exports.checkAuthorization = async (req, res, next) => {
  try {
    if (bypassesAuthorization(req)) {
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
          const resourceAuthorized = allow.resource ? allow.resource === '*' || allow.resource === _.get(req, 'wrestler.resource') : true;
          const roleAuthorized = allow.roles === '*' || allow.roles.includes(_.get(req, 'wrestler.user.role'));
          const methodAuthorized = allow.methods ? allow.methods === '*' || allow.methods.includes(req.method) : true;
          if (resourceAuthorized && roleAuthorized && methodAuthorized) {
            if (allow.onlyOwned) {
              if (req.wrestler.resource === common.USER_COLLECTION_NAME) {
                if (req.wrestler.user.id === req.wrestler.id) {
                  req.wrestler.user.filter = { id: req.wrestler.user.id };
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
  } catch (err) {
    next(err);
  }
};

exports.handleLogin = async (req, res, next) => {
  try {
    if (isUserRequest(req) && isLogin(req)) {
      let user;
      user = await req.wrestler.dbDriver.findOne(req.wrestler.resource, { email: req.body.email });
      if (!user || !user.confirmed || !user.active) {
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
  } catch (err) {
    next(err);
  }
};

exports.handleConfirmation = async (req, res, next) => {
  try {
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
  } catch (err) {
    next(err);
  }
};

exports.handleResendConfirmation = async (req, res, next) => {
  try {
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
  } catch (err) {
    next(err);
  }
};

exports.handleForgotPassword = async (req, res, next) => {
  try {
    if (isUserRequest(req) && isForgotPassword(req)) {
      try {
        const { email } = req.body;
        const user = await req.wrestler.dbDriver.findOne(req.wrestler.resource, { email, confirmed: true, active: true });
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
  } catch (err) {
    next(err);
  }
};

exports.handleRecoverPassword = async (req, res, next) => {
  try {
    if (isUserRequest(req) && isRecoverPassword(req)) {
      try {
        const { email, recoveryCode, password } = req.body;
        const errors = await validateRecover(email, recoveryCode, password);
        if (errors) {
          res.wrestler.errors = errors;
          return next(new ValidationError());
        }
        const user = await req.wrestler.dbDriver.findOne(req.wrestler.resource, { email, confirmed: true, active: true });
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
  } catch (err) {
    next(err);
  }
};

exports.handleUserGetRequest = async (req, res, next) => {
  try {
    if (isUserRequest(req) && req.method === 'GET') {
      res.wrestler.transformer = req.wrestler.id ? transformOne : transformMany;
    }
    next();
  } catch (err) {
    next(err);
  }
};

exports.handleUserInviteRequest = async (req, res, next) => {
  try {
    if (isUserRequest(req) && isInviteOnly(req) && isInviteUser(req)) {
      const { email } = req.body;
      req.body = sanitizeBody(req);

      const errors = await validateInvite(req, email);
      if (errors) {
        res.wrestler.errors = errors;
        return next(new ValidationError());
      }

      req.body = await common.hashPassword(req.body, common.randomPassword());
      req.body = addInvite(req);
      req.body.confirmed = false;
      req.body.active = true;

      res.wrestler.email = buildInviteEmail(req, email, req.body.inviteCode);
      res.wrestler.transformer = transformOne;
      req.wrestler.id = null;
    }
    next();
  } catch (err) {
    next(err);
  }
};

exports.handleResendInvite = async (req, res, next) => {
  try {
    if (isUserRequest(req) && isInviteOnly(req) && isResendInvite(req)) {
      try {
        const { email } = req.body;
        const user = await req.wrestler.dbDriver.findOne(req.wrestler.resource, { email });
        if (!user) {
          return res.sendStatus(404);
        }
        const { inviteCode, inviteExpiresAt } = buildInvite();
        await req.wrestler.dbDriver.findOneAndUpdate(req.wrestler.resource, { email }, { inviteCode, inviteExpiresAt });
        res.wrestler.email = buildInviteEmail(req, email, inviteCode);
        res.sendStatus(204);
        req.wrestler.bypassRest = true;
      } catch (err) {
        if (process.env.NODE_ENV !== 'test') console.error(err);
        res.wrestler.errors = { base: { messages: ['Unexpected error'] } };
        return next(new UnknownError());
      }
    }
    next();
  } catch (err) {
    next(err);
  }
};

exports.handleUserInviteConfirmRequest = async (req, res, next) => {
  try {
    if (isUserRequest(req) && isInviteOnly(req) && isInviteConfirmUser(req)) {
      try {
        const { email, password, inviteCode } = req.body;
        req.body = sanitizeBody(req);

        if (!password) {
          res.wrestler.errors = { password: { messages: ['Password is required'] } };
          return next(new ValidationError());
        }
        const user = await req.wrestler.dbDriver.findOne(req.wrestler.resource, { email, confirmed: false });
        if (!user) {
          res.wrestler.errors = { email: { messages: ['Invalid email'] } };
          return next(new ValidationError());
        }
        const now = new Date();
        if (inviteCode === user.inviteCode) {
          if (user.inviteExpiresAt > now) {
            req.body = await common.hashPassword(req.body, password);
            req.body.confirmed = true;
            await req.wrestler.dbDriver.findOneAndUpdate(common.USER_COLLECTION_NAME, { email }, req.body);
            return res.sendStatus(204);
          } else {
            res.wrestler.errors = { inviteCode: { messages: ['Expired invite code'] } };
            return next(new ValidationError());
          }
        } else {
          res.wrestler.errors = { inviteCode: { messages: ['Invalid invite code'] } };
          return next(new ValidationError());
        }
      } catch (err) {
        if (process.env.NODE_ENV !== 'test') console.error(err);
        res.wrestler.errors = { base: { messages: ['Unexpected error'] } };
        return next(new UnknownError());
      }
    }
    next();
  } catch (err) {
    next(err);
  }
};

exports.handleUserPostRequest = async (req, res, next) => {
  try {
    if (isUserRequest(req) && isCreateUser(req)) {
      if (isInviteOnly(req)) {
        res.wrestler.errors = { base: { messages: ['Users can only be invited'] } };
        return next(new ForbiddenError());
      }

      const { email, password } = req.body;
      req.body = sanitizeBody(req);

      const errors = await validateInsert(req, email, password);
      if (errors) {
        res.wrestler.errors = errors;
        return next(new ValidationError());
      }

      req.body = await common.hashPassword(req.body, password);
      req.body = addConfirmation(req);
      req.body.active = true;

      res.wrestler.email = buildConfirmationEmail(req, email, req.body.confirmationCode);
      res.wrestler.transformer = transformOne;
    }
    next();
  } catch (err) {
    next(err);
  }
};

exports.handleUserPutRequest = async (req, res, next) => {
  try {
    if (isUserRequest(req) && req.method === 'PUT') {
      return res.sendStatus(405);
    }
    next();
  } catch (err) {
    next(err);
  }
};

exports.handleUserPatchRequest = async (req, res, next) => {
  try {
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
  } catch (err) {
    next(err);
  }
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

const buildInvite = () => {
  return buildEmailCodeWithExpiry('invite');
};

const addConfirmation = (req) => {
  const { confirmationCode, confirmationExpiresAt } = buildConfirmation();
  return Object.assign({}, req.body, { confirmationCode, confirmationExpiresAt, confirmed: false });
};

const addInvite = (req) => {
  const { inviteCode, inviteExpiresAt } = buildInvite();
  return Object.assign({}, req.body, { inviteCode, inviteExpiresAt });
};

const buildInviteEmail = (req, to, inviteCode) => {
  const defaultSubject = 'You\'re invited!';
  const defaultBody = 'You\'ve been invited!. Your invite code is {{inviteCode}}';
  return buildEmail(req, 'invite', to, defaultSubject, defaultBody, { inviteCode });
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

const isInviteOnly = (req) => {
  return _.get(req, 'wrestler.options.users.inviteOnly', false);
};

const isCreateUser = (req) => {
  return req.method === 'POST' && req.path === '/user';
};

const isInviteUser = (req) => {
  return req.method === 'POST' && req.path === '/user/invite';
};

const isInviteConfirmUser = (req) => {
  return req.method === 'POST' && req.path === '/user/invite-confirm';
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

const isResendInvite = (req) => {
  return req.method === 'POST' && req.path === '/user/resend-invite';
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

const validateInvite = async (req, email) => {
  const errors = {};
  if (!email) {
    errors.email = { messages: ['Email is required'] };
  }
  if (email && !validator.isEmail(email)) {
    errors.email = { messages: ['Email is invalid'] };
  }
  await validateEmailUniqueness(req, email, errors);
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
  const permitEmailPatches = _.get(req, 'wrestler.options.users.permitEmailPatches', false);
  if (email && !permitEmailPatches) {
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
  delete user.inviteCode;
  return user;
};

const requiresAuthentication = (req) => {
  return !(isCreateUser(req)
    || isLogin(req)
    || isConfirmation(req)
    || isResendConfirmation(req)
    || isForgotPassword(req)
    || isRecoverPassword(req)
    || isInviteConfirmUser(req)
  );
};

const bypassesAuthorization = (req) => {
  return isLogin(req)
    || isConfirmation(req)
    || isResendConfirmation(req)
    || isForgotPassword(req)
    || isRecoverPassword(req)
    || isInviteConfirmUser(req);
};
