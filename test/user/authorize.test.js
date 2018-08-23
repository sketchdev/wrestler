const { WrestlerTesterBuilder } = require('../setup');
const { assert } = require('chai');

describe('authorizing users', () => {

  context('with an authorization function', () => {

    let tester;

    before(() => {
      tester = new WrestlerTesterBuilder().enableUsers({
        authorization: (req, res, next) => {
          if (req.resource === 'widget') {
            if (req.wrestler.user && req.wrestler.user.email === 'tom@mailinator.com') return next();
            return res.sendStatus(403);
          }
          next();
        }
      }).build();
    });

    beforeEach(async () => {
      await tester.dropUsers();
      await tester.dropWidgets();
    });

    it('creates a widget if authorized', async () => {
      const tom = await tester.createAndLoginUser('tom@mailinator.com', 'welcome@1');
      const resp = await tester.post('/widget', { name: 'watermelon', company: 'acme' }, tom.token);
      assert.equal(resp.statusCode, 201);
    });

    it('returns forbidden if not authorized to create a widget', async () => {
      const sam = await tester.createAndLoginUser('sam@mailinator.com', 'welcome@1');
      const resp = await tester.post('/widget', { name: 'watermelon', company: 'acme' }, sam.token);
      assert.equal(resp.statusCode, 403);
    });

  });

  context('with simple authorization', () => {

    let tester, tom, sam, widget;

    before(() => {
      tester = new WrestlerTesterBuilder().enableUsers({ authorization: 'simple' }).build();
    });

    beforeEach(async () => {
      await tester.dropUsers();
      await tester.dropWidgets();
      tom = await tester.createAndLoginUser('tom@mailinator.com', 'welcome@1');
      sam = await tester.createAndLoginUser('sam@mailinator.com', 'welcome@1');
      widget = await tester.createWidget({ name: 'watermelon', company: 'acme' }, tom.token);
    });

    it('returns a widget that you created', async () => {
      const resp = await tester.get(`/widget/${widget.id}`, tom.token);
      assert.equal(resp.statusCode, 200);
      assert.deepEqual(resp.body, widget);
    });

    it('returns forbidden when finding a widget that is not yours', async () => {
      const resp = await tester.get(`/widget/${widget.id}`, sam.token);
      assert.equal(resp.statusCode, 404);
    });

  });

});
