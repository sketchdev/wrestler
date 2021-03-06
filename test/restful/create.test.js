const { WrestlerTesterBuilder } = require('../setup');
const { assert } = require('chai');

describe('creating widgets', () => {

  context('with users disabled', () => {

    let tester;

    beforeEach(async () => {
      tester = await new WrestlerTesterBuilder().build();
      await tester.dropWidgets();
      await tester.dropUsers();
    });

    describe('sending a good request', () => {

      let resp;

      beforeEach(async () => {
        resp = await tester.post('/widget', { name: 'coconut', company: 'acme' });
      });

      it('returns the correct status code', async () => {
        assert.equal(resp.status, 201);
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
        assert.equal(resp.status, 400);
      });

    });

  });

  context('with users enabled', () => {

    let tester, bob;

    beforeEach(async () => {
      tester = await new WrestlerTesterBuilder().enableUsers().build();
      await tester.dropWidgets();
      await tester.dropUsers();
      bob = await tester.createAndLoginUser('bob@mailinator.com', 'welcome@1');
    });

    describe('sending a good request', () => {

      let resp;

      beforeEach(async () => {
        resp = await tester.post('/widget', { name: 'coconut', company: 'acme' }, bob.token);
      });

      it('returns the correct status code', async () => {
        assert.equal(resp.status, 201);
      });

      it('returns an id', async () => {
        assert.exists(resp.body.id);
      });

      it('returns createdBy', async () => {
        assert.equal(resp.body.createdBy, bob.user.id);
      });

    });

  });

});
