require('dotenv').config();
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

  beforeEach(async () => {
    await testDb.dropDatabase();
  });

  describe('POST', () => {

    it('creates a new user', async () => {
      const resp = await request.post('/user').send({ email: 'bob@mailinator.com', password: 'welcome@1' }).expect(201);
      assert.equal(resp.body.email, 'bob@mailinator.com');
      assert.notExists(resp.body.password);
      assert.exists(resp.body.createdAt);
      assert.exists(resp.body.updatedAt);
      assert.exists(resp.body.id);
      return Promise.resolve();
    });

    it('returns an error if no email is supplied', async () => {
      const resp = await request.post('/user').send({ emale: 'bob@mailinator.com', password: 'welcome@1' }).expect(400);
      assert.equal(resp.body.email, 'bob@mailinator.com');
      assert.exists(resp.body.createdAt);
      assert.exists(resp.body.updatedAt);
      assert.exists(resp.body.id);
      return Promise.resolve();
    });

  });

});
