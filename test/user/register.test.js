const { WrestlerTesterBuilder } = require('../setup');
const sinon = require('sinon');
const { assert } = require('chai');

describe('registering users', () => {

  let tester, transporter;

  before(() => {
    tester = new WrestlerTesterBuilder().setEmailRegisterSubject('Welcome!').enableUsers().build();
    transporter = tester.getEmailTransporter();
  });

  context('with default options', () => {

    describe('sending a good request', () => {

      let resp;

      beforeEach(async () => {
        await tester.dropUsers();
        sinon.spy(transporter, 'sendMail');
        resp = await tester.post('/user', { email: 'bob@mailinator.com', password: 'welcome@1', age: 40 });
      });

      afterEach(async () => {
        transporter.sendMail.restore();
      });

      it('returns the correct status code', async () => {
        assert.equal(resp.statusCode, 201);
      });

      it('returns a location header', async () => {
        assert.equal(resp.headers.location, `/user/${resp.body.id}`);
      });

      it('returns user details', async () => {
        assert.equal(resp.body.email, 'bob@mailinator.com');
        assert.equal(resp.body.age, 40);
        assert.exists(resp.body.createdAt);
        assert.exists(resp.body.updatedAt);
        assert.exists(resp.body.id);
      });

      it('omits sensitive details', async () => {
        assert.notExists(resp.body.password);
        assert.notExists(resp.body.confirmationCode);
        assert.notExists(resp.body.confirmed);
      });

      it('sends an email', async () => {
        assert.exists(transporter.sendMail.firstCall);
      });

      it('blocks access to other resources until account is confirmed');
      it('expires confirmation tokens after a period of time');

    });

    describe('sending bad requests', () => {

      beforeEach(async () => {
        await tester.dropUsers();
      });

      it('returns an error if the user email already exists', async () => {
        await tester.createUser('tom@mailinator.com', 'welcome@1');
        const resp = await tester.post('/user', { email: 'tom@mailinator.com', password: 'welcome@1' });
        assert.equal(resp.statusCode, 422);
        assert.deepEqual(resp.body, { email: { messages: ['Email already exists'] } });
      });

      it('returns an error if no email is supplied', async () => {
        const resp = await tester.post('/user', { emale: 'bob@mailinator.com', password: 'welcome@1' });
        assert.equal(resp.statusCode, 422);
        assert.deepEqual(resp.body, { email: { messages: ['Email is required'] } });
      });

      it('returns an error if no password is supplied', async () => {
        const resp = await tester.post('/user', { email: 'bob@mailinator.com', passsword: 'welcome@1' });
        assert.equal(resp.statusCode, 422);
        assert.deepEqual(resp.body, { password: { messages: ['Password is required'] } });
      });

      it('returns an error if the email is invalid', async () => {
        const resp = await tester.post('/user', { email: 'bob@mailinator', password: 'welcome@1' });
        assert.equal(resp.statusCode, 422);
        assert.deepEqual(resp.body, { email: { messages: ['Email is invalid'] } });
      });

    });

  });

  context('with customized email', () => {

    describe('creating a user', () => {

      it('sends a customized email message');

    });

  });

});