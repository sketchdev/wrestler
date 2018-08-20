require('./setup_test');

const request = require('supertest');
const express = require('express');
const wrestler = require('../wrestler');
const { expect, assert } = require('chai');

describe('rest_handlers', () => {
  let widget1;
  let widget2;
  let app;

  before(() => {
    app = express();
    app.use(express.json());
    app.use(express.urlencoded({ extended: false }));
    app.use(wrestler({ users: false }));
    app.wrestler = { db: testDb };
  });

  beforeEach(async () => {
    await testDb.dropCollections('widget');
    widget1 = (await request(app).post('/widget').send({ name: 'Jobin', company: 'acme' }).expect(201)).body;
    widget2 = (await request(app).post('/widget').send({ name: 'Wristnub', company: 'huge corp.' }).expect(201)).body;
  });

  describe('POST', () => {

    it('creates a new widget', async () => {
      const res = await request(app).post('/widget')
        .send({ name: 'Jobin', company: 'acme' })
        .expect(201);

      const { id, createdAt, updatedAt, ...props } = res.body;
      assert.exists(id);
      assert.exists(createdAt);
      assert.exists(updatedAt);
      expect(props).to.deep.equal({ name: 'Jobin', company: 'acme' });
      expect(res.get('Location')).to.equal(`/widget/${id}`);
    });

    it('returns a bad request if anything exists after the resource on the path', async () => {
      await request(app).post('/user/login').send({ name: 'Jobin', company: 'acme' }).expect(400);
    });

  });

  describe('GET', () => {
    it('gets one widget', async () => {
      await request(app).get(`/widget/${widget1.id}`).expect(200, widget1);
    });

    it('gets widgets', async () => {
      await request(app).get('/widget?sort=name').expect(200, [widget1, widget2]);
    });

    //TODO: test paging, sorting, and projections
  });

  describe('PUT', () => {
    it('updates an existing widget', async () => {
      const res = await request(app).put(`/widget/${widget1.id}`)
        .send({ name: 'Joooobin', company: 'acme, llc.' })
        .expect(200);

      expect(res.body.company).to.equal('acme, llc.');
      expect(res.body.name).to.equal('Joooobin');
      expect(res.body.id).to.equal(widget1.id);
    });
  });

  describe('PATCH', () => {
    it('patches an existing widget', async () => {
      const res = await request(app).patch(`/widget/${widget1.id}`)
        .send({ company: 'acme, llc.' })
        .expect(200);

      expect(res.body.company).to.equal('acme, llc.');
      expect(res.body.name).to.equal('Jobin');
      expect(res.body.id).to.equal(widget1.id);
    });
  });

  describe('DELETE', () => {
    it('can delete an existing widget', async () => {
      await request(app).delete(`/widget/${widget1.id}`).expect(204);
      await request(app).get(`/widget/${widget1.id}`).expect(404);
    });
  });

});
