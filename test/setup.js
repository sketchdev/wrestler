const express = require('express');
const wrestler = require('../wrestler');
const supertest = require('supertest');
const nodemailer = require('nodemailer');
const uuid = require('uuid/v4');
const _ = require('lodash');
const moment = require('moment');
const common = require('../lib/users/common');

class WrestlerTester {

  constructor(app) {
    this.request = supertest(app);
  }

  // noinspection JSMethodCanBeStatic
  getDatabaseDriver() {
    return wrestler.db();
  }

  // noinspection JSMethodCanBeStatic
  getEmailTransporter() {
    return _.get(wrestler.options(), 'email.transporter');
  }

  // noinspection JSMethodCanBeStatic
  async dropUsers() {
    await wrestler.db().dropCollections(common.USER_COLLECTION_NAME);
  }

  // noinspection JSMethodCanBeStatic
  async dropWidgets() {
    await wrestler.db().dropCollections('widget');
  }

  async createUser(email, password, properties) {
    const resp = await this.request.post('/user').send(Object.assign({ email, password }, properties));
    if (resp.status !== 201) {
      throw new Error(`failed to create user: ${email}`);
    }
    const user = (resp).body;
    await wrestler.db().findOneAndUpdate(common.USER_COLLECTION_NAME, { email }, { confirmed: true });
    return user;
  }

  async createUserWithExpiredConfirmation(email, password, properties) {
    const user = (await this.request.post('/user').send(Object.assign({ email, password }, properties)).expect(201)).body;
    await wrestler.db().findOneAndUpdate(common.USER_COLLECTION_NAME, { email }, { confirmed: false, confirmationExpiresAt: new Date(2000, 1, 1) });
    return user;
  }

  // noinspection JSMethodCanBeStatic
  async updateUser(email, doc) {
    return await wrestler.db().findOneAndUpdate(common.USER_COLLECTION_NAME, { email }, doc);
  }

  async loginUser(email, password) {
    const { token } = (await this.request.post('/user/login').send({ email, password }).expect(200)).body;
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

  async delete(path, body, token) {
    return await this.send('delete', path, body, token);
  }

  async createWidget(properties, token) {
    return (await this.post('/widget', properties, token)).body;
  }

  // noinspection JSMethodCanBeStatic
  async getConfirmationCode(email) {
    const user = await wrestler.db().findOne(common.USER_COLLECTION_NAME, { email });
    return user.confirmationCode;
  }

  // noinspection JSMethodCanBeStatic
  async getConfirmationExpiresAt(email) {
    const user = await wrestler.db().findOne(common.USER_COLLECTION_NAME, { email });
    return user.confirmationExpiresAt;
  }

  // TODO: dry up getConfirmationCode, getRecoveryCode, getConfirmationExpiresAt with a getUser method
  // noinspection JSMethodCanBeStatic
  async getRecoveryCode(email) {
    const user = await wrestler.db().findOne(common.USER_COLLECTION_NAME, { email });
    return user.recoveryCode;
  }

  // noinspection JSMethodCanBeStatic
  async expireRecoveryCode(email) {
    const recoveryExpiresAt = moment().subtract(1, 'day').toDate();
    await wrestler.db().findOneAndUpdate(common.USER_COLLECTION_NAME, { email }, { recoveryExpiresAt });
  }

  // noinspection JSMethodCanBeStatic
  async getUser(email) {
    return await wrestler.db().findOne(common.USER_COLLECTION_NAME, { email });
  }

}

class WrestlerTesterBuilder {

  constructor() {
    const transport = { name: 'wrestler', version: '1', send: (mail, callback) => callback(null, { envelope: {}, messageId: uuid() }) };
    const transporter = nodemailer.createTransport(transport);
    this.options = { email: { transporter }, reload: true };
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
    const api = await wrestler.setup(this.options);
    for (const user of this.users) {
      await wrestler.createUserIfNotExist(user);
    }
    const app = express();
    app.use(express.json());
    app.use(express.urlencoded({ extended: false }));
    app.use(api);
    return new WrestlerTester(app, this.options);
  }

}

exports.WrestlerTesterBuilder = WrestlerTesterBuilder;
