const { WrestlerTesterBuilder } = require('../setup');
const { assert } = require('chai');
const sinon = require('sinon');
const common = require('../../lib/users/common');

describe('resending confirmation to users', () => {

  context('with default options', () => {

    describe('successfully resending confirmation', () => {

      let tester, transporter, resp, confirmationCode, confirmationExpiresAt;
      const email = 'bob@mailinator.com';

      before(async () => {
        tester = await new WrestlerTesterBuilder().enableUsers().build();
        transporter = tester.getEmailTransporter();
      });

      beforeEach(async () => {
        await tester.dropUsers();
        await tester.createUser(email, 'welcome@1');
        confirmationCode = await tester.getConfirmationCode(email);
        confirmationExpiresAt = await tester.getConfirmationExpiresAt(email);
        sinon.spy(transporter, 'sendMail');
        resp = await tester.post('/user/resend-confirm', { email });
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

      it('sends an email', async () => {
        assert.exists(transporter.sendMail.firstCall);
      });

      it('generates a new confirmation code', async () => {
        const user = await tester.getDatabaseDriver().findOne(common.USER_COLLECTION_NAME, { email });
        assert.notEqual(user.confirmationCode, confirmationCode);
      });

      it('generates a new confirmation expiration', async () => {
        const user = await tester.getDatabaseDriver().findOne(common.USER_COLLECTION_NAME, { email });
        assert.notEqual(user.confirmationExpiresAt, confirmationExpiresAt);
      });

    });

    describe('resending confirmation for missing users', () => {

      let tester, transporter, resp;

      before(async () => {
        tester = await new WrestlerTesterBuilder().enableUsers().build();
        transporter = tester.getEmailTransporter();
      });

      beforeEach(async () => {
        await tester.dropUsers();
        sinon.spy(transporter, 'sendMail');
        resp = await tester.post('/user/resend-confirm', { email: 'nobody@mailinator.com' });
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

    describe('sending an empty body', () => {

      let tester, transporter, resp;

      before(async () => {
        tester = await new WrestlerTesterBuilder().enableUsers().build();
        transporter = tester.getEmailTransporter();
      });

      beforeEach(async () => {
        await tester.dropUsers();
        sinon.spy(transporter, 'sendMail');
        resp = await tester.post('/user/resend-confirm', {});
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

    describe('failing to update the user', () => {

      let tester, transporter, dbDriver, resp;
      const email = 'bob@mailinator.com';

      before(async () => {
        tester = await new WrestlerTesterBuilder().enableUsers().build();
        transporter = tester.getEmailTransporter();
        dbDriver = tester.getDatabaseDriver();
      });

      beforeEach(async () => {
        await tester.dropUsers();
        await tester.createUser(email, 'welcome@1');
        sinon.spy(transporter, 'sendMail');
        sinon.stub(dbDriver, 'findOneAndUpdate').rejects('oops');
        resp = await tester.post('/user/resend-confirm', { email: 'bob@mailinator.com' });
      });

      afterEach(async () => {
        transporter.sendMail.restore();
        dbDriver.findOneAndUpdate.restore();
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
