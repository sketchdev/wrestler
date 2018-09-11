const { WrestlerTesterBuilder } = require('../setup');
const { assert } = require('chai');

describe('authorizing users', () => {

  context('with an authorization function', () => {

    let tester;

    before(async () => {
      tester = await new WrestlerTesterBuilder().enableUsers({
        authorization: (req, res) => {
          if (req.wrestler.resource === 'widget') {
            if (!req.wrestler.user || req.wrestler.user.email !== 'tom@mailinator.com') {
              res.sendStatus(403);
            }
          }
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

  context('with acl rules and authorization function', () => {

    it('allows admins to create other admins');
    it('allows guests to create themselves');

    it('allows creating widgets if you are an admin');
    it('prevents creating widgets if you are a guest');

    it('allows reading widgets if you are an admin');
    it('allows reading widgets if you are a guest');

    it('allows guests to update themselves');
    it('allows guests to read themselves');
    it('allows guests to delete themselves');

    it('prevents guests from reading others');
    it('prevents guests from updating others');
    it('prevents guests from deleting others');

  });

});
