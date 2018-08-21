require('./setup_test');

const supertest = require('supertest');
const express = require('express');
const wrestler = require('../wrestler');
const { assert } = require('chai');

describe('Handling restful reuests', () => {

  let app, request;

  before(() => {
    app = express();
    app.use(express.json());
    app.use(express.urlencoded({ extended: false }));
    app.use(wrestler());
    app.wrestler = { db: testDb };
    request = supertest(app);
  });

  describe('POST /widget', () => {

    context('success', () => {

      let resp;

      beforeEach(async () => {
        resp = await request.post('/widget').send({ name: 'coconut', company: 'acme' });
      });

      it('returns the correct status code', async () => {
        assert(resp.statusCode, 201);
      });

      it('returns an id', async () => {
        assert.exists(resp.body.id);
      });

      it('returns created and updated times', async () => {
        assert.exists(resp.body.createdAt);
        assert.exists(resp.body.updatedAt);
      });

      it('returns other properties', async () => {
        assert.equal(resp.body.name, 'coconut');
        assert.equal(resp.body.company, 'acme');
      });

      it('returns a location header', async () => {
        assert.equal(resp.get('Location'), `/widget/${resp.body.id}`);
      });

    });

  });

  describe('POST /user/login (no user support)', () => {

    context('success', () => {

      let resp;

      beforeEach(async () => {
        resp = await request.post('/user/login').send({ name: 'coconut', company: 'acme' });
      });

      it('returns a bad request', async () => {
        assert.equal(resp.statusCode, 400);
      });

    });

  });

  describe('GET /widget/:id', () => {

    context('success', () => {

      let resp, widget;

      beforeEach(async () => {
        await testDb.dropCollections('widget');
        widget = (await request.post('/widget').send({ name: 'coconut', company: 'acme' }).expect(201)).body;
        resp = await request.get(`/widget/${widget.id}`);
      });

      it('returns the correct status code', async () => {
        assert.equal(resp.statusCode, 200);
      });

      it('returns the entity', async () => {
        assert.deepEqual(resp.body, widget);
      });

    });

  });

  describe('GET /widget', () => {

    context('success', () => {

      let resp, coconut, apple, banana;

      beforeEach(async () => {
        await testDb.dropCollections('widget');
        coconut = (await request.post('/widget').send({ name: 'coconut', company: 'acme' }).expect(201)).body;
        apple = (await request.post('/widget').send({ name: 'apple', company: 'acme' }).expect(201)).body;
        banana = (await request.post('/widget').send({ name: 'banana', company: 'acme' }).expect(201)).body;
        resp = await request.get('/widget');
      });

      it('returns the correct status code', async () => {
        assert.equal(resp.statusCode, 200);
      });

      it('returns the array of entities', async () => {
        assert.deepEqual(resp.body.find(e => e.name === 'coconut'), coconut);
        assert.deepEqual(resp.body.find(e => e.name === 'apple'), apple);
        assert.deepEqual(resp.body.find(e => e.name === 'banana'), banana);
      });

    });

  });

  it('GET /widget?sort=-name');
  it('GET /widget?sort=name,-company');
  it('GET /widget?name=coconut');
  it('GET /widget?limit=2');
  it('GET /widget?limit=2&skip=2');
  it('GET /widget?fields=name');

  describe('PUT /widget/:id', () => {

    context('success', () => {

      let resp, coconut;

      beforeEach(async () => {
        await testDb.dropCollections('widget');
        coconut = (await request.post('/widget').send({ name: 'coconut', company: 'acme' }).expect(201)).body;
        resp = await request.put(`/widget/${coconut.id}`).send({ name: 'coconuts', company: 'acme, llc.' });
      });

      it('returns the correct status code', async () => {
        assert.equal(resp.statusCode, 200);
      });

      it('replaces the properties', async () => {
        assert.equal(resp.body.name, 'coconuts');
        assert.equal(resp.body.company, 'acme, llc.');
      });

      it('keeps the id', async () => {
        assert.equal(resp.body.id, coconut.id);
      });

      it('changes the created time', async () => {
        assert.notEqual(resp.body.createdAt, coconut.createdAt);
      });

      it('changes the updated time', async () => {
        assert.notEqual(resp.body.updatedAt, coconut.updatedAt);
      });

    });

  });

  describe('PATCH /widget/:id', () => {

    context('success', () => {

      let resp, coconut;

      beforeEach(async () => {
        await testDb.dropCollections('widget');
        coconut = (await request.post('/widget').send({ name: 'coconut', company: 'acme' }).expect(201)).body;
        resp = await request.patch(`/widget/${coconut.id}`).send({ name: 'coconuts' });
      });

      it('returns the correct status code', async () => {
        assert.equal(resp.statusCode, 200);
      });

      it('updates specific properties', async () => {
        assert.equal(resp.body.name, 'coconuts');
        assert.equal(resp.body.company, coconut.company);
      });

      it('keeps the id', async () => {
        assert.equal(resp.body.id, coconut.id);
      });

      it('keeps the created time', async () => {
        assert.equal(resp.body.createdAt, coconut.createdAt);
      });

      it('changes the updated time', async () => {
        assert.notEqual(resp.body.updatedAt, coconut.updatedAt);
      });

    });

  });

  describe('DELETE /widget/:id', () => {

    context('success', () => {

      let resp, coconut;

      beforeEach(async () => {
        await testDb.dropCollections('widget');
        coconut = (await request.post('/widget').send({ name: 'coconut', company: 'acme' }).expect(201)).body;
        await request.get(`/widget/${coconut.id}`).expect(200);
        resp = await request.delete(`/widget/${coconut.id}`);
      });

      it('removes the entity', async () => {
        await request.get(`/widget/${coconut.id}`).expect(404);
      });

    });

  });

});
