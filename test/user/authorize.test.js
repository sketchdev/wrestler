const { WrestlerTesterBuilder } = require('../setup');
const { assert } = require('chai');

describe('authorizing users', () => {

  context('with an authorization function', () => {

    let tester;

    before(async () => {
      tester = await new WrestlerTesterBuilder().enableUsers({
        authorization: (req, res, next) => {
          if (req.wrestler.resource === 'widget') {
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

});
