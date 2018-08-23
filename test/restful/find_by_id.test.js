const { WrestlerTesterBuilder } = require('../setup');
const { assert } = require('chai');

describe('finding widgets by id', () => {

  let tester;

  before(() => {
    tester = new WrestlerTesterBuilder().build();
  });

  context('with users disabled', () => {

    let widget;

    beforeEach(async () => {
      await tester.dropWidgets();
      widget = await tester.createWidget({ name: 'coconut', company: 'acme' });
    });

    describe('sending a good request', () => {

      let resp;

      beforeEach(async () => {
        resp = await tester.get(`/widget/${widget.id}`);
      });

      it('returns the correct status code', async () => {
        assert.equal(resp.statusCode, 200);
      });

      it('returns the widget', async () => {
        assert.deepEqual(resp.body, widget);
      });

    });

    describe('sending a bad requests', () => {

      it('returns the correct status code if not found', async () => {
        const resp = await tester.get(`/widget/4`);
        assert.equal(resp.statusCode, 404);
      });

    });

  });

});
