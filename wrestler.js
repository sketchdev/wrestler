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

let dbDriver;

const defaultOptions = {
  pageSize: 20,
  users: false,
  restrictResources: false,
  resources: {},
};

const setOptions = (options) => async (req, res, next) => {
  req.wrestler = { options };
  res.wrestler = {};
  next();
};

const connectToDatabase = async (req, res, next) => {
  try {
    if (!dbDriver) {
      const databaseOptions = _.get(req, 'wrestler.options.database');
      if (databaseOptions && databaseOptions.driver && db.isValidDriver(databaseOptions.driver)) {
        dbDriver = databaseOptions.driver
      } else {
        dbDriver = await db.connect(databaseOptions);
      }
    }
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

module.exports = (options) => {
  const opts = Object.assign({}, defaultOptions, options);
  return [
    setOptions(opts),
    cors(),
    connectToDatabase,
    parseRequest,
    checkAuthentication,
    checkAuthorization,
    whitelist,
    validateRequest(opts),
    handleValidationErrors,
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
    handleUserDeleteRequest,
    handleRestfulPostRequest,
    handleRestfulGetRequest,
    handleRestfulPutRequest,
    handleRestfulPatchRequest,
    handleRestfulDeleteRequest,
    handleEmail,
    transformErrors
  ];
};
