const { WrestlerTesterBuilder } = require('../setup');
const { assert } = require('chai');
const sinon = require('sinon');

describe('recovering passwords', () => {

  let tester, transporter, dbDriver;

  beforeEach(async () => {
    tester = await new WrestlerTesterBuilder().enableUsers().build();
    transporter = tester.getEmailTransporter();
    dbDriver = tester.getDatabaseDriver();
    await tester.dropUsers();
  });

  context('with default options', () => {

    describe('successfully requesting a password recovery', () => {

      let resp;
      let email = 'bob@mailinator.com';
      let password = 'welcome@1';

      beforeEach(async () => {
        await tester.createUser(email, password);
        sinon.spy(transporter, 'sendMail');
        resp = await tester.post('/user/forgot-password', { email });
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
        const recoveryCode = await tester.getRecoveryCode(email);
        assert.exists(transporter.sendMail.firstCall);
        const text = `You requested to recover your password. Your recovery code is ${recoveryCode}`;
        assert.equal(transporter.sendMail.args[0][0].text, text);
      });

    });

    describe('requesting recovery for missing users', () => {

      let resp;

      beforeEach(async () => {
        sinon.spy(transporter, 'sendMail');
        resp = await tester.post('/user/forgot-password', { email: 'nobody@mailinator.com' });
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

      it('skips sending an email', async () => {
        assert.notExists(transporter.sendMail.firstCall);
      });

    });

    describe('failing to lookup user', () => {

      let resp;
      const email = 'bob@mailinator.com';

      beforeEach(async () => {
        await tester.createUser(email, 'welcome@1');
        sinon.spy(transporter, 'sendMail');
        sinon.stub(dbDriver, 'findOne').rejects('oops');
        resp = await tester.post('/user/forgot-password', { email });
      });

      afterEach(async () => {
        transporter.sendMail.restore();
        dbDriver.findOne.restore();
      });

      it('returns the correct status code', async () => {
        assert.equal(resp.status, 500);
      });

      it('skips sending an email', async () => {
        assert.notExists(transporter.sendMail.firstCall);
      });

      it('returns an error response', async () => {
        assert.deepEqual(resp.body, { base: { messages: ['Unexpected error'] } });
      });

    });

  });

});
