const { WrestlerTesterBuilder } = require('../setup');
const { assert } = require('chai');

describe('updating users', () => {

  let tester;

  before(() => {
    tester = new WrestlerTesterBuilder().enableUsers().build();
  });

  context('with default options', () => {

    let tom;

    beforeEach(async () => {
      await tester.dropUsers();
      tom = await tester.createAndLoginUser('tom@mailinator.com', 'welcome@1');
    });

    describe('sending a good request', () => {

      let resp;

      beforeEach(async () => {
        resp = await tester.patch(`/user/${tom.user.id}`, { password: 'welcome@3', age: 41 }, tom.token);
      });

      it('returns the correct status code', async () => {
        assert.equal(resp.statusCode, 200);
      });

      it('returns the id', async () => {
        assert.exists(resp.body.id);
      });

      it('updates only the supplied properties', async () => {
        assert.equal(resp.body.email, tom.user.email);
        assert.equal(resp.body.age, 41);
      });

      it('excludes the password', async () => {
        assert.notExists(resp.body.password);
      });

      it('returns the created and updated times', async () => {
        assert.exists(resp.body.createdAt);
        assert.exists(resp.body.updatedAt);
      });

      it('updates the updated time', async () => {
        assert.notEqual(resp.body.updatedAt, tom.user.updatedAt);
      });

      it('keeps the same created time', async () => {
        assert.equal(resp.body.createdAt, tom.user.createdAt);
      });

      it('logins with the new password', async () => {
        const token = await tester.loginUser('tom@mailinator.com', 'welcome@3');
        assert.exists(token);
      });

    });

    describe('sending bad requests', () => {

      it('fails if not authenticated', async () => {
        const resp = await tester.patch(`/user/${tom.user.id}`, { email: 'tom40@mailinator.com', password: 'welcome@2', age: 41 })
        assert.equal(resp.statusCode, 401);
      });

      it('returns an error with the old password if changed', async () => {
        const updateResp = await tester.patch(`/user/${tom.user.id}`, { password: 'welcome@3' }, tom.token);
        assert.equal(updateResp.statusCode, 200);

        const loginResp = await tester.post('/user/login', { email: 'tom@mailinator.com', password: 'welcome@1' });
        assert.equal(loginResp.statusCode, 401);
        assert.deepEqual(loginResp.body.base.messages, ['Invalid email or password']);
      });

      it('returns an error if the email is invalid', async () => {
        const resp = await tester.patch(`/user/${tom.user.id}`, { email: 'welcome@3' }, tom.token);
        assert.equal(resp.statusCode, 422);
        assert.deepEqual(resp.body.email.messages, ['Email is invalid']);
      });

      it('returns an error if the email already exists', async () => {
        const resp = await tester.patch(`/user/${tom.user.id}`, { email: 'tom@mailinator.com' }, tom.token);
        assert.equal(resp.statusCode, 422);
        assert.deepEqual(resp.body.email.messages, ['Email already exists']);
      });

    });

  });

});
