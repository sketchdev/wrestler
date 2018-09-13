const { WrestlerTesterBuilder } = require('../setup');
const { assert } = require('chai');

describe('finding widgets', () => {

  let tester;

  beforeEach(async () => {
    tester = await new WrestlerTesterBuilder().build();
    await tester.dropWidgets();
    await tester.dropUsers();
  });

  context('with users disabled', () => {

    let coconut, apple, banana, egg, fig;

    beforeEach(async () => {
      coconut = await tester.createWidget({ name: 'coconut', company: 'acme' });
      apple = await tester.createWidget({ name: 'apple', company: 'momo' });
      banana = await tester.createWidget({ name: 'banana', company: 'momo' });
      egg = await tester.createWidget({ name: 'egg', company: 'coco' });
      fig = await tester.createWidget({ name: 'fig', company: 'nono' });
    });

    describe('finding all', () => {

      let resp;

      beforeEach(async () => {
        resp = await tester.get('/widget');
      });

      it('returns the correct status code', async () => {
        assert.equal(resp.status, 200);
      });

      it('returns the array of entities', async () => {
        assert.deepEqual(resp.body.find(e => e.name === 'coconut'), coconut);
        assert.deepEqual(resp.body.find(e => e.name === 'apple'), apple);
        assert.deepEqual(resp.body.find(e => e.name === 'banana'), banana);
        assert.deepEqual(resp.body.find(e => e.name === 'egg'), egg);
        assert.deepEqual(resp.body.find(e => e.name === 'fig'), fig);
      });

    });

    describe('finding the first page of results', () => {

      let resp;

      beforeEach(async () => {
        resp = await tester.get('/widget?limit=2');
      });

      it('returns the correct status code', async () => {
        assert.equal(resp.status, 200);
      });

      it('returns only the number of items requested', async () => {
        assert.equal(resp.body.length, 2);
      });

      it('returns the array of entities', async () => {
        assert.deepEqual(resp.body.find(e => e.name === 'coconut'), coconut);
        assert.deepEqual(resp.body.find(e => e.name === 'apple'), apple);
      });

      it('returns links headers', async () => {
        assert.notExists(resp.links.prev);
        assert.match(resp.links.next, /widget\?limit=2&skip=2/);
      });

    });

    describe('finding a middle page of results', () => {

      let resp;

      beforeEach(async () => {
        resp = await tester.get('/widget?limit=2&skip=2');
      });

      it('returns the correct status code', async () => {
        assert.equal(resp.status, 200);
      });

      it('returns only the number of items requested', async () => {
        assert.equal(resp.body.length, 2);
      });

      it('returns the array of entities', async () => {
        assert.deepEqual(resp.body.find(e => e.name === 'banana'), banana);
        assert.deepEqual(resp.body.find(e => e.name === 'egg'), egg);
      });

      it('returns links headers', async () => {
        assert.match(resp.links.next, /widget\?limit=2&skip=4/);
        assert.match(resp.links.prev, /widget\?limit=2&skip=0/);
      });

    });

    describe('finding the last page of results', () => {

      let resp;

      beforeEach(async () => {
        resp = await tester.get('/widget?limit=2&skip=4');
      });

      it('returns the correct status code', async () => {
        assert.equal(resp.status, 200);
      });

      it('returns only the number of items requested', async () => {
        assert.equal(resp.body.length, 1);
      });

      it('returns the array of entities', async () => {
        assert.deepEqual(resp.body.find(e => e.name === 'fig'), fig);
      });

      it('returns links headers', async () => {
        assert.notExists(resp.links.next);
        assert.match(resp.links.prev, /widget\?limit=2&skip=2/);
      });

    });

    describe('finding with a descending sort', () => {

      let resp;

      beforeEach(async () => {
        resp = await tester.get('/widget?sort=-name');
      });

      it('returns the correct status code', async () => {
        assert.equal(resp.status, 200);
      });

      it('returns the array of entities', async () => {
        assert.deepEqual(resp.body[0], fig);
        assert.deepEqual(resp.body[1], egg);
        assert.deepEqual(resp.body[2], coconut);
        assert.deepEqual(resp.body[3], banana);
        assert.deepEqual(resp.body[4], apple);
      });

    });

    describe('finding with an ascending sort', () => {

      let resp;

      beforeEach(async () => {
        resp = await tester.get('/widget?sort=name');
      });

      it('returns the correct status code', async () => {
        assert.equal(resp.status, 200);
      });

      it('returns the array of entities', async () => {
        assert.deepEqual(resp.body[0], apple);
        assert.deepEqual(resp.body[1], banana);
        assert.deepEqual(resp.body[2], coconut);
        assert.deepEqual(resp.body[3], egg);
        assert.deepEqual(resp.body[4], fig);
      });

    });

    describe('finding with a dual sort', () => {

      let resp;

      beforeEach(async () => {
        resp = await tester.get('/widget?sort=-company,name');
      });

      it('returns the correct status code', async () => {
        assert.equal(resp.status, 200);
      });

      it('returns the array of entities', async () => {
        assert.deepEqual(resp.body[0], fig);
        assert.deepEqual(resp.body[1], apple);
        assert.deepEqual(resp.body[2], banana);
        assert.deepEqual(resp.body[3], egg);
        assert.deepEqual(resp.body[4], coconut);
      });

    });

    describe('finding with a filter', () => {

      let resp;

      beforeEach(async () => {
        resp = await tester.get('/widget?company=momo');
      });

      it('returns the correct status code', async () => {
        assert.equal(resp.status, 200);
      });

      it('returns the array of entities', async () => {
        assert.equal(resp.body.length, 2);
        assert.deepEqual(resp.body[0], apple);
        assert.deepEqual(resp.body[1], banana);
      });

    });

    describe('finding with multiple filters', () => {

      let resp;

      beforeEach(async () => {
        resp = await tester.get('/widget?company=momo&name=banana');
      });

      it('returns the correct status code', async () => {
        assert.equal(resp.status, 200);
      });

      it('returns the array of entities', async () => {
        assert.equal(resp.body.length, 1);
        assert.deepEqual(resp.body[0], banana);
      });

    });

    describe('finding with a projection and limit', () => {

      let resp;

      beforeEach(async () => {
        resp = await tester.get('/widget?fields=name&limit=1');
      });

      it('returns the correct status code', async () => {
        assert.equal(resp.status, 200);
      });

      it('returns the array of entities', async () => {
        assert.lengthOf(Object.keys(resp.body[0]), 2);
        assert.equal(resp.body[0].name, coconut.name);
        assert.exists(resp.body[0].id);
      });

    });

    describe('sending a bad requests', () => {

    });

  });

});
