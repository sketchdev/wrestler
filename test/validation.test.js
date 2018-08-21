require('./setup_test');
const supertest = require('supertest');
const express = require('express');
const wrestler = require('../wrestler');
const { assert } = require('chai');

describe('Handling validation', () => {

  describe('whitelisting', () => {

    context('success', () => {

      let request, resp;

      before(async () => {
        const app = express();
        app.use(express.json());
        app.use(express.urlencoded({ extended: false }));
        app.use(wrestler({ restrictResources: true }));
        request = supertest(app);
      });

      beforeEach(async () => {
        resp = await request.get('/widget');
      });

      it('returns the correct status code', async () => {
        assert.equal(resp.statusCode, 404);
      });

      it('returns the correct errors', async () => {
        assert.equal(resp.body.base.messages.length, 1);
        assert.equal(resp.body.base.messages[0], 'widget is an unknown resource');
      });

    });

  });

  describe('validation', () => {

    context('success', () => {

      let request, resp;

      before(async () => {
        const app = express();
        app.use(express.json());
        app.use(express.urlencoded({ extended: false }));
        app.use(wrestler({
          resources: {
            widget: {
              validation: {
                name: {
                  isLength: { options: { min: 2 }, errorMessage: 'must be at least two characters' },
                  isEmpty: { negated: true, errorMessage: 'required' },
                  optional: false,
                }
              }
            }
          }
        }));
        request = supertest(app);
      });

      beforeEach(async () => {
        resp = await request.post('/widget').send({ company: 'acme' })
      });

      it('returns the correct status code', async () => {
        assert.equal(resp.statusCode, 422);
      });

      it('returns the correct errors', async () => {
        assert.equal(resp.body.name.messages.length, 2);
        assert.equal(resp.body.name.messages[0], 'must be at least two characters');
        assert.equal(resp.body.name.messages[1], 'required');
      });

    });

  });

});
