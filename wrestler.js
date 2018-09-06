/** @namespace req.wrestler */
/** @namespace req.wrestler.options.dbDriver */

const { WhitelistError, ValidationError, LoginError, UnknownError } = require('./lib/errors');
const { handleRestfulPostRequest, handleRestfulGetRequest, handleRestfulPutRequest, handleRestfulPatchRequest, handleRestfulDeleteRequest } = require('./lib/restful');
const { handleLogin, handleConfirmation, handleResendConfirmation, handleForgotPassword, handleRecoverPassword, handleUserGetRequest, handleUserPostRequest, handleUserPutRequest, handleUserPatchRequest, handleUserDeleteRequest, checkAuthentication, checkAuthorization } = require('./lib/users');
const { whitelist, validateRequest, handleValidationErrors } = require('./lib/validation');
const { handleEmail } = require('./lib/email');
const _ = require('lodash');
const db = require('./lib/db');
const cors = require('cors');
const userChangeEmailHandler = require('./lib/users/change_email').userChangeEmailHandler;

let dbDriver, effectiveOptions;

const defaultOptions = {
  pageSize: 20,
  users: false,
  restrictResources: false,
  resources: {},
};

const setupDatabase = async (databaseOptions) => {
  if (!dbDriver) {
    const driver = databaseOptions.driver;
    if (driver && db.isValidDriver(driver)) {
      dbDriver = driver
    } else {
      dbDriver = await db.connect(databaseOptions);
    }
  }
};

const setupOptions = (options) => {
  if (options.reloadOptions || !effectiveOptions) {
    effectiveOptions = Object.assign({}, defaultOptions, options);
  }
};

const addOptions = (req, res, next) => {
  req.wrestler = { options: effectiveOptions };
  res.wrestler = {};
  next();
};

const addDatabase = async (req, res, next) => {
  const databaseOptions = _.get(req, 'wrestler.options.database');
  try {
    await setupDatabase(databaseOptions);
    req.wrestler.dbDriver = dbDriver;
    next();
  } catch (err) {
    next(err);
  }
};

const parseRequest = async (req, res, next) => {
  const method = req.method.toUpperCase();
  const urlSplit = req.path.split('/');
  urlSplit.shift(); // remove the leading forward slash
  const resource = urlSplit.shift().toLowerCase();
  const id = urlSplit.shift();
  req.method = method;
  req.wrestler.resource = resource;
  req.wrestler.id = id;
  next();
};

const transformErrors = (err, req, res, next) => {
  if (res.wrestler.errors) {
    let code = 400;
    if (err instanceof WhitelistError) {
      code = 404;
    } else if (err instanceof ValidationError) {
      code = 422;
    } else if (err instanceof LoginError) {
      code = 401;
    } else if (err instanceof UnknownError) {
      code = 500;
    }
    res.status(code).json(res.wrestler.errors);
  } else {
    next(err);
  }
};

exports.db = () => {
  return dbDriver;
};

const setup = exports.setup = async (options) => {
  setupOptions(options);
  await setupDatabase(effectiveOptions.database);
};

const start = exports.start = () => {
  return [addOptions, cors(), addDatabase, parseRequest];
};

const auth = exports.auth = () => {
  return [checkAuthentication, checkAuthorization]
};

const validate = exports.validate = (options) => {
  const opts = Object.assign({}, defaultOptions, options);
  return [whitelist, validateRequest(opts), handleValidationErrors]
};

const users = exports.users = () => {
  return [
    handleLogin,
    handleConfirmation,
    handleResendConfirmation,
    handleForgotPassword,
    handleRecoverPassword,
    userChangeEmailHandler,
    handleUserGetRequest,
    handleUserPostRequest,
    handleUserPutRequest,
    handleUserPatchRequest,
    handleUserDeleteRequest
  ];
};

const restful = exports.restful = () => {
  return [
    handleRestfulPostRequest,
    handleRestfulGetRequest,
    handleRestfulPutRequest,
    handleRestfulPatchRequest,
    handleRestfulDeleteRequest,
  ]
};

const emailer = exports.emailer = () => {
  return [handleEmail];
};

const errors = exports.errors = () => {
  return [transformErrors];
};

module.exports = (options) => {
  setupOptions(options);
  const middlewares = [
    start(options),
    auth(),
    validate(options),
    users(),
    restful(),
    emailer(),
    errors()
  ];
  return [].concat.apply([], middlewares);
};
