const { WrestlerTesterBuilder } = require('../setup');
const { assert } = require('chai');
const sinon = require('sinon');

describe('recovering passwords', () => {

  let tester, transporter, dbDriver;

  before(() => {
    tester = new WrestlerTesterBuilder().enableUsers().build();
    transporter = tester.getEmailTransporter();
    dbDriver = tester.getDatabaseDriver();
  });

  beforeEach(async () => {
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
        assert.equal(resp.statusCode, 204);
      });

      it('returns an empty body', async () => {
        assert.isEmpty(resp.body);
      });

      it('sends a recovery email', async () => {
        assert.exists(transporter.sendMail.firstCall);
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
        assert.equal(resp.statusCode, 204);
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
        assert.equal(resp.statusCode, 500);
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
