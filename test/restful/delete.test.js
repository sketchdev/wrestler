const { WrestlerTesterBuilder } = require('../setup');
const { assert } = require('chai');

describe('deleting widgets', () => {

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
        widget = await tester.createWidget({ name: 'coconut', company: 'acme', color: 'brown', createdBy: null, updatedBy: null });
        const findResp = await tester.get(`/widget/${widget.id}`);
        assert.equal(findResp.status, 200);
        assert.deepEqual(findResp.body, widget);
        resp = await tester.delete(`/widget/${widget.id}`);
      });

      it('returns the correct status code', async () => {
        assert.equal(resp.status, 204);
      });

      it('returns not found if searched for after delete', async () => {
        const findResp = await tester.get(`/widget/${widget.id}`);
        assert.equal(findResp.status, 404);
      });

    });

    describe('sending a bad requests', () => {

      it('returns an error if the id is missing', async () => {
        const resp = await tester.delete('/widget');
        assert.equal(resp.status, 400);
      });

    });

  });

});
