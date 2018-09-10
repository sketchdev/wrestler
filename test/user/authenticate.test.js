const { WrestlerTesterBuilder } = require('../setup');
const { assert } = require('chai');

describe('authenticating users', () => {

  let tester;

  before(async () => {
    tester = await new WrestlerTesterBuilder().enableUsers().build();
  });

  beforeEach(async () => {
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
        assert.equal(resp.statusCode, 200);
      });

      it('returns a login token', async () => {
        assert.exists(resp.body.token);
      });

    });

    describe('login token expiration', () => {

      it('expires login tokens after a period of time');

    });

    describe('sending a bad requests', () => {

      it('returns an error if the email is not found', async () => {
        const resp = await tester.post('/user/login', { email: 'thomas@mailinator.com', password: 'welcome@2' });
        assert.equal(resp.statusCode, 401);
        assert.deepEqual(resp.body, { base: { messages: ['Invalid email or password'] } });
      });

      it('returns an error if credentials are incorrect', async () => {
        const resp = await tester.post('/user/login', { email: 'tom@mailinator.com', password: 'welcome@2' });
        assert.equal(resp.statusCode, 401);
        assert.deepEqual(resp.body, { base: { messages: ['Invalid email or password'] } });
      });

      it('requires authentication to other resources', async () => {
        const resp = await tester.get('/widget');
        assert.equal(resp.statusCode, 401);
      });

    });

  });

});
