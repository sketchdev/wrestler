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
        assert.deepEqual(resp.body, { base: { messages: ['Users can only be invited'] } });
      });

    });

    describe('sending bad requests invite requests', () => {

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

    describe('sending a good invite confirmation request', () => {

      let resp, tester, transporter;
      let email = 'bob@mailinator.com';
      let password = 'welcome@1';

      beforeEach(async () => {
        const root = { email: 'root@mailinator.com', password: 'welcome@1', role: 'superadmin' };
        tester = await new WrestlerTesterBuilder().enableUsers({ inviteOnly: true }).createUser(root).build();
        transporter = tester.getEmailTransporter();
        const rootToken = await tester.loginUser(root.email, root.password);
        sinon.spy(transporter, 'sendMail');
        const inviteResp = await tester.post('/user/invite', { email, role: 'user' }, rootToken);
        assert.equal(inviteResp.status, 201);
        const inviteCode = await tester.getInviteCode(email);
        resp = await tester.post('/user/invite-confirm', { email, inviteCode, password });
      });

      afterEach(async () => {
        transporter.sendMail.restore();
      });

      it('returns the correct status code', async () => {
        assert.equal(resp.status, 204);
      });

      it('allows logging in after confirmation', async () => {
        const loginResp = await tester.post('/user/login', { email, password });
        assert.equal(loginResp.status, 200);
      });

    });

    describe('sending bad requests invite confirmation requests', () => {

      let tester, transporter, root, inviteCode;
      let email = 'bob@mailinator.com';
      let password = 'welcome@1';

      beforeEach(async () => {
        root = { email: 'root@mailinator.com', password: 'welcome@1', role: 'superadmin' };
        tester = await new WrestlerTesterBuilder().enableUsers({ inviteOnly: true }).createUser(root).build();
        transporter = tester.getEmailTransporter();
        const rootToken = await tester.loginUser(root.email, root.password);
        sinon.spy(transporter, 'sendMail');
        const inviteResp = await tester.post('/user/invite', { email, role: 'user' }, rootToken);
        assert.equal(inviteResp.status, 201);
        inviteCode = await tester.getInviteCode(email);
      });

      it('returns an error if no email is supplied', async () => {
        const resp = await tester.post('/user/invite-confirm', { emale: 'bob@mailinator.com', password, inviteCode });
        assert.equal(resp.status, 422);
        assert.deepEqual(resp.body, { email: { messages: ['Invalid email'] } });
      });

      it('returns an error if no password is supplied', async () => {
        const resp = await tester.post('/user/invite-confirm', { email, inviteCode });
        assert.equal(resp.status, 422);
        assert.deepEqual(resp.body, { password: { messages: ['Password is required'] } });
      });

      it('returns an error if code is invalid', async () => {
        const resp = await tester.post('/user/invite-confirm', { email, password, inviteCode: 'asdadf' });
        assert.equal(resp.status, 422);
        assert.deepEqual(resp.body, { inviteCode: { messages: ['Invalid invite code'] } });
      });

      it('returns an error if code is expired', async () => {
        await tester.expireInviteCode(email);
        const resp = await tester.post('/user/invite-confirm', { email, password, inviteCode });
        assert.equal(resp.status, 422);
        assert.deepEqual(resp.body, { inviteCode: { messages: ['Expired invite code'] } });
      });

    });

  });

  describe('failing to update the user', () => {

    let resp, dbDriver;
    let tester, transporter, root, inviteCode;
    let email = 'bob@mailinator.com';
    let password = 'welcome@1';

    beforeEach(async () => {
      root = { email: 'root@mailinator.com', password: 'welcome@1', role: 'superadmin' };
      tester = await new WrestlerTesterBuilder().enableUsers({ inviteOnly: true }).createUser(root).build();
      transporter = tester.getEmailTransporter();
      const rootToken = await tester.loginUser(root.email, root.password);
      sinon.spy(transporter, 'sendMail');
      const inviteResp = await tester.post('/user/invite', { email, role: 'user' }, rootToken);
      assert.equal(inviteResp.status, 201);
      inviteCode = await tester.getInviteCode(email);
      dbDriver = tester.getDatabaseDriver();
      sinon.stub(dbDriver, 'findOneAndUpdate').rejects('oops');
      resp = await tester.post('/user/invite-confirm', { email, password, inviteCode });
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

  context('with customized email', () => {

    describe('inviting a user', () => {

      it('sends a customized email message');

    });

  });

});
