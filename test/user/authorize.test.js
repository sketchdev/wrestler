const { WrestlerTesterBuilder } = require('../setup');
const { assert } = require('chai');

describe('authorizing users', () => {

  context('with an authorization function', () => {

    let tester;

    beforeEach(async () => {
      tester = await new WrestlerTesterBuilder().enableUsers({
        authorization: (req, res) => {
          if (req.wrestler.resource === 'widget') {
            if (!req.wrestler.user || req.wrestler.user.email !== 'tom@mailinator.com') {
              res.sendStatus(403);
            }
          }
        }
      }).build();
      await tester.dropUsers();
      await tester.dropWidgets();
    });

    it('creates a widget if authorized', async () => {
      const tom = await tester.createAndLoginUser('tom@mailinator.com', 'welcome@1');
      const resp = await tester.post('/widget', { name: 'watermelon', company: 'acme' }, tom.token);
      assert.equal(resp.status, 201);
    });

    it('returns forbidden if not authorized to create a widget', async () => {
      const sam = await tester.createAndLoginUser('sam@mailinator.com', 'welcome@1');
      const resp = await tester.post('/widget', { name: 'watermelon', company: 'acme' }, sam.token);
      assert.equal(resp.status, 403);
    });

  });

  context('with acl rules and authorization function', () => {

    let tester, rootToken, guest1, guest2;

    beforeEach(async () => {
      tester = await new WrestlerTesterBuilder().enableUsers({
        allow: [
          // allow admins to do anything to users
          { roles: ['admin'], resource: 'user', methods: '*' },
          // allow anyone to create a user (but the auth function forces the `guest` role)
          { roles: '*', resource: 'user', methods: ['POST'] },
          // allow guests to read, update, and delete users but only their own user
          { roles: ['guest'], resource: 'user', methods: ['GET', 'PATCH', 'DELETE'], onlyOwned: true },
          // allow admins to do anything to widgets
          { roles: ['admin'], resource: 'widget', methods: '*' },
          // allow guests to read any widgets
          { roles: ['guest'], resource: 'widget', methods: ['GET'] },
          // allow anybody to do anything with any foo that they own
          { roles: '*', resource: 'foo', methods: '*', onlyOwned: true },
        ],
        authorization: (req) => {
          // only handle the POST /user scenario
          if (req.method !== 'POST' && req.wrestler.resource !== 'user') return;
          // force the `guest` role if either no user is authenticated, or a non-admin user is authenticated
          if (!req.session || !req.session.user || req.session.user.role !== 'admin') {
            req.body = Object.assign({}, req.body, { role: 'guest' });
          }
        }
      }).createUser({ email: 'root@mailinator.com', password: 'welcome@1', role: 'admin' }).build();
      rootToken = await tester.loginUser('root@mailinator.com', 'welcome@1');
      guest1 = await tester.createAndLoginUser('guest1@mailinator.com', 'welcome@1', { role: 'guest', age: 40 });
      guest2 = await tester.createAndLoginUser('guest2@mailinator.com', 'welcome@1', { role: 'guest', age: 20 });
    });

    const testCreatingUsers = async (email, role, createToken, assertRole) => {
      const password = 'welcome@1';
      assert.equal((await tester.post('/user', { email, password, role }, createToken)).status, 201);
      const user = await tester.getUser(email);
      assert.equal(user.role, assertRole);
      const confirmationCode = await tester.getConfirmationCode(email);
      assert.equal((await tester.post('/user/confirm', { email, confirmationCode })).status, 204);
      assert.equal((await tester.post('/user/login', { email, password })).status, 200);
    };

    describe('as an admin', () => {

      it('allows creating admins', async () => {
        await testCreatingUsers('admin@mailinator.com', 'admin', rootToken, 'admin');
      });

      it('allows deleting guests', async () => {
        const resp1 = await tester.delete(`/user/${guest1.user.id}`, rootToken);
        assert.equal(resp1.status, 204);
        const resp2 = await tester.delete(`/user/${guest2.user.id}`, rootToken);
        assert.equal(resp2.status, 204);
      });

      it('allows updating guests', async () => {
        const resp1 = await tester.patch(`/user/${guest1.user.id}`, { age: 30 }, rootToken);
        assert.equal(resp1.status, 200);
        assert.equal(resp1.body.age, 30);
        const resp2 = await tester.patch(`/user/${guest2.user.id}`, { age: 30 }, rootToken);
        assert.equal(resp2.status, 200);
        assert.equal(resp2.body.age, 30);
      });

      it('allows creating widgets', async () => {
        const resp = await tester.post('/widget', { color: 'blue' }, rootToken);
        assert.equal(resp.status, 201);
      });

      it('allows updating widgets', async () => {
        const newColor = 'red';
        const createResp = await tester.post('/widget', { color: 'blue' }, rootToken);
        assert.equal(createResp.status, 201);
        const updateResp = await tester.patch(`/widget/${createResp.body.id}`, { color: newColor }, rootToken);
        assert.equal(updateResp.status, 200);
        assert.equal(updateResp.body.color, newColor);
      });

      it('allows deleting widgets', async () => {
        const createResp = await tester.post('/widget', { color: 'blue' }, rootToken);
        assert.equal(createResp.status, 201);
        const deleteResp = await tester.delete(`/widget/${createResp.body.id}`, rootToken);
        assert.equal(deleteResp.status, 204);
      });

    });

    describe('as nobody', () => {

      it('creates a guest even if trying to create an admin', async () => {
        await testCreatingUsers('admin@mailinator.com', 'admin', null, 'guest');
      });

      it('requires a login for any resource declared in the acl', async () => {
        const resp = await tester.post('/foo', { bar: 'bar' });
        assert.equal(resp.status, 401);
      });

    });

    describe('as a guest', () => {

      beforeEach(async () => {
        await tester.dropWidgets();
        await tester.clean('foo');
      });

      it('creates a guest even if trying to create an admin', async () => {
        await testCreatingUsers('admin@mailinator.com', 'admin', guest1.token, 'guest');
      });

      it('allows updating themselves', async () => {
        const resp = await tester.patch(`/user/${guest1.user.id}`, { age: 30 }, guest1.token);
        assert.equal(resp.status, 200);
        assert.equal(resp.body.age, 30);
      });

      it('prevents updating others', async () => {
        const resp = await tester.patch(`/user/${guest2.user.id}`, { age: 30 }, guest1.token);
        assert.equal(resp.status, 403);
      });

      it('allows reading themselves', async () => {
        const resp = await tester.get(`/user/${guest1.user.id}`, guest1.token);
        assert.equal(resp.status, 200);
        assert.equal(resp.body.id, guest1.user.id);
      });

      it('prevents reading others', async () => {
        const resp = await tester.get(`/user/${guest2.user.id}`, guest1.token);
        assert.equal(resp.status, 403);
      });

      it('allows deleting themselves', async () => {
        const resp = await tester.delete(`/user/${guest1.user.id}`, guest1.token);
        assert.equal(resp.status, 204);
      });

      it('prevents deleting others', async () => {
        const resp = await tester.delete(`/user/${guest2.user.id}`, guest1.token);
        assert.equal(resp.status, 403);
      });

      it('prevents creating widgets', async () => {
        const resp = await tester.post('/widget', { color: 'blue' }, guest1.token);
        assert.equal(resp.status, 403);
      });

      it('allows reading widgets', async () => {
        const color = 'blue';
        const createResp = await tester.post('/widget', { color }, rootToken);
        assert.equal(createResp.status, 201);
        const readResp = await tester.get(`/widget/${createResp.body.id}`, guest1.token);
        assert.equal(readResp.status, 200);
        assert.equal(readResp.body.color, color);
      });

      it('prevents updating widgets', async () => {
        const resp = await tester.patch('/widget/1', { color: 'red' }, guest1.token);
        assert.equal(resp.status, 403);
      });

      it('prevents deleting widgets', async () => {
        const resp = await tester.delete('/widget/1', guest1.token);
        assert.equal(resp.status, 403);
      });

      it('allows guests to create foos', async () => {
        const resp = await tester.post('/foo', { bar: 'bar' }, guest1.token);
        assert.equal(resp.status, 201);
      });

      it('allows the owner to update their own foos', async () => {
        const createResp = await tester.post('/foo', { bar: 'bar' }, guest1.token);
        assert.equal(createResp.status, 201);
        const updateResp = await tester.patch(`/foo/${createResp.body.id}`, { bar: 'baz' }, guest1.token);
        assert.equal(updateResp.status, 200);
      });

      it('prevents guests from updating other guests foos', async () => {
        const createResp = await tester.post('/foo', { bar: 'bar' }, guest1.token);
        assert.equal(createResp.status, 201);
        const updateResp = await tester.patch(`/foo/${createResp.body.id}`, { bar: 'baz' }, guest2.token);
        assert.equal(updateResp.status, 404);
      });

      it('prevents guests from replacing other guests foos', async () => {
        const createResp = await tester.post('/foo', { bar: 'bar' }, guest1.token);
        assert.equal(createResp.status, 201);
        const updateResp = await tester.put(`/foo/${createResp.body.id}`, { bar: 'baz' }, guest2.token);
        assert.equal(updateResp.status, 404);
      });

      it('prevents guests from reading other guests foos by id', async () => {
        const createResp = await tester.post('/foo', { bar: 'bar' }, guest1.token);
        assert.equal(createResp.status, 201);
        const getResp = await tester.get(`/foo/${createResp.body.id}`, guest2.token);
        assert.equal(getResp.status, 404);
      });

      it('prevents guests from reading other guests foos but they can read their own', async () => {
        let createResp = await tester.post('/foo', { bar: 'bar' }, guest1.token);
        assert.equal(createResp.status, 201);
        createResp = await tester.post('/foo', { bar: 'baz' }, guest2.token);
        assert.equal(createResp.status, 201);
        const getResp = await tester.get(`/foo`, guest2.token);
        assert.equal(getResp.status, 200);
        assert.equal(getResp.body.length, 1);
        assert.deepEqual(getResp.body[0].bar, 'baz');
      });

    });

  });

});
