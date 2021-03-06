const express = require('express');
const Wrestler = require('../wrestler');
const supertest = require('supertest');
const nodemailer = require('nodemailer');
const uuid = require('uuid');
const _ = require('lodash');
const moment = require('moment');
const common = require('../lib/users/common');
const util = require('util');
const MongoDriver = require('../lib/mongo');
const NeDbDriver = require('../lib/nedb');
const PgDriver = require('../lib/pg');

let dbDriver;

// used to limit the number of database connections
const openDatabaseDriver = async () => {
  if (!dbDriver) {
    if (process.env.MONGO_DB_URI && process.env.MONGO_DB_NAME) {
      dbDriver = new MongoDriver({});
    }
    if (process.env.PG_CONNECTION_STRING) {
      dbDriver = new PgDriver({});
    }
    if (!dbDriver) {
      dbDriver = new NeDbDriver({});
    }
  }
  await dbDriver.connect();
  return dbDriver;
};

class WrestlerTester {

  constructor(app, wrestler) {
    this.request = supertest(app);
    this.wrestler = wrestler;
  }

  // noinspection JSMethodCanBeStatic
  getDatabaseDriver() {
    return this.wrestler.db();
  }

  // noinspection JSMethodCanBeStatic
  getEmailTransporter() {
    return _.get(this.wrestler.options(), 'email.transporter');
  }

  // noinspection JSMethodCanBeStatic
  async dropUsers() {
    await this.wrestler.db().clean(common.USER_COLLECTION_NAME);
  }

  // noinspection JSMethodCanBeStatic
  async dropWidgets() {
    await this.wrestler.db().clean('widget');
  }

  // noinspection JSMethodCanBeStatic
  async clean(collection) {
    await this.wrestler.db().clean(collection);
  }

  async createUser(email, password, properties) {
    const resp = await this.request.post('/user').send(Object.assign({ email, password }, properties));
    if (resp.status !== 201) {
      throw new Error(`failed to create user: ${email}: ${resp.status} || ${util.inspect(resp.body)}`);
    }
    const user = (resp).body;
    await this.wrestler.db().findOneAndUpdate(common.USER_COLLECTION_NAME, { email }, { confirmed: true });
    return user;
  }

  async createUserWithExpiredConfirmation(email, password, properties) {
    const user = (await this.request.post('/user').send(Object.assign({ email, password }, properties)).expect(201)).body;
    await this.wrestler.db().findOneAndUpdate(common.USER_COLLECTION_NAME, { email }, { confirmed: false, confirmationExpiresAt: new Date(2000, 1, 1) });
    return user;
  }

  // noinspection JSMethodCanBeStatic
  async updateUser(email, doc) {
    return await this.wrestler.db().findOneAndUpdate(common.USER_COLLECTION_NAME, { email }, doc);
  }

  async loginUser(email, password) {
    const resp = await this.request.post('/user/login').send({ email, password });
    const { token } = resp.body;
    if (!token) {
      throw new Error(`failed to login user: ${email}: ${resp.status} || ${util.inspect(resp.body)}`);
    }
    return token;
  }

  async createAndLoginUser(email, password, properties) {
    const user = await this.createUser(email, password, properties);
    const token = await this.loginUser(email, password);
    return { user, token };
  }

  async send(method, path, body, token) {
    const req = this.request[method](path);
    if (token) {
      req.set('Authorization', `Bearer ${token}`);
    }
    return await req.send(body);
  }

  async get(path, token) {
    return await this.send('get', path, undefined, token);
  }

  async post(path, body, token) {
    return await this.send('post', path, body, token);
  }

  async put(path, body, token) {
    return await this.send('put', path, body, token);
  }

  async patch(path, body, token) {
    return await this.send('patch', path, body, token);
  }

  async delete(path, token) {
    return await this.send('delete', path, undefined, token);
  }

  async createWidget(properties, token) {
    return (await this.post('/widget', properties, token)).body;
  }

  // noinspection JSMethodCanBeStatic
  async getConfirmationCode(email) {
    const user = await this.wrestler.db().findOne(common.USER_COLLECTION_NAME, { email });
    return user.confirmationCode;
  }

  // noinspection JSMethodCanBeStatic
  async getInviteCode(email) {
    const user = await this.wrestler.db().findOne(common.USER_COLLECTION_NAME, { email });
    return user.inviteCode;
  }

  // noinspection JSMethodCanBeStatic
  async getConfirmationExpiresAt(email) {
    const user = await this.wrestler.db().findOne(common.USER_COLLECTION_NAME, { email });
    return user.confirmationExpiresAt;
  }

  // TODO: dry up getConfirmationCode, getRecoveryCode, getConfirmationExpiresAt with a getUser method
  // noinspection JSMethodCanBeStatic
  async getRecoveryCode(email) {
    const user = await this.wrestler.db().findOne(common.USER_COLLECTION_NAME, { email });
    return user.recoveryCode;
  }

  // noinspection JSMethodCanBeStatic
  async expireRecoveryCode(email) {
    const recoveryExpiresAt = moment().subtract(1, 'day').toDate();
    await this.wrestler.db().findOneAndUpdate(common.USER_COLLECTION_NAME, { email }, { recoveryExpiresAt });
  }

  // noinspection JSMethodCanBeStatic
  async expireInviteCode(email) {
    const inviteExpiresAt = moment().subtract(1, 'day').toDate();
    await this.wrestler.db().findOneAndUpdate(common.USER_COLLECTION_NAME, { email }, { inviteExpiresAt });
  }

  // noinspection JSMethodCanBeStatic
  async getUser(email) {
    return await this.wrestler.db().findOne(common.USER_COLLECTION_NAME, { email });
  }

}

class WrestlerTesterBuilder {

  constructor(options = {}) {
    const transport = { name: 'wrestler', version: '1', send: (mail, callback) => callback(null, { envelope: {}, messageId: uuid.v4() }) };
    const transporter = nodemailer.createTransport(transport);
    this.options = Object.assign({}, { email: { transporter } }, options);
    this.users = [];
  }

  setEmailConfirmationSubject(value) {
    _.set(this.options, 'email.confirm.subject', value);
    return this;
  }

  enableUsers(options) {
    _.set(this.options, 'users', options || true);
    return this;
  }

  createUser(user) {
    this.users.push(user);
    return this;
  }

  enableValidation(options) {
    _.set(this.options, 'validation', options);
    return this;
  }

  async build() {
    const driver = await openDatabaseDriver();
    const options = Object.assign(this.options, { database: { driver }});
    const wrestler = new Wrestler();
    await wrestler.setup(options);
    await wrestler.db().clean(common.USER_COLLECTION_NAME);
    for (const user of this.users) {
      await wrestler.createUserIfNotExist(user);
    }
    const app = express();
    app.use(express.json());
    app.use(express.urlencoded({ extended: false }));
    app.use(wrestler.middleware());
    return new WrestlerTester(app, wrestler);
  }

}

exports.WrestlerTesterBuilder = WrestlerTesterBuilder;
