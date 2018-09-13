const { WrestlerTesterBuilder } = require('../setup');
const { assert } = require('chai');
const sinon = require('sinon');

describe('confirm changing email', () => {

  let tester, transporter;
  const firstEmail = 'bob@mailinator.com';
  const password = 'welcome@1';

  beforeEach(async () => {
    tester = await new WrestlerTesterBuilder().enableUsers().build();
    transporter = tester.getEmailTransporter();
    await tester.dropWidgets();
    await tester.dropUsers();
  });

  context('with default options', () => {

    let bob;

    beforeEach(async () => {
      bob = await tester.createAndLoginUser(firstEmail, password);
    });

    describe('successfully confirming an email change', () => {

      let resp;
      const newEmail = 'robert@mailinator.com';

      beforeEach(async () => {
        sinon.spy(transporter, 'sendMail');
        const changeEmailResp = await tester.post('/user/change-email', { email: newEmail }, bob.token);
        assert.equal(changeEmailResp.status, 204);
        assert.exists(transporter.sendMail.firstCall);
        const updatedUser = await tester.getUser(bob.user.email);
        assert.exists(updatedUser.changeEmailCode);
        resp = await tester.post('/user/confirm-change-email', { email: newEmail, changeEmailCode: updatedUser.changeEmailCode }, bob.token);
        transporter.sendMail.restore();
      });

      it('returns the correct status code', async () => {
        assert.equal(resp.status, 200);
      });

      it('returns an empty body', async () => {
        assert.isEmpty(resp.body);
      });

      it('authenticates with the new email', async () => {
        const token = await tester.loginUser(newEmail, password);
        assert.exists(token);
      });

      it('rejects authentication with the old email', async () => {
        const resp = await tester.post('/user/login', { email: firstEmail, password });
        assert.equal(resp.status, 401);
      });

    });

    describe('sending bad requests', () => {

      it('returns an error if the email is missing', async () => {
        const resp = await tester.post('/user/confirm-change-email', { changeEmailCode: 'AAA' }, bob.token);
        assert.equal(resp.status, 422);
        assert.deepEqual(resp.body, { email: { messages: ['Email is required'] }});
      });

      it('returns an error if the email is invalid', async () => {
        const resp = await tester.post('/user/confirm-change-email', { email: 'abc', changeEmailCode: 'AAA' }, bob.token);
        assert.equal(resp.status, 422);
        assert.deepEqual(resp.body, { email: { messages: ['Email is invalid'] }});
      });

      it('returns an error if the change email code is missing', async () => {
        const resp = await tester.post('/user/confirm-change-email', { email: 'robert@mailinator.com' }, bob.token);
        assert.equal(resp.status, 422);
        assert.deepEqual(resp.body, { changeEmailCode: { messages: ['Change email code is required'] }});
      });

      it('returns an error if the user cannot be found', async () => {
        const resp = await tester.post('/user/confirm-change-email', { email: 'tom@mailinator.com', changeEmailCode: 'AAA' }, bob.token);
        assert.equal(resp.status, 422);
        assert.deepEqual(resp.body, { email: { messages: ['Invalid email'] }});
      });

      it('returns an error if the change email code is expired', async () => {
        const newEmail = 'robert@mailinator.com';
        sinon.spy(transporter, 'sendMail');
        const changeEmailResp = await tester.post('/user/change-email', { email: newEmail }, bob.token);
        assert.equal(changeEmailResp.status, 204);
        assert.exists(transporter.sendMail.firstCall);
        transporter.sendMail.restore();
        const updatedUser = await tester.updateUser(bob.user.email, { changeEmailExpiresAt: new Date(2000, 1, 1)});
        const resp = await tester.post('/user/confirm-change-email', { email: newEmail, changeEmailCode: updatedUser.changeEmailCode }, bob.token);
        assert.equal(resp.status, 422);
        assert.deepEqual(resp.body, { changeEmailCode: { messages: ['Expired change email code'] }});
      });

      it('returns an error if the change email code is incorrect', async () => {
        const newEmail = 'robert@mailinator.com';
        sinon.spy(transporter, 'sendMail');
        const changeEmailResp = await tester.post('/user/change-email', { email: newEmail }, bob.token);
        assert.equal(changeEmailResp.status, 204);
        assert.exists(transporter.sendMail.firstCall);
        transporter.sendMail.restore();
        const resp = await tester.post('/user/confirm-change-email', { email: newEmail, changeEmailCode: 'AAA' }, bob.token);
        assert.equal(resp.status, 422);
        assert.deepEqual(resp.body, { changeEmailCode: { messages: ['Invalid change email code'] }});
      });

    });

  });

});
