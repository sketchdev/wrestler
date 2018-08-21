require('./setup');

const supertest = require('supertest');
const express = require('express');
const nodemailer = require('nodemailer');
const uuid = require('uuid/v4');
const wrestler = require('../wrestler');
const { assert } = require('chai');

describe('Handling authorization', () => {

  describe('using a function for authorization', () => {

    let app, request, transport, transporter;

    before(async () => {
      app = express();
      app.use(express.json());
      app.use(express.urlencoded({ extended: false }));
      app.use(wrestler({
        users: {
          authorization: (req, res, next) => {
            if (req.resource === 'widget') {
              if (req.wrestler.user && req.wrestler.user.email === 'tom@mailinator.com') return next();
              return res.sendStatus(403);
            }
            next();
          }
        }
      }));
      request = supertest(app);
      transport = { name: 'wrestler', version: '1', send: (mail, callback) => callback(null, { envelope: {}, messageId: uuid() }) };
      transporter = nodemailer.createTransport(transport);
      app.wrestler = { db: testDb, email: { transporter } };
    });

    beforeEach(async () => {
      await testDb.dropCollections('user');
    });

    context('success', () => {

      it('passes the authorization function', async () => {
        (await request.post('/user').send({ email: 'tom@mailinator.com', password: 'welcome@1' }).expect(201));
        const login = await request.post('/user/login').send({ email: 'tom@mailinator.com', password: 'welcome@1' }).expect(200);
        (await request.post('/widget').set('Authorization', `Bearer ${login.body.token}`).send({ name: 'gear', company: 'acme' }).expect(201));
      });

    });

    context('failure', () => {

      it('fails the authorization function', async () => {
        (await request.post('/user').send({ email: 'tom2@mailinator.com', password: 'welcome@1' }).expect(201));
        const login = await request.post('/user/login').send({ email: 'tom2@mailinator.com', password: 'welcome@1' }).expect(200);
        (await request.post('/widget').set('Authorization', `Bearer ${login.body.token}`).send({ name: 'gear', company: 'acme' }).expect(403));
      });

    });

  });

  describe('using the simple string for authorization', () => {

    let app, request, transport, transporter, tom, tomToken, jerry, jerryToken;

    before(async () => {
      app = express();
      app.use(express.json());
      app.use(express.urlencoded({ extended: false }));
      app.use(wrestler({ users: { authorization: 'simple' } }));
      request = supertest(app);
      transport = { name: 'wrestler', version: '1', send: (mail, callback) => callback(null, { envelope: {}, messageId: uuid() }) };
      transporter = nodemailer.createTransport(transport);
      app.wrestler = { db: testDb, email: { transporter } };
    });

    beforeEach(async () => {
      await testDb.dropCollections('user', 'widget');
      tom = (await request.post('/user').send({ email: 'tom@mailinator.com', password: 'welcome@1', age: 40 }).expect(201)).body;
      jerry = (await request.post('/user').send({ email: 'jerry@mailinator.com', password: 'welcome@1', age: 41 }).expect(201)).body;
      tomToken = (await request.post('/user/login').send({ email: 'tom@mailinator.com', password: 'welcome@1' }).expect(200)).body.token;
      jerryToken = (await request.post('/user/login').send({ email: 'jerry@mailinator.com', password: 'welcome@1' }).expect(200)).body.token;
      await request.post('/widget').set('Authorization', `Bearer ${tomToken}`).send({ name: 'tom\'s widget' }).expect(201);
      await request.post('/widget').set('Authorization', `Bearer ${jerryToken}`).send({ name: 'jerry\'s widget' }).expect(201);
    });

    context('success', () => {

      it('automatically filters data to the authenticated user', async () => {
        const tomWidgets = (await request.get('/widget').set('Authorization', `Bearer ${tomToken}`).expect(200)).body;
        assert.equal(tomWidgets.length, 1);
        assert.equal(tomWidgets[0].name, 'tom\'s widget');

        const jerryWidgets = (await request.get('/widget').set('Authorization', `Bearer ${jerryToken}`).expect(200)).body;
        assert.equal(jerryWidgets.length, 1);
        assert.equal(jerryWidgets[0].name, 'jerry\'s widget');
      });

    });

  });

});
