const common = require('../../lib/users/common');
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

  context('with simple authorization', () => {

    let tester, tom, sam, widget;

    before(async () => {
      tester = await new WrestlerTesterBuilder().enableUsers({ authorization: 'simple' }).build();
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

    it('omits a root user', async () => {
      const rootUser = await tester.getRootUser();
      assert.notExists(rootUser);
    });

  });

  context('with role authorization', () => {

    let tester;

    before(async () => {
      tester = await new WrestlerTesterBuilder().enableUsers({ authorization: 'roles' }).build();
    });

    it('creates a root user', async () => {
      const rootUser = await tester.getRootUser();
      assert.exists(rootUser);
    });

    it('creates a root user with custom email and password');

    const createUserWithRole = async (token, role, email='bob@mailinator.com') => {
      const user = { email, password: 'welcome@1', role };
      const resp = await tester.post('/user', user, token);
      assert.equal(resp.body.role, user.role);
    };

    describe('root user access', () => {

      let token, adminUser, guestUser;

      beforeEach(async () => {
        await tester.dropUsers();
        token = await tester.createAndLoginRootUser();
        adminUser = await tester.createUser('admin@mailinator.com', 'welcome@1');
        guestUser = await tester.createUser('guest@mailinator.com', 'welcome@1');
      });

      it('allows the root user to create admins', async () => {
        await createUserWithRole(token, common.ROLE_ADMIN);
      });

      it('allows the root user to create guests', async () => {
        await createUserWithRole(token, common.ROLE_GUEST)
      });

      it('allows the root user to create users with custom roles', async () => {
        await createUserWithRole(token, 'manager');
      });

      it('allows the root user to read guests', async () => {
        const resp = await tester.get(`/user/${guestUser.id}`, token);
        assert.equal(resp.body.id, guestUser.id);
      });

      it('allows the root user to read admins');
      it('allows the root user to update guests');
      it('allows the root user to update admins');
      it('allows the root user to delete guests');
      it('allows the root user to delete admins');
      it('prevents deleting itself');

    });

    describe('admin user access', () => {

      it('allows an admin user to create admins');
      it('allows an admin user to create guests');
      it('allows an admin user to create users with custom roles');
      it('allows an admin user to read guests');
      it('allows an admin user to read admins');
      it('allows an admin user to update guests');
      it('allows an admin user to update admins');
      it('allows an admin user to delete guests');
      it('allows an admin user to delete admins');
      it('prevents deleting the root user');

    });

    describe('guest user access', () => {

      let bob;

      beforeEach(async () => {
        await tester.dropUsers();
        await tester.createRootUser();
        bob = await tester.createAndLoginUser('bob@mailinator.com', 'welcome@1');
      });

      it('allows unauthenticated users to create themselves', async () => {
        await createUserWithRole(undefined, common.ROLE_GUEST, 'sam@mailinator.com');
      });

      it('prevents guests from creating an admin', async () => {
        const user = { email: 'sam@mailinator.com', password: 'welcome@1', role: common.ROLE_ADMIN };
        const resp = await tester.post('/user', user, bob.token);
        assert.equal(resp.body.role, common.ROLE_GUEST);
      });

      it('prevents guests from creating a custom role', async () => {
        const user = { email: 'sam@mailinator.com', password: 'welcome@1', role: 'manager' };
        const resp = await tester.post('/user', user, bob.token);
        assert.equal(resp.body.role, common.ROLE_GUEST);
      });

      it('prevents guests from updating a custom role');
      it('allows guests to read themselves');
      it('prevents guests from reading others');
      it('allows guests to update themselves');
      it('prevents guests from updating others');
      it('allows guests to delete themselves');
      it('prevents guests from deleting others');

    });

  });

});
