const { WrestlerTesterBuilder } = require('../setup');
const { assert } = require('chai');

describe('replacing widgets', () => {

  let tester;

  beforeEach(async () => {
    tester = await new WrestlerTesterBuilder().build();
    await tester.dropWidgets();
    await tester.dropUsers();
  });

  context('with users disabled', () => {

    describe('sending a good request', () => {

      let resp, widget;

      beforeEach(async () => {
        widget = await tester.createWidget({ name: 'coconut', company: 'acme', color: 'brown' });
        resp = await tester.put(`/widget/${widget.id}`, { name: 'coconuts', company: 'acme, llc.' });
      });

      it('returns the correct status code', async () => {
        assert.equal(resp.status, 200);
      });

      it('replaces the properties', async () => {
        assert.equal(resp.body.name, 'coconuts');
        assert.equal(resp.body.company, 'acme, llc.');
      });

      it('removes properties if not provided', async () => {
        assert.notExists(resp.body.color);
      });

      it('keeps the id', async () => {
        assert.equal(resp.body.id, widget.id);
      });

      it('changes the created time', async () => {
        assert.notEqual(resp.body.createdAt, widget.createdAt);
      });

      it('changes the updated time', async () => {
        assert.notEqual(resp.body.updatedAt, widget.updatedAt);
      });

    });

    describe('sending a bad requests', () => {

      it('returns an error if the id is missing', async () => {
        const resp = await tester.put('/widget', { name: 'coconuts' });
        assert.equal(resp.status, 400);
      });

    });

  });

});
