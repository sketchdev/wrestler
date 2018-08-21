require('./setup');

const express = require('express');
const wrestler = require('../wrestler');
const supertest = require('supertest');
const nodemailer = require('nodemailer');
const sinon = require('sinon');
const { assert } = require('chai');
const uuid = require('uuid/v4');

describe('Handling user requests', () => {

  let app, request, transport, transporter, tom, sam;

  before(() => {
    app = express();
    app.use(express.json());
    app.use(express.urlencoded({ extended: false }));
    app.use(wrestler({ users: true, email: { register: { subject: 'Welcome!' } } }));
    request = supertest(app);
    transport = { name: 'wrestler', version: '1', send: (mail, callback) => callback(null, { envelope: {}, messageId: uuid() }) };
    transporter = nodemailer.createTransport(transport);
    app.wrestler = { db: testDb, email: { transporter } };
  });

  beforeEach(async () => {
    await testDb.dropCollections('user');
    tom = (await request.post('/user').send({ email: 'tom@mailinator.com', password: 'welcome@1', age: 40 }).expect(201)).body;
    sam = (await request.post('/user').send({ email: 'sam@mailinator.com', password: 'welcome@1', age: 20 }).expect(201)).body;
  });

  afterEach(async () => {
    sinon.reset();
  });

  it('requires authentication to other resources if enabled', async () => {
    await request.get('/widget').expect(401);
  });

  it('expires login tokens after a period of time');

  describe('POST /user', () => {

    context('success', () => {

      let resp;

      beforeEach(async () => {
        sinon.spy(transporter, 'sendMail');
        resp = await request.post('/user').send({ email: 'bob@mailinator.com', password: 'welcome@1' });
      });

      afterEach(async () => {
        assert.exists(resp.headers.location);
        assert.equal(resp.body.email, 'bob@mailinator.com');
        assert.notExists(resp.body.password);
        assert.notExists(resp.body.confirmationCode);
        assert.notExists(resp.body.confirmed);
        assert.exists(resp.body.createdAt);
        assert.exists(resp.body.updatedAt);
        assert.exists(resp.body.id);
        transporter.sendMail.restore();
      });

      it('returns the correct status code', async () => {
        assert.equal(resp.statusCode, 201);
      });

      it('sends the default email', async () => {
        assert.equal(transporter.sendMail.firstCall.args[0].subject, 'Welcome!');
      });

      it('sends a customized email');
      it('blocks access to other resources until account is confirmed');
      it('expires confirmation tokens after a period of time');

    });

    context('failure', () => {

      it('returns an error if the user email already exists', async () => {
        const resp = await request.post('/user').send({ email: 'tom@mailinator.com', password: 'welcome@1' }).expect(400);
        assert.deepEqual(resp.body, { email: { messages: ['Email already exists'] } });
      });

      it('returns an error if no email is supplied', async () => {
        const resp = await request.post('/user').send({ emale: 'bob@mailinator.com', password: 'welcome@1' }).expect(400);
        assert.deepEqual(resp.body, { email: { messages: ['Email is required'] } });
      });

      it('returns an error if no password is supplied', async () => {
        const resp = await request.post('/user').send({ email: 'bob@mailinator.com', passsword: 'welcome@1' }).expect(400);
        assert.deepEqual(resp.body, { password: { messages: ['Password is required'] } });
      });

      it('returns an error if the email is invalid', async () => {
        const resp = await request.post('/user').send({ email: 'bob@mailinator', password: 'welcome@1' }).expect(400);
        assert.deepEqual(resp.body, { email: { messages: ['Email is invalid'] } });
      });

      it('returns an error if the database fails when detecting email uniqueness', async () => {
        const resp = await request.post('/user').send({ email: 'tom@mailinator.com', password: 'welcome@1' }).expect(400);
        assert.deepEqual(resp.body, { email: { messages: ['Email already exists'] } });
      });

    });

  });

  describe('POST /user/forgot-password', () => {

    context('success', () => {

      it('returns the correct status code');
      it('always returns a success status code even if the user email does not exist');
      it('sends a recovery email to the user only if the user email exists');

    });

    context('failure', () => {

      it('returns an error if no email is supplied');

    });

  });

  describe('POST /user/recover-password', () => {

    context('success', () => {

      it('returns the correct status code');
      it('authenticates with the new password');

    });

    context('failure', () => {

      it('returns an error if the recovery token does not exist');
      it('returns an error if the recovery token is past expiration');

    });

  });

  describe('POST /user/login', () => {

    context('success', () => {

      let resp;

      beforeEach(async () => {
        resp = await request.post('/user/login').send({ email: 'tom@mailinator.com', password: 'welcome@1' });
      });

      it('returns the correct status code', async () => {
        assert.equal(resp.statusCode, 200);
      });

      it('returns a login token', async () => {
        assert.exists(resp.body.token);
      });

    });

    context('failure', () => {

      it('returns an error if the email is not found', async () => {
        const resp = await request.post('/user/login').send({ email: 'thomas@mailinator.com', password: 'welcome@2' }).expect(401);
        assert.deepEqual(resp.body, { base: { messages: ['Invalid email or password'] } });
      });

      it('returns an error if credentials are incorrect', async () => {
        const resp = await request.post('/user/login').send({ email: 'tom@mailinator.com', password: 'welcome@2' }).expect(401);
        assert.deepEqual(resp.body, { base: { messages: ['Invalid email or password'] } });
      });

    });


  });

  describe('PUT /user/:id', () => {

    context('failure', () => {

      let login;

      beforeEach(async () => {
        login = await request.post('/user/login').send({ email: 'tom@mailinator.com', password: 'welcome@1' }).expect(200);
      });

      it('fails if not authenticated', async () => {
        await request.put(`/user/${tom.id}`).send({ email: 'tom40@mailinator.com', password: 'welcome@2', age: 41 }).expect(401);
      });

      it('fails period', async () => {
        await request.put(`/user/${tom.id}`).set('Authorization', `Bearer ${login.body.token}`).send({ email: 'tom40@mailinator.com', password: 'welcome@2', age: 41 }).expect(405);
      });

    });

  });

  describe('PATCH /user/:id', () => {

    let login;

    beforeEach(async () => {
      login = await request.post('/user/login').send({ email: 'tom@mailinator.com', password: 'welcome@1' }).expect(200);
    });

    context('success', () => {

      let resp;

      beforeEach(async () => {
        resp = await request.patch(`/user/${tom.id}`).set('Authorization', `Bearer ${login.body.token}`).send({ password: 'welcome@3', age: 41 }).expect(200);
      });

      it('returns the id', async () => {
        assert.exists(resp.body.id);
      });

      it('updates only the supplied properties', async () => {
        assert.equal(resp.body.email, tom.email);
        assert.equal(resp.body.age, 41);
      });

      it('excludes the password', async () => {
        assert.notExists(resp.body.password);
      });

      it('returns the created and updated times', async () => {
        assert.exists(resp.body.createdAt);
        assert.exists(resp.body.updatedAt);
      });

      it('updates the updated time', async () => {
        assert.notEqual(resp.body.updatedAt, tom.updatedAt);
      });

      it('keeps the same created time', async () => {
        assert.equal(resp.body.createdAt, tom.createdAt);
      });

      it('logins with the new password', async () => {
        await request.post('/user/login').send({ email: 'tom@mailinator.com', password: 'welcome@3' }).expect(200);
      });

    });

    context('failure', () => {

      it('fails if not authenticated', async () => {
        await request.patch(`/user/${tom.id}`).send({ email: 'tom40@mailinator.com', password: 'welcome@2', age: 41 }).expect(401);
      });

      it('returns an error with the old password if changed', async () => {
        await request.patch(`/user/${tom.id}`).set('Authorization', `Bearer ${login.body.token}`).send({ password: 'welcome@3' }).expect(200);
        const resp = await request.post('/user/login').send({ email: 'tom@mailinator.com', password: 'welcome@1' }).expect(401);
        assert.deepEqual(resp.body.base.messages, ['Invalid email or password']);
      });

      it('returns an error if the email is invalid', async () => {
        const resp = await request.patch(`/user/${tom.id}`).set('Authorization', `Bearer ${login.body.token}`).send({ email: 'welcome@3' }).expect(400);
        assert.deepEqual(resp.body.email.messages, ['Email is invalid']);
      });

      it('returns an error if the email already exists', async () => {
        const resp = await request.patch(`/user/${tom.id}`).set('Authorization', `Bearer ${login.body.token}`).send({ email: 'tom@mailinator.com' });
        assert.equal(resp.statusCode, 400);
        assert.deepEqual(resp.body.email.messages, ['Email already exists']);
      });

    });

  });

  describe('GET /user', () => {

    let login;

    beforeEach(async () => {
      login = await request.post('/user/login').send({ email: 'tom@mailinator.com', password: 'welcome@1' }).expect(200);
    });

    context('success', () => {

      let resp;

      beforeEach(async () => {
        resp = await request.get('/user').set('Authorization', `Bearer ${login.body.token}`);
      });

      it('returns the correct status code', async () => {
        assert.equal(resp.statusCode, 200);
      });

      it('returns the user in an array', async () => {
        assert.exists(resp.body.length, 1);
        assert.equal(resp.body[0].email, 'tom@mailinator.com');
        assert.notExists(resp.body[0].password);
        assert.notExists(resp.body[0].confirmationCode);
        assert.notExists(resp.body[0].confirmed);
        assert.exists(resp.body[0].createdAt);
        assert.exists(resp.body[0].updatedAt);
        assert.exists(resp.body[0].id);
      });

    });

    context('failure', () => {

      it('rejects authentication attempts that are not in bearer form', async () => {
        await request.get('/user').set('Authorization', `Basic ${login.body.token}`).expect(401);
      });

    });

  });

  describe('GET /user/:id', () => {

    let login;

    beforeEach(async () => {
      login = await request.post('/user/login').send({ email: 'tom@mailinator.com', password: 'welcome@1' }).expect(200);
    });

    context('success', () => {

      let resp;

      beforeEach(async () => {
        resp = await request.get(`/user/${tom.id}`).set('Authorization', `Bearer ${login.body.token}`);
      });

      it('returns the correct status code', async () => {
        assert.equal(resp.statusCode, 200);
      });

      it('returns the user', async () => {
        assert.equal(resp.body.email, 'tom@mailinator.com');
        assert.notExists(resp.body.password);
        assert.notExists(resp.body.confirmationCode);
        assert.notExists(resp.body.confirmed);
        assert.exists(resp.body.createdAt);
        assert.exists(resp.body.updatedAt);
        assert.exists(resp.body.id);
      });

    });

    context('failure', () => {

      it('returns a not found if the user does not exist', async () => {
        const resp = await request.get('/user/4').set('Authorization', `Bearer ${login.body.token}`);
        assert.equal(resp.statusCode, 404);
      });

      it('returns an error if get user is not the person logged in', async () => {
        const resp = await request.get(`/user/${sam.id}`).set('Authorization', `Bearer ${login.body.token}`);
        assert.equal(resp.statusCode, 404);
      });

    });

  });

});
