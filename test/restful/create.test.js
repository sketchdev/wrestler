const { WrestlerTesterBuilder } = require('../setup');
const { assert } = require('chai');

describe('creating widgets', () => {

  let tester;

  before(() => {
    tester = new WrestlerTesterBuilder().build();
  });

  context('with users disabled', () => {

    beforeEach(async () => {
      await tester.dropWidgets();
    });

    describe('sending a good request', () => {

      let resp;

      beforeEach(async () => {
        resp = await tester.post('/widget', { name: 'coconut', company: 'acme' });
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
        assert.equal(resp.headers.location, `/widget/${resp.body.id}`);
      });

    });

    describe('sending a bad requests', () => {

      it('returns a bad request when trying to post with a value after the resource', async () => {
        const resp = await tester.post('/user/login', { name: 'coconut', company: 'acme' });
        assert.equal(resp.statusCode, 400);
      });

    });

  });

});