const { WrestlerTesterBuilder } = require('../setup');
const { assert } = require('chai');
const sinon = require('sinon');

describe('changing email', () => {

  let tester, transporter;

  before(() => {
    tester = new WrestlerTesterBuilder().enableUsers().build();
    transporter = tester.getEmailTransporter();
  });

  beforeEach(async () => {
    await tester.drop('user', 'widget');
  });

  context('with default options', () => {

    describe('successfully requesting an email change', () => {

      let resp, user;
      let email = 'bob@mailinator.com';
      let newEmail = 'robert@mailinator.com';
      let password = 'welcome@1';

      beforeEach(async () => {
        user = await tester.createAndLoginUser(email, password);
        sinon.spy(transporter, 'sendMail');
        resp = await tester.post('/user/change-email', { newEmail }, user.token);
      });

      afterEach(async () => {
        transporter.sendMail.restore();
      });

      it('returns the correct status code', async () => {
        assert.equal(resp.statusCode, 204);
      });

      it('returns an empty body', async () => {
        assert.isEmpty(resp.body);
      });

      it('sends a recovery email', async () => {
        const { changeEmailCode, newEmail } = await tester.getUser(email);
        assert.exists(transporter.sendMail.firstCall);
        const text = `You requested to change your email to ${newEmail}. Your confirmation code is ${changeEmailCode}`;
        assert.equal(transporter.sendMail.args[0][0].text, text);
      });

    });

    describe('sending bad requests', () => {

      let user;
      const email = 'sam@mailinator.com';

      beforeEach(async () => {
        user = await tester.createAndLoginUser('bob@mailinator.com', 'welcome@1');
        await tester.createAndLoginUser(email, 'welcome@1');
        sinon.spy(transporter, 'sendMail');
      });

      afterEach(async () => {
        assert.notExists(transporter.sendMail.firstCall);
        transporter.sendMail.restore();
      });

      it('returns an error if the email already exists', async () => {
        const resp = await tester.post('/user/change-email', { newEmail: email }, user.token);
        assert.equal(resp.statusCode, 422);
        assert.deepEqual(resp.body, { newEmail: { messages: ['Email already exists'] } });
      });

      it('returns an error if the email is missing', async () => {
        const resp = await tester.post('/user/change-email', { newwEmail: email }, user.token);
        assert.equal(resp.statusCode, 422);
        assert.deepEqual(resp.body, { newEmail: { messages: ['Email is required'] } });
      });

      it('returns an error if the email is empty', async () => {
        const resp = await tester.post('/user/change-email', { newwEmail: '' }, user.token);
        assert.equal(resp.statusCode, 422);
        assert.deepEqual(resp.body, { newEmail: { messages: ['Email is required'] } });
      });

      it('returns an error if the email is invalid', async () => {
        const resp = await tester.post('/user/change-email', { newEmail: 'sam' }, user.token);
        assert.equal(resp.statusCode, 422);
        assert.deepEqual(resp.body, { newEmail: { messages: ['Email is invalid'] } });
      });

      it('returns an error if the user update fails', async () => {
        const dbDriver = tester.getDatabaseDriver();
        sinon.stub(dbDriver, 'findOneAndUpdate').rejects('oops');
        const resp = await tester.post('/user/change-email', { newEmail: 'good@mailinator.com' }, user.token);
        assert.equal(resp.statusCode, 500);
        assert.deepEqual(resp.body, { base: { messages: ['Unexpected error'] } });
        dbDriver.findOneAndUpdate.restore();
      });

    });

  });

});
