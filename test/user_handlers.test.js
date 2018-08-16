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
  
  before(() => {
    app.wrestler = { db: testDb };
  });

  beforeEach(async () => {
    await testDb.dropCollections('user');
  });

  describe('POST', () => {

    it('creates a new user', async () => {
      const resp = await request.post('/user').send({ email: 'bob@mailinator.com', password: 'welcome@1' }).expect(201);
      assert.equal(resp.body.email, 'bob@mailinator.com');
      assert.notExists(resp.body.password);
      assert.exists(resp.body.createdAt);
      assert.exists(resp.body.updatedAt);
      assert.exists(resp.body.id);
    });

    it('returns an error if no email is supplied', async () => {
      await request.post('/user').send({ emale: 'bob@mailinator.com', password: 'welcome@1' }).expect(400);
    });

  });

});
