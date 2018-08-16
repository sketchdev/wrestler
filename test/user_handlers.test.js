require('./setup');

const express = require('express');
const wrestler = require('../wrestler');
const { assert } = require('chai');

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(wrestler({ handleUsers: true }));

const request = require('supertest')(app);

describe('user_handlers', () => {

  let tom;

  before(() => {
    app.wrestler = { db: testDb };
  });

  beforeEach(async () => {
    await testDb.dropCollections('user');
    tom = (await request.post('/user').send({ email: 'tom@mailinator.com', password: 'welcome@1', age: 40 }).expect(201)).body;
  });

  describe('POST', () => {

    it('creates a new user', async () => {
      const resp = await request.post('/user').send({ email: 'bob@mailinator.com', password: 'welcome@1' }).expect(201);
      assert.exists(resp.headers.location);
      assert.equal(resp.body.email, 'bob@mailinator.com');
      assert.notExists(resp.body.password);
      assert.exists(resp.body.createdAt);
      assert.exists(resp.body.updatedAt);
      assert.exists(resp.body.id);
    });

    it('returns an error is the user email already exists', async () => {
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

  });

  describe('LOGIN', () => {

    it('authenticates a user', async () => {
      const resp = await request.post('/user/login').send({ email: 'tom@mailinator.com', password: 'welcome@1' }).expect(200);
      assert.exists(resp.body.token);
    });

    it('returns an error if credentials are incorrect', async () => {
      const resp = await request.post('/user/login').send({ email: 'tom@mailinator.com', password: 'welcome@2' }).expect(401);
      assert.deepEqual(resp.body, { base: { messages: [ 'Invalid email or password' ] } });
    });

  });

  describe('PUT', () => {

    let login;

    beforeEach(async () => {
      login = await request.post('/user/login').send({ email: 'tom@mailinator.com', password: 'welcome@1' }).expect(200);
    });

    it('fails if not authenticated', async () => {
      await request.put(`/user/${tom.id}`).send({ email: 'tom40@mailinator.com', password: 'welcome@2', age: 41 }).expect(401);
    });

    it('replaces user details', async () => {
      const resp = await request.put(`/user/${tom.id}`).set('Authorization', `Bearer ${login.body.token}`).send({ email: 'tom40@mailinator.com', password: 'welcome@2', age: 41 }).expect(200);
      assert.equal(resp.body.email, 'tom40@mailinator.com');
      assert.notExists(resp.body.password);
      assert.equal(resp.body.age, 41);
      assert.exists(resp.body.createdAt);
      assert.exists(resp.body.updatedAt);
      assert.exists(resp.body.id);
    });

    it('returns an error is the user email already exists', async () => {
      const resp = await request.put(`/user/${tom.id}`).set('Authorization', `Bearer ${login.body.token}`).send({ email: 'tom@mailinator.com', password: 'welcome@1' }).expect(400);
      assert.deepEqual(resp.body, { email: { messages: ['Email already exists'] } });
    });

    it('returns an error if no email is supplied', async () => {
      const resp = await request.put(`/user/${tom.id}`).set('Authorization', `Bearer ${login.body.token}`).send({ emale: 'bob@mailinator.com', password: 'welcome@1' }).expect(400);
      assert.deepEqual(resp.body, { email: { messages: ['Email is required'] } });
    });

    it('returns an error if no password is supplied', async () => {
      const resp = await request.put(`/user/${tom.id}`).set('Authorization', `Bearer ${login.body.token}`).send({ email: 'bob@mailinator.com', passsword: 'welcome@1' }).expect(400);
      assert.deepEqual(resp.body, { password: { messages: ['Password is required'] } });
    });

  });

  describe('PATCH', () => {

    let login;

    beforeEach(async () => {
      login = await request.post('/user/login').send({ email: 'tom@mailinator.com', password: 'welcome@1' }).expect(200);
    });

    it('fails if not authenticated', async () => {
      await request.patch(`/user/${tom.id}`).send({ email: 'tom40@mailinator.com', password: 'welcome@2', age: 41 }).expect(401);
    });

    it('updates user details', async () => {
      const resp = await request.patch(`/user/${tom.id}`).set('Authorization', `Bearer ${login.body.token}`).send({ age: 41 }).expect(200);
      assert.equal(resp.body.email, tom.email);
      assert.notExists(resp.body.password);
      assert.equal(resp.body.age, 41);
      assert.exists(resp.body.createdAt);
      assert.exists(resp.body.updatedAt);
      assert.exists(resp.body.id);
    });

  });

});
