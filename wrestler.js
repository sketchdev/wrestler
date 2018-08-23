/** @namespace req.wrestler */
/** @namespace req.wrestler.options.dbDriver */

const { WhitelistError, ValidationError, LoginError } = require('./lib/errors');
const { handleRestfulPostRequest, handleRestfulGetRequest, handleRestfulPutRequest, handleRestfulPatchRequest, handleRestfulDeleteRequest } = require('./lib/restful');
const { handleLogin, handleUserGetRequest, handleUserPostRequest, handleUserPutRequest, handleUserPatchRequest, handleUserDeleteRequest, checkAuthentication, checkAuthorization } = require('./lib/users');
const { whitelist, validateRequest, handleValidationErrors } = require('./lib/validation');
const { handleEmail } = require('./lib/email');
const _ = require('lodash');
const db = require('./lib/db');

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

const setCors = async (req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Location");
  next();
};

const connectToDatabase = async (req, res, next) => {
  try {
    if (!dbDriver) {
      const databaseOptions = _.get(req, 'wrestler.options.database');
      if (databaseOptions.driver && db.isValidDriver(databaseOptions.driver)) {
        dbDriver = databaseOptions.driver
      } else {
        dbDriver = await db.connect(databaseOptions);
      }
    }
    req.db = dbDriver;
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
  req.resource = resource;
  req.id = id;
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
    setCors,
    connectToDatabase,
    parseRequest,
    checkAuthentication,
    checkAuthorization,
    whitelist,
    validateRequest(opts),
    handleValidationErrors,
    handleLogin,
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
