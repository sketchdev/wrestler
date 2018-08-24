const { WrestlerTesterBuilder } = require('../setup');
const { assert } = require('chai');
const sinon = require('sinon');

describe('confirming users', () => {

  let tester;

  before(() => {
    tester = new WrestlerTesterBuilder().enableUsers().build();
  });

  context('with default options', () => {

    describe('successfully confirming a user', () => {

      let resp;
      let email = 'bob@mailinator.com';
      let password = 'welcome@1';

      beforeEach(async () => {
        await tester.dropUsers();
        const createResp = await tester.post('/user', { email, password });
        assert.equal(createResp.statusCode, 201);
        const confirmationCode = await tester.getConfirmationCode(email);
        resp = await tester.post('/user/confirm', { email, confirmationCode });
      });

      it('returns the correct status code', async () => {
        assert.equal(resp.statusCode, 200);
      });

      it('returns user details', async () => {
        assert.equal(resp.body.email, email);
        assert.exists(resp.body.createdAt);
        assert.exists(resp.body.updatedAt);
        assert.exists(resp.body.id);
      });

      it('omits sensitive details', async () => {
        assert.notExists(resp.body.password);
        assert.notExists(resp.body.confirmationCode);
        assert.notExists(resp.body.confirmed);
      });

    });

    describe('sending bad requests', () => {

      it('returns an error if the user is not found', async () => {
        const resp = await tester.post('/user/confirm', { email: 'test@mailinator.com' });
        assert.equal(resp.statusCode, 422);
        assert.deepEqual(resp.body, { email: { messages: ['Invalid email'] }});
      });

      it('returns an error if the confirmationCode is not correct', async () => {
        await tester.dropUsers();
        const email = 'bob@mailinator.com';
        const password = 'welcome@1';
        await tester.createUser(email, password);
        const resp = await tester.post('/user/confirm', { email, confirmationCode: 'a' });
        assert.equal(resp.statusCode, 422);
        assert.deepEqual(resp.body, { confirmationCode: { messages: ['Invalid confirmationCode'] }});
      });

      it('returns an error if the confirmationCode is expired', async () => {
        await tester.dropUsers();
        const email = 'bob@mailinator.com';
        const password = 'welcome@1';
        await tester.createUserWithExpiredConfirmation(email, password);
        const confirmationCode = await tester.getConfirmationCode(email);
        const resp = await tester.post('/user/confirm', { email, confirmationCode });
        assert.equal(resp.statusCode, 422);
        assert.deepEqual(resp.body, { confirmationCode: { messages: ['Expired confirmationCode'] }});
      });

    });

    describe('failing to update the user', () => {

      let resp, dbDriver;
      const email = 'bob@mailinator.com';
      const password = 'welcome@1';

      before(async () => {
        dbDriver = tester.getDatabaseDriver();
      });

      beforeEach(async () => {
        sinon.stub(dbDriver, 'findOneAndUpdate').rejects('oops');
        await tester.dropUsers();
        const createResp = await tester.post('/user', { email, password });
        assert.equal(createResp.statusCode, 201);
        const confirmationCode = await tester.getConfirmationCode(email);
        resp = await tester.post('/user/confirm', { email, confirmationCode });
      });

      afterEach(async () => {
        dbDriver.findOneAndUpdate.restore();
      });

      it('returns the correct status code', async () => {
        assert.equal(resp.statusCode, 500);
      });

      it('returns an error response', async () => {
        assert.deepEqual(resp.body, { base: { messages: ['Unexpected error'] } });
      });

    });

  });

});
