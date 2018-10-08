const { WrestlerTesterBuilder } = require('../setup');
const sinon = require('sinon');
const { assert } = require('chai');

describe('inviting users', () => {

  context('with default options', () => {

    describe('sending a good invite request', () => {

      let resp, tester, transporter;
      let email = 'bob@mailinator.com';

      beforeEach(async () => {
        const root = { email: 'root@mailinator.com', password: 'welcome@1', role: 'superadmin' };
        tester = await new WrestlerTesterBuilder().enableUsers({ inviteOnly: true }).createUser(root).build();
        transporter = tester.getEmailTransporter();
        const rootToken = await tester.loginUser(root.email, root.password);
        sinon.spy(transporter, 'sendMail');
        resp = await tester.post('/user/invite', { email, role: 'user' }, rootToken);
      });

      afterEach(async () => {
        transporter.sendMail.restore();
      });

      it('returns the correct status code', async () => {
        assert.equal(resp.status, 201);
      });

      it('returns a location header', async () => {
        assert.equal(resp.headers.location, `/user/${resp.body.id}`);
      });

      it('returns user details', async () => {
        assert.equal(resp.body.email, 'bob@mailinator.com');
        assert.equal(resp.body.role, 'user');
        assert.exists(resp.body.createdAt);
        assert.exists(resp.body.updatedAt);
        assert.exists(resp.body.id);
      });

      it('omits sensitive details', async () => {
        assert.notExists(resp.body.password);
        assert.notExists(resp.body.confirmationCode);
        assert.notExists(resp.body.confirmed);
        assert.notExists(resp.body.inviteCode);
      });

      it('sends an email', async () => {
        const inviteCode = await tester.getInviteCode(email);
        assert.exists(transporter.sendMail.firstCall);
        const text = `You've been invited!. Your invite code is ${inviteCode}`;
        assert.equal(transporter.sendMail.args[0][0].text, text);
      });

      it('expires invite tokens after a period of time');

    });

    describe('preventing self-service user creation', () => {

      let resp;

      beforeEach(async () => {
        const root = { email: 'root@mailinator.com', password: 'welcome@1', role: 'superadmin' };
        const tester = await new WrestlerTesterBuilder().enableUsers({ inviteOnly: true }).createUser(root).build();
        resp = await tester.post('/user', { email: 'test@mailinator.com', password: 'welcome@1' });
      });

      it('returns the correct status code', async () => {
        assert.equal(resp.status, 403);
      });

      it('returns an error', async () => {
        assert.deepEqual(resp.body, { base: { messages: ['Users can only be invited.'] } });
      });

    });

    describe('sending bad requests', () => {

      let tester, transporter, root, rootToken;

      beforeEach(async () => {
        root = { email: 'root@mailinator.com', password: 'welcome@1', role: 'superadmin' };
        tester = await new WrestlerTesterBuilder().enableUsers({ inviteOnly: true }).createUser(root).build();
        transporter = tester.getEmailTransporter();
        rootToken = await tester.loginUser(root.email, root.password);
        sinon.spy(transporter, 'sendMail');
      });

      it('returns an error if the user email already exists', async () => {
        const resp = await tester.post('/user/invite', { email: root.email }, rootToken);
        assert.equal(resp.status, 422);
        assert.deepEqual(resp.body, { email: { messages: ['Email already exists'] } });
      });

      it('returns an error if no email is supplied', async () => {
        const resp = await tester.post('/user/invite', { emale: 'bob@mailinator.com' }, rootToken);
        assert.equal(resp.status, 422);
        assert.deepEqual(resp.body, { email: { messages: ['Email is required'] } });
      });

      it('returns an error if the email is invalid', async () => {
        const resp = await tester.post('/user/invite', { email: 'bob@mailinator' }, rootToken);
        assert.equal(resp.status, 422);
        assert.deepEqual(resp.body, { email: { messages: ['Email is invalid'] } });
      });

    });

  });

  context('with customized email', () => {

    describe('inviting a user', () => {

      it('sends a customized email message');

    });

  });

});
