const { WrestlerTesterBuilder } = require('../setup');
const { assert } = require('chai');

describe('updating widgets', () => {

  let tester;

  before(async () => {
    tester = await new WrestlerTesterBuilder().build();
  });

  context('with users disabled', () => {

    beforeEach(async () => {
      await tester.dropWidgets();
    });

    describe('sending a good request', () => {

      let resp, widget;

      beforeEach(async () => {
        widget = await tester.createWidget({ name: 'coconut', company: 'acme', color: 'brown' });
        resp = await tester.patch(`/widget/${widget.id}`, { name: 'coconuts' });
      });

      it('returns the correct status code', async () => {
        assert.equal(resp.statusCode, 200);
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
        assert.equal(resp.statusCode, 400);
      });

    });

  });

});
