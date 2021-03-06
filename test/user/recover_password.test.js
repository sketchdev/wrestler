const { WrestlerTesterBuilder } = require('../setup');
const { assert } = require('chai');
const sinon = require('sinon');

describe('recovering user passwords', () => {

  let tester, dbDriver;
  let email = 'bob@mailinator.com';
  let password = 'welcome@1';
  let newPassword = 'welcome@2';

  beforeEach(async () => {
    tester = await new WrestlerTesterBuilder().enableUsers().build();
    dbDriver = tester.getDatabaseDriver();
    await tester.dropUsers();
    await tester.createUser(email, password);
    const forgotResp = await tester.post('/user/forgot-password', { email });
    assert.equal(forgotResp.status, 204);
  });

  context('with default options', () => {

    describe('successfully changing password', () => {

      let resp;

      beforeEach(async () => {
        const recoveryCode = await tester.getRecoveryCode(email);
        resp = await tester.post('/user/recover-password', { email, recoveryCode, password: newPassword });
      });

      it('returns the correct status code', async () => {
        assert.equal(resp.status, 204);
      });

      it('rejects logins with the old password', async () => {
        const resp = await tester.post('/user/login', { email, password });
        assert.equal(resp.status, 401);
      });

      it('accepts login with the new password', async () => {
        const resp = await tester.post('/user/login', { email, password: newPassword });
        assert.equal(resp.status, 200);
      });

    });

    describe('sending bad requests', () => {

      it('returns an error for a missing user', async () => {
        const recoveryCode = await tester.getRecoveryCode(email);
        const resp = await tester.post('/user/recover-password', { email: 'sam@mailinator.com', recoveryCode, password: newPassword });
        assert.equal(resp.status, 422);
        assert.deepEqual(resp.body, { email: { messages: ['Invalid email'] } });
      });

      it('returns an error for an invalid recovery code', async () => {
        const recoveryCode = 'A';
        const resp = await tester.post('/user/recover-password', { email, recoveryCode, password: newPassword });
        assert.equal(resp.status, 422);
        assert.deepEqual(resp.body, { recoveryCode: { messages: ['Invalid recovery code'] } });
      });

      it('returns an error for a missing password', async () => {
        const recoveryCode = await tester.getRecoveryCode(email);
        const resp = await tester.post('/user/recover-password', { email, recoveryCode });
        assert.equal(resp.status, 422);
        assert.deepEqual(resp.body, { password: { messages: ['Password is required'] } });
      });

      it('returns an error for an empty password', async () => {
        const recoveryCode = await tester.getRecoveryCode(email);
        const resp = await tester.post('/user/recover-password', { email, recoveryCode, password: '' });
        assert.equal(resp.status, 422);
        assert.deepEqual(resp.body, { password: { messages: ['Password is required'] } });
      });

      it('returns an error if the recovery code has expired', async () => {
        await tester.expireRecoveryCode(email);
        const recoveryCode = await tester.getRecoveryCode(email);
        const resp = await tester.post('/user/recover-password', { email, recoveryCode, password });
        assert.equal(resp.status, 422);
        assert.deepEqual(resp.body, { recoveryCode: { messages: ['Expired recovery code'] } });
      });

    });

    describe('failing to update user', () => {

      let resp;

      beforeEach(async () => {
        sinon.stub(dbDriver, 'findOneAndUpdate').rejects('oops');
        const recoveryCode = await tester.getRecoveryCode(email);
        resp = await tester.post('/user/recover-password', { email, recoveryCode, password });
      });

      afterEach(async () => {
        dbDriver.findOneAndUpdate.restore();
      });

      it('returns the correct status code', async () => {
        assert.equal(resp.status, 500);
      });

      it('returns an error response', async () => {
        assert.deepEqual(resp.body, { base: { messages: ['Unexpected error'] } });
      });

    });

  });

});
