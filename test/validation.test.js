require('./setup_test');
const request = require('supertest');
const express = require('express');
const wrestler = require('../wrestler');

describe('validation', () => {
  describe('whitelisting', () => {
    it('can restrict to defined resources', (done) => {
      request(buildApp({restrictResources: true})).get('/widget')
        .expect(404, {
          base: {messages: ["widget is an unknown resource"]},
        }, done);
    });
  });

  describe('validation errors', () => {
    it('supports validation and errors at the field level', (done) => {
      const app = buildApp({
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
      });

      request(app).post('/widget').send({howdy: 'partner'})
        .expect(422, {
          name: {messages: ['must be at least two characters', 'required']}
        }, done);
    });
  });
});

function buildApp(config) {
  const app = express();
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));
  app.use(wrestler({...config, handleUsers: false}));
  return app;
}
