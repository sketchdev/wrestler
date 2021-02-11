const _ = require('lodash');
const db = require('./lib/db');
const errors = require('./lib/errors');
const restful = require('./lib/restful');
const users = require('./lib/users');
const validation = require('./lib/validation');
const changeEmail = require('./lib/users/change_email');
const email = require('./lib/email');
const confirmChangeEmail = require('./lib/users/confirm_change_email');
const common = require('./lib/users/common');

class Wrestler {

  constructor() {
    this.dbDriver = undefined;
    this.effectiveOptions = undefined;
    this.defaultOptions = { pageSize: 20, users: false, restrictResources: false, resources: {}, jwtTimeout: '1h' };
  }

  setupOptions(options = {}) {
    if (!this.effectiveOptions) {
      this.effectiveOptions = Object.assign({}, this.defaultOptions, options);
    }
  };

  async setupDatabase() {
    if (!this.dbDriver) {
      const driver = _.get(this.effectiveOptions, 'database.driver');
      if (driver && db.isValidDriver(driver)) {
        this.dbDriver = driver
      } else {
        this.dbDriver = await db.connect(this.effectiveOptions.database);
      }
    }
  };

  addOptions(req, res, next) {
    req.wrestler = { options: this.effectiveOptions };
    res.wrestler = {};
    next();
  };

  async addDatabase(req, res, next) {
    const databaseOptions = _.get(req, 'wrestler.options.database');
    try {
      await this.setupDatabase(databaseOptions);
      req.wrestler.dbDriver = this.dbDriver;
      next();
    } catch (err) {
      next(err);
    }
  };

  // noinspection JSMethodCanBeStatic
  async parseRequest(req, res, next) {
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

  // noinspection JSMethodCanBeStatic
  transformErrors(err, req, res, next) {
    if (res.wrestler.errors) {
      let code = 400;
      if (err instanceof errors.WhitelistError) {
        code = 404;
      } else if (err instanceof errors.ValidationError) {
        code = 422;
      } else if (err instanceof errors.ForbiddenError) {
        code = 403;
      } else if (err instanceof errors.LoginError) {
        code = 401;
      } else if (err instanceof errors.UnknownError) {
        code = 500;
      }
      res.status(code).json(res.wrestler.errors);
    } else {
      if (process.env.NODE_ENV === 'test') console.log('ERROR', err);
      next(err);
    }
  };

  startMiddleware() {
    return [this.addOptions.bind(this), this.addDatabase.bind(this), this.parseRequest.bind(this)];
  };

  // noinspection JSMethodCanBeStatic
  authMiddleware() {
    return [users.checkAuthentication.bind(this), users.checkAuthorization.bind(this)]
  };

  validateMiddleware() {
    return [
      validation.whitelist.bind(this),
      validation.validateRequest(this.effectiveOptions).bind(this),
      validation.handleValidationErrors.bind(this)
    ]
  };

  // noinspection JSMethodCanBeStatic
  userMiddleware() {
    return [
      users.handleLogin.bind(this),
      users.handleConfirmation.bind(this),
      users.handleResendConfirmation.bind(this),
      users.handleForgotPassword.bind(this),
      users.handleRecoverPassword.bind(this),
      changeEmail.userChangeEmailHandler.bind(this),
      confirmChangeEmail.userConfirmChangeEmailHandler.bind(this),
      users.handleUserGetRequest.bind(this),
      users.handleUserInviteRequest.bind(this),
      users.handleResendInvite.bind(this),
      users.handleUserInviteConfirmRequest.bind(this),
      users.handleUserPostRequest.bind(this),
      users.handleUserPutRequest.bind(this),
      users.handleUserPatchRequest.bind(this),
      users.handleUserDeleteRequest.bind(this),
      users.handleUserRefreshTokenRequest.bind(this)
    ];
  };

  // noinspection JSMethodCanBeStatic
  restfulMiddleware() {
    return [
      restful.handleRestfulPostRequest.bind(this),
      restful.handleRestfulGetRequest.bind(this),
      restful.handleRestfulPutRequest.bind(this),
      restful.handleRestfulPatchRequest.bind(this),
      restful.handleRestfulDeleteRequest.bind(this),
    ]
  };

  // noinspection JSMethodCanBeStatic
  emailMiddleware() {
    return [email.handleEmail.bind(this)];
  };

  errorMiddleware() {
    return [this.transformErrors.bind(this)];
  };

  async setup(options) {
    this.setupOptions(options);
    await this.setupDatabase();
  };

  middleware() {
    return [
      this.startMiddleware(),
      this.authMiddleware(),
      this.validateMiddleware(),
      this.userMiddleware(),
      this.restfulMiddleware(),
      this.emailMiddleware(),
      this.errorMiddleware()
    ];
  }

  async createUserIfNotExist(user) {
    let userClone = { ...user };
    const { email, password } = userClone;
    delete userClone.password;
    const dbUser = await this.dbDriver.findOne(common.USER_COLLECTION_NAME, { email });
    if (!dbUser) {
      const now = new Date();
      userClone = await common.hashPassword(userClone, password);
      userClone = { ...userClone, confirmed: true, active: true, createdAt: now, updatedAt: now };
      await this.dbDriver.insertOne(common.USER_COLLECTION_NAME, userClone);
    }
  };

  db() {
    return this.dbDriver;
  };

  options() {
    return this.effectiveOptions;
  };

}

module.exports = Wrestler;

