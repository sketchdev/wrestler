const _ = require('lodash');
const db = require('./lib/db');
const errors = require('./lib/errors');
const restful = require('./lib/restful');
const users = require('./lib/users');
const validation = require('./lib/validation');
const changeEmail = require('./lib/users/change_email');
const email = require('./lib/email');
const confirmChangeEmail = require('./lib/users/confirm_change_email');

let dbDriver, effectiveOptions;

const defaultOptions = {
  pageSize: 20,
  users: false,
  restrictResources: false,
  resources: {},
};

const setupOptions = (options) => {
  if (options.reload || !effectiveOptions) {
    effectiveOptions = Object.assign({}, defaultOptions, options);
  }
};

const setupDatabase = async () => {
  if (!dbDriver) {
    const driver = _.get(effectiveOptions, 'database.driver');
    if (driver && db.isValidDriver(driver)) {
      dbDriver = driver
    } else {
      dbDriver = await db.connect(effectiveOptions.database);
    }
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
    if (err instanceof errors.WhitelistError) {
      code = 404;
    } else if (err instanceof errors.ValidationError) {
      code = 422;
    } else if (err instanceof errors.LoginError) {
      code = 401;
    } else if (err instanceof errors.UnknownError) {
      code = 500;
    }
    res.status(code).json(res.wrestler.errors);
  } else {
    next(err);
  }
};

const startMiddlware = () => {
  return [addOptions, addDatabase, parseRequest];
};

const authMiddleware = () => {
  return [users.checkAuthentication, users.checkAuthorization]
};

const validateMiddleware = () => {
  return [validation.whitelist, validation.validateRequest(effectiveOptions), validation.handleValidationErrors]
};

const userMiddleware = () => {
  return [
    users.handleLogin,
    users.handleConfirmation,
    users.handleResendConfirmation,
    users.handleForgotPassword,
    users.handleRecoverPassword,
    changeEmail.userChangeEmailHandler,
    confirmChangeEmail.userConfirmChangeEmailHandler,
    users.handleUserGetRequest,
    users.handleUserPostRequest,
    users.handleUserPutRequest,
    users.handleUserPatchRequest,
    users.handleUserDeleteRequest,
  ];
};

const restfulMiddleware = () => {
  return [
    restful.handleRestfulPostRequest,
    restful.handleRestfulGetRequest,
    restful.handleRestfulPutRequest,
    restful.handleRestfulPatchRequest,
    restful.handleRestfulDeleteRequest,
  ]
};

const emailMiddleware = () => {
  return [email.handleEmail];
};

const errorMiddlware = () => {
  return [transformErrors];
};

exports.setup = async (options) => {
  setupOptions(options);
  await setupDatabase();
  const middlewares = [startMiddlware(), authMiddleware(), validateMiddleware(), userMiddleware(), restfulMiddleware(), emailMiddleware(), errorMiddlware()];
  return [].concat.apply([], middlewares);
};

exports.db = () => {
  return dbDriver;
};

exports.options = () => {
  return effectiveOptions;
};
