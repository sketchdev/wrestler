require('./setup');

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

  describe('GET', () => {

    let coconut, apple, banana, egg, fig;

    beforeEach(async () => {
      await testDb.dropCollections('widget');
      coconut = (await request.post('/widget').send({ name: 'coconut', company: 'acme' }).expect(201)).body;
      apple = (await request.post('/widget').send({ name: 'apple', company: 'momo' }).expect(201)).body;
      banana = (await request.post('/widget').send({ name: 'banana', company: 'momo' }).expect(201)).body;
      egg = (await request.post('/widget').send({ name: 'egg', company: 'coco' }).expect(201)).body;
      fig = (await request.post('/widget').send({ name: 'fig', company: 'nono' }).expect(201)).body;
    });

    describe('/widget', () => {

      context('success', () => {

        let resp;

        beforeEach(async () => {
          resp = await request.get('/widget');
        });

        it('returns the correct status code', async () => {
          assert.equal(resp.statusCode, 200);
        });

        it('returns the array of entities', async () => {
          assert.deepEqual(resp.body.find(e => e.name === 'coconut'), coconut);
          assert.deepEqual(resp.body.find(e => e.name === 'apple'), apple);
          assert.deepEqual(resp.body.find(e => e.name === 'banana'), banana);
          assert.deepEqual(resp.body.find(e => e.name === 'egg'), egg);
          assert.deepEqual(resp.body.find(e => e.name === 'fig'), fig);
        });

      });

    });

    describe('/widget?limit=2', () => {

      context('success', () => {

        let resp;

        beforeEach(async () => {
          resp = await request.get('/widget?limit=2');
        });

        it('returns the correct status code', async () => {
          assert.equal(resp.statusCode, 200);
        });

        it('returns the array of entities', async () => {
          assert.equal(resp.body.length, 2);
          assert.deepEqual(resp.body.find(e => e.name === 'coconut'), coconut);
          assert.deepEqual(resp.body.find(e => e.name === 'apple'), apple);
        });

        it('returns links headers', async () => {
          assert.notExists(resp.links.prev);
          assert.match(resp.links.next, /widget\?limit=2&skip=2/);
        });

      });

    });

    describe('/widget?limit=2&skip=2', () => {

      context('success', () => {

        let resp;

        beforeEach(async () => {
          resp = await request.get('/widget?limit=2&skip=2');
        });

        it('returns the correct status code', async () => {
          assert.equal(resp.statusCode, 200);
        });

        it('returns the array of entities', async () => {
          assert.equal(resp.body.length, 2);
          assert.deepEqual(resp.body.find(e => e.name === 'banana'), banana);
        });

        it('returns links headers', async () => {
          assert.match(resp.links.next, /widget\?limit=2&skip=4/);
          assert.match(resp.links.prev, /widget\?limit=2&skip=0/);
        });

      });

    });

    describe('/widget?limit=2&skip=4', () => {

      context('success', () => {

        let resp;

        beforeEach(async () => {
          resp = await request.get('/widget?limit=2&skip=4');
        });

        it('returns the correct status code', async () => {
          assert.equal(resp.statusCode, 200);
        });

        it('returns the array of entities', async () => {
          assert.equal(resp.body.length, 1);
          assert.deepEqual(resp.body.find(e => e.name === 'fig'), fig);
        });

        it('returns links headers', async () => {
          assert.notExists(resp.links.next);
          assert.match(resp.links.prev, /widget\?limit=2&skip=2/);
        });

      });

    });

    describe('/widget?sort=-name', () => {

      context('success', () => {

        let resp;

        beforeEach(async () => {
          resp = await request.get('/widget?sort=-name');
        });

        it('returns the correct status code', async () => {
          assert.equal(resp.statusCode, 200);
        });

        it('returns the array of entities', async () => {
          assert.equal(resp.body.length, 5);
          assert.deepEqual(resp.body[0], fig);
        });

      });

    });

    describe('/widget?sort=name', () => {

      context('success', () => {

        let resp;

        beforeEach(async () => {
          resp = await request.get('/widget?sort=name');
        });

        it('returns the correct status code', async () => {
          assert.equal(resp.statusCode, 200);
        });

        it('returns the array of entities', async () => {
          assert.equal(resp.body.length, 5);
          assert.deepEqual(resp.body[0], apple);
        });

      });

    });

    describe('/widget?sort=-company,name', () => {

      context('success', () => {

        let resp;

        beforeEach(async () => {
          resp = await request.get('/widget?sort=-company,name');
        });

        it('returns the correct status code', async () => {
          assert.equal(resp.statusCode, 200);
        });

        it('returns the array of entities', async () => {
          assert.equal(resp.body.length, 5);
          assert.deepEqual(resp.body[0], fig);
          assert.deepEqual(resp.body[1], apple);
        });

      });

    });

    describe('/widget?company=momo', () => {

      context('success', () => {

        let resp;

        beforeEach(async () => {
          resp = await request.get('/widget?company=momo');
        });

        it('returns the correct status code', async () => {
          assert.equal(resp.statusCode, 200);
        });

        it('returns the array of entities', async () => {
          assert.equal(resp.body.length, 2);
          assert.deepEqual(resp.body[0], apple);
          assert.deepEqual(resp.body[1], banana);
        });

      });

    });

    describe('/widget?company=momo&name=banana', () => {

      context('success', () => {

        let resp;

        beforeEach(async () => {
          resp = await request.get('/widget?company=momo&name=banana');
        });

        it('returns the correct status code', async () => {
          assert.equal(resp.statusCode, 200);
        });

        it('returns the array of entities', async () => {
          assert.equal(resp.body.length, 1);
          assert.deepEqual(resp.body[0], banana);
        });

      });

    });

    describe('/widget?fields=name', () => {

      context('success', () => {

        let resp;

        beforeEach(async () => {
          resp = await request.get('/widget?fields=name');
        });

        it('returns the correct status code', async () => {
          assert.equal(resp.statusCode, 200);
        });

        it('returns the array of entities', async () => {
          assert.equal(resp.body.length, 5);
          assert.lengthOf(Object.keys(resp.body[0]), 2);
          assert.equal(resp.body[0].name, coconut.name);
          assert.exists(resp.body[0].id);
        });

      });

    });

  });

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

  describe('PUT /widget', () => {

    context('failure', () => {

      it('returns an error code if missing the id', async () => {
        await request.put('/widget').send({ name: 'coconuts' }).expect(400);
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

  describe('PATCH /widget', () => {

    context('failure', () => {

      it('returns an error code if missing the id', async () => {
        await request.patch('/widget').send({ name: 'coconuts' }).expect(400);
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
