require('dotenv').config();
require('./setup');
const request = require('supertest');
const express = require('express');
const wristrest = require('../wristrest');
const { expect } = require('chai');

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(wristrest({handleUsers: false}));

describe('rest_handlers', () => {
  beforeEach(async () => {
    await testDb.dropDatabase();
  });
  
  describe('POST', () => {
    it('creates a new widget', (done) => {
      request(app).post('/widget').send({name: 'Jobin', company: 'acme'})
        .expect(201)
        .end((err, res) => {
          const {id, createdAt, updatedAt, ...props} = res.body;
          expect(id).to.exist;
          expect(createdAt).to.exist;
          expect(updatedAt).to.exist;
          expect(props).to.deep.equal({name: 'Jobin', company: 'acme'});
          expect(res.get('Location')).to.equal(`/widget/${id}`);
          done();
        });
    });
  });
  
  describe('GET', () => {
    let id;
    beforeEach(async () => {
      await request(app).post('/widget').send({name: 'Jobin', company: 'acme'}).expect(201).then(res => id = res.body.id);
    });
    
    it('gets one widget', (done) => {
      request(app).get(`/widget/${id}`).expect(200, done);
    });
    
    it('gets widgets', (done) => {
      request(app).get('/widget').expect(200, done);
    });
  });
});