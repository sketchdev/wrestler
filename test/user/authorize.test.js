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

    let tester, rootToken, admin, guest;

    beforeEach(async () => {
      tester = await new WrestlerTesterBuilder().enableUsers({
        allow: [
          { roles: ['appAdmin', 'admin'], resource: 'user', methods: '*' },
          // { roles: ['appAdmin', 'admin'], resource: 'widgets', methods: '*' },
          // { roles: ['guest'], resource: 'user', methods: '*', onlyOwned: true },
          // { roles: ['guest'], resource: 'widgets', methods: ['GET'] },
          // { roles: ['guest'], resource: 'widgets', methods: ['PUT', 'PATCH', 'POST', 'DELETE'], onlyOwned: true },
        ]
      }).createUser({ email: 'root@mailinator.com', password: 'welcome@1', role: 'appAdmin' }).build();
      rootToken = await tester.loginUser('root@mailinator.com', 'welcome@1');
      // admin = await tester.createAndLoginUser('admin@mailinator.com', 'welcome@1', { role: 'admin' });
      // guest = await tester.createAndLoginUser('guest@mailinator.com', 'welcome@1');
    });

    it('allows admins to create other admins', async () => {
      const resp = await tester.post('/user', { email: 'admin@mailinator.com', password: 'welcome@1' }, rootToken);
      assert.equal(resp.status, 201);
    });

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
