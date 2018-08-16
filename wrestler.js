/** @namespace req.wrestler */

const { WhitelistError, ValidationError, LoginError } = require('./errors');
const { handleRestRequest } = require('./rest_handlers');
const { handleUserRequest, checkAuthentication, checkAuthorization } = require('./user_handlers');
const { whitelist, validateRequest, handleValidationErrors } = require('./validation');
const dbUtil = require('./db/db-util');

let db;

const defaultOptions = {
  pageSize: 20,
  handleUsers: true,
  restrictResources: false,
  resources: {},
};

const setOptions = (options) => async (req, res, next) => {
  req.wrestler = {};
  res.wrestler = {};
  req.wrestler.options = options;
  next();
};

const setCors = async (req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Location");
  next();
};

const connectToDatabase = async (req, res, next) => {
  try {
    if (!db) {
      if (req.app.wrestler && dbUtil.isValidDriver(req.app.wrestler.db)) {
        db = req.app.wrestler.db;
      } else {
        db = await dbUtil.connect();
      }
    }
    req.db = db;
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
    handleUserRequest,
    handleRestRequest,
    transformErrors
  ];
};
