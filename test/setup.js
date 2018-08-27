require('dotenv').config({ path: '.env.test' });

const express = require('express');
const wrestler = require('../wrestler');
const supertest = require('supertest');
const nodemailer = require('nodemailer');
const uuid = require('uuid/v4');
const _ = require('lodash');
const db = require('../lib/db');
const moment = require('moment');

let driver;

const initDatabase = async () => {
  driver = await db.connect();
};

(async () => {
  await initDatabase();
})().then(run);

class WrestlerTester {

  constructor(app, options) {
    this.request = supertest(app);
    this.options = options;
  }

  // noinspection JSMethodCanBeStatic
  getDatabaseDriver() {
    return driver;
  }

  getEmailTransporter() {
    return _.get(this.options, 'email.transporter');
  }

  async dropUsers() {
    await this.options.database.driver.dropCollections('user');
  }

  async dropWidgets() {
    await this.options.database.driver.dropCollections('widget');
  }

  async drop(collections) {
    await this.options.database.driver.dropCollections(collections);
  }

  async createUser(email, password, properties) {
    const user = (await this.request.post('/user').send(Object.assign({ email, password }, properties)).expect(201)).body;
    await driver.findOneAndUpdate('user', { email }, { confirmed: true });
    return user;
  }

  async createUserWithExpiredConfirmation(email, password, properties) {
    const user = (await this.request.post('/user').send(Object.assign({ email, password }, properties)).expect(201)).body;
    await driver.findOneAndUpdate('user', { email }, { confirmed: false, confirmationExpiresAt: new Date(2000, 1, 1) });
    return user;
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
    const user = await driver.findOne('user', { email });
    return user.confirmationCode;
  }

  // noinspection JSMethodCanBeStatic
  async getConfirmationExpiresAt(email) {
    const user = await driver.findOne('user', { email });
    return user.confirmationExpiresAt;
  }

  // TODO: dry up getConfirmationCode, getRecoveryCode, getConfirmationExpiresAt with a getUser method
  // noinspection JSMethodCanBeStatic
  async getRecoveryCode(email) {
    const user = await driver.findOne('user', { email });
    return user.recoveryCode;
  }

  // noinspection JSMethodCanBeStatic
  async expireRecoveryCode(email) {
    const recoveryExpiresAt = moment().subtract(1, 'day').toDate();
    await driver.findOneAndUpdate('user', { email }, { recoveryExpiresAt });
  }

  // noinspection JSMethodCanBeStatic
  async getUser(email) {
    return await driver.findOne('user', { email });
  }

}

class WrestlerTesterBuilder {

  constructor() {
    const transport = { name: 'wrestler', version: '1', send: (mail, callback) => callback(null, { envelope: {}, messageId: uuid() }) };
    const transporter = nodemailer.createTransport(transport);
    this.options = { database: { driver }, email: { transporter } };
  }

  setEmailConfirmationSubject(value) {
    _.set(this.options, 'email.confirm.subject', value);
    return this;
  }

  enableUsers(options) {
    _.set(this.options, 'users', options || true);
    return this;
  }

  enableValidation(options) {
    _.set(this.options, 'validation', options);
    return this;
  }

  build() {
    const app = express();
    app.use(express.json());
    app.use(express.urlencoded({ extended: false }));
    app.use(wrestler(this.options));
    return new WrestlerTester(app, this.options);
  }

}

exports.WrestlerTesterBuilder = WrestlerTesterBuilder;
