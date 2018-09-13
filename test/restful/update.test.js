const { WrestlerTesterBuilder } = require('../setup');
const { assert } = require('chai');

describe('updating widgets', () => {

  context('with users disabled', () => {

    let tester;

    beforeEach(async () => {
      tester = await new WrestlerTesterBuilder().build();
      await tester.dropWidgets();
      await tester.dropUsers();
    });

    describe('sending a good request', () => {

      let resp, widget;

      beforeEach(async () => {
        widget = await tester.createWidget({ name: 'coconut', company: 'acme', color: 'brown' });
        resp = await tester.patch(`/widget/${widget.id}`, { name: 'coconuts' });
      });

      it('returns the correct status code', async () => {
        assert.equal(resp.status, 200);
      });

      it('updates specific properties', async () => {
        assert.equal(resp.body.name, 'coconuts');
        assert.equal(resp.body.company, widget.company);
      });

      it('keeps the id', async () => {
        assert.equal(resp.body.id, widget.id);
      });

      it('keeps the created time', async () => {
        assert.equal(resp.body.createdAt, widget.createdAt);
      });

      it('changes the updated time', async () => {
        assert.notEqual(resp.body.updatedAt, widget.updatedAt);
      });

    });

    describe('sending a bad requests', () => {

      it('returns an error if the id is missing', async () => {
        const resp = await tester.patch('/widget', { name: 'coconuts' });
        assert.equal(resp.status, 400);
      });

    });

  });

  context('with users enabled', () => {

    let tester, bob, sam;

    beforeEach(async () => {
      tester = await new WrestlerTesterBuilder().enableUsers().build();
      await tester.dropWidgets();
      await tester.dropUsers();
      bob = await tester.createAndLoginUser('bob@mailinator.com', 'welcome@1');
      sam = await tester.createAndLoginUser('sam@mailinator.com', 'welcome@1');
    });

    describe('setting the updatedBy property', () => {

      let resp, widget;

      beforeEach(async () => {
        widget = await tester.createWidget({ name: 'coconut', company: 'acme', color: 'brown' }, bob.token);
        resp = await tester.patch(`/widget/${widget.id}`, { name: 'coconuts' }, bob.token);
      });

      it('returns the correct status code', async () => {
        assert.equal(resp.status, 200);
      });

      it('sets the updatedBy property', async () => {
        assert.equal(resp.body.updatedBy, bob.user.id);
      });

    });

    describe('changing the updatedBy property', () => {

      let resp, widget;

      beforeEach(async () => {
        widget = await tester.createWidget({ name: 'coconut', company: 'acme', color: 'brown' }, bob.token);
        resp = await tester.patch(`/widget/${widget.id}`, { name: 'coconuts' }, sam.token);
      });

      it('returns the correct status code', async () => {
        assert.equal(resp.status, 200);
      });

      it('sets the createdBy property', async () => {
        assert.equal(resp.body.createdBy, bob.user.id);
      });

      it('sets the updatedBy property', async () => {
        assert.equal(resp.body.updatedBy, sam.user.id);
      });

    });

  });

});
