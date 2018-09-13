const { WrestlerTesterBuilder } = require('../setup');
const { assert } = require('chai');
const sinon = require('sinon');

describe('changing email', () => {

  let tester, transporter;
  const existingEmail = 'bob@mailinator.com';

  beforeEach(async () => {
    tester = await new WrestlerTesterBuilder().enableUsers().build();
    transporter = tester.getEmailTransporter();
    await tester.dropWidgets();
    await tester.dropUsers();
  });

  context('with default options', () => {

    describe('successfully requesting an email change', () => {

      let resp, user;
      let email = 'robert@mailinator.com';
      let password = 'welcome@1';

      beforeEach(async () => {
        user = await tester.createAndLoginUser(existingEmail, password);
        sinon.spy(transporter, 'sendMail');
        resp = await tester.post('/user/change-email', { email }, user.token);
      });

      afterEach(async () => {
        transporter.sendMail.restore();
      });

      it('returns the correct status code', async () => {
        assert.equal(resp.status, 204);
      });

      it('returns an empty body', async () => {
        assert.isEmpty(resp.body);
      });

      it('sends a recovery email', async () => {
        const { changeEmailCode, newEmail } = await tester.getUser(existingEmail);
        assert.exists(transporter.sendMail.firstCall);
        const text = `You requested to change your email to ${newEmail}. Your confirmation code is ${changeEmailCode}`;
        assert.equal(transporter.sendMail.args[0][0].text, text);
      });

    });

    describe('sending bad requests', () => {

      let user;

      beforeEach(async () => {
        user = await tester.createAndLoginUser(existingEmail, 'welcome@1');
        sinon.spy(transporter, 'sendMail');
      });

      afterEach(async () => {
        assert.notExists(transporter.sendMail.secondCall);
        transporter.sendMail.restore();
      });

      it('returns an error if the email already exists', async () => {
        const newEmail = 'sam@mailinator.com';
        await tester.createAndLoginUser(newEmail, 'welcome@1');
        const resp = await tester.post('/user/change-email', { email: newEmail }, user.token);
        assert.equal(resp.status, 422);
        assert.deepEqual(resp.body, { email: { messages: ['Email already exists'] } });
      });

      it('returns an error if the email is missing', async () => {
        const resp = await tester.post('/user/change-email', { newwEmail: '' }, user.token);
        assert.equal(resp.status, 422);
        assert.deepEqual(resp.body, { email: { messages: ['Email is required'] } });
      });

      it('returns an error if the email is empty', async () => {
        const resp = await tester.post('/user/change-email', { email: '' }, user.token);
        assert.equal(resp.status, 422);
        assert.deepEqual(resp.body, { email: { messages: ['Email is required'] } });
      });

      it('returns an error if the email is invalid', async () => {
        const resp = await tester.post('/user/change-email', { email: 'sam' }, user.token);
        assert.equal(resp.status, 422);
        assert.deepEqual(resp.body, { email: { messages: ['Email is invalid'] } });
      });

      it('returns an error if the user update fails', async () => {
        const dbDriver = tester.getDatabaseDriver();
        sinon.stub(dbDriver, 'findOneAndUpdate').rejects('oops');
        const resp = await tester.post('/user/change-email', { email: 'good@mailinator.com' }, user.token);
        assert.equal(resp.status, 500);
        assert.deepEqual(resp.body, { base: { messages: ['Unexpected error'] } });
        dbDriver.findOneAndUpdate.restore();
      });

    });

  });

});
