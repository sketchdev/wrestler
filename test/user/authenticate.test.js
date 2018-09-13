const common = require('../../lib/users/common');
const { WrestlerTesterBuilder } = require('../setup');
const { assert } = require('chai');

describe('authenticating users', () => {

  let tester;

  beforeEach(async () => {
    tester = await new WrestlerTesterBuilder().enableUsers().build();
    await tester.dropWidgets();
    await tester.dropUsers();
  });

  context('with default options', () => {

    beforeEach(async () => {
      await tester.createUser('tom@mailinator.com', 'welcome@1');
    });

    describe('sending a good request', () => {

      let resp;

      beforeEach(async () => {
        resp = await tester.post('/user/login', { email: 'tom@mailinator.com', password: 'welcome@1' });
      });

      it('returns the correct status code', async () => {
        assert.equal(resp.status, 200);
      });

      it('returns a login token', async () => {
        assert.exists(resp.body.token);
      });

    });

    describe('creating a user at startup', () => {

      let tester;
      const user = { email: 'root@mailinator.com', password: 'welcome@1', role: 'superadmin' };

      beforeEach(async () => {
        tester = await new WrestlerTesterBuilder().enableUsers().createUser(user).build();
      });

      it('authenticates the user', async () => {
        const resp = await tester.post('/user/login', user);
        assert.equal(resp.status, 200);
      });

      it('saves additional properties', async () => {
        const dbUser = await tester.getDatabaseDriver().findOne(common.USER_COLLECTION_NAME, { email: user.email });
        assert.equal(dbUser.role, user.role);
      });

      it('returns unauthorized if the password is incorrect', async () => {
        const resp = await tester.post('/user/login', { email: user.email, password: 'abc' });
        assert.equal(resp.status, 401);
      })

    });

    describe('login token expiration', () => {

      it('expires login tokens after a period of time');

    });

    describe('sending a bad requests', () => {

      it('returns an error if the email is not found', async () => {
        const resp = await tester.post('/user/login', { email: 'thomas@mailinator.com', password: 'welcome@2' });
        assert.equal(resp.status, 401);
        assert.deepEqual(resp.body, { base: { messages: ['Invalid email or password'] } });
      });

      it('returns an error if credentials are incorrect', async () => {
        const resp = await tester.post('/user/login', { email: 'tom@mailinator.com', password: 'welcome@2' });
        assert.equal(resp.status, 401);
        assert.deepEqual(resp.body, { base: { messages: ['Invalid email or password'] } });
      });

      it('requires authentication to other resources', async () => {
        const resp = await tester.get('/widget');
        assert.equal(resp.status, 401);
      });

      it('returns an error if the jwt user is not found', async () => {
        const token = 'eyJhbGciOiJIUzUxMiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6ImNvZHlAbWFpbGluYXRvci5jb20iLCJjb25maXJtYXRpb25FeHBpcmVzQXQiOiIyMDE4LTA5LTEzVDE5OjU2OjI0Ljg4M1oiLCJjcmVhdGVkQXQiOiIyMDE4LTA5LTEzVDE4OjU2OjI0Ljg4NVoiLCJ1cGRhdGVkQXQiOiIyMDE4LTA5LTEzVDE4OjU2OjI0Ljg4NVoiLCJpZCI6InNmVW9GQjNVazRLWWhLdHAiLCJpYXQiOjE1MzY4NjUwNjIsImV4cCI6MTUzNjg2ODY2Mn0.LQqLnj-7aCAE4QwDW6DtKEW0LijWv8Vt5NpSBA8T2mwrFZNJP5UgzcSJ7Ux6YMuVDMJDz-SXDgZ1lwZa-O2_yg';
        const resp = await tester.get('/widget', token);
        assert.equal(resp.status, 403);
      });

    });

  });

});
