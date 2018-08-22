// const { buildWrestler } = require('./setup');
//
// const sinon = require('sinon');
// const { assert } = require('chai');
// const nodemailer = require('nodemailer');
// const uuid = require('uuid/v4');
//
// describe('Registering users', () => {
//
//   let request, transporter, tom, sam;
//
//   before(() => {
//     const transport = { name: 'wrestler', version: '1', send: (mail, callback) => callback(null, { envelope: {}, messageId: uuid() }) };
//     transporter = nodemailer.createTransport(transport);
//     request = buildWrestler({ email: { transporter, register: { subject: 'Welcome!' }}})
//   });
//
//   beforeEach(async () => {
//     await testDb.dropCollections('user');
//     tom = (await request.post('/user').send({ email: 'tom@mailinator.com', password: 'welcome@1', age: 40 }).expect(201)).body;
//     sam = (await request.post('/user').send({ email: 'sam@mailinator.com', password: 'welcome@1', age: 20 }).expect(201)).body;
//   });
//
//   afterEach(async () => {
//     sinon.reset();
//   });
//
//   describe('POST /user', () => {
//
//     context('success', () => {
//
//       let resp;
//
//       beforeEach(async () => {
//         sinon.spy(transporter, 'sendMail');
//         resp = await request.post('/user').send({ email: 'bob@mailinator.com', password: 'welcome@1' });
//       });
//
//       afterEach(async () => {
//         assert.exists(resp.headers.location);
//         assert.equal(resp.body.email, 'bob@mailinator.com');
//         assert.notExists(resp.body.password);
//         assert.notExists(resp.body.confirmationCode);
//         assert.notExists(resp.body.confirmed);
//         assert.exists(resp.body.createdAt);
//         assert.exists(resp.body.updatedAt);
//         assert.exists(resp.body.id);
//         transporter.sendMail.restore();
//       });
//
//       it('returns the correct status code', async () => {
//         assert.equal(resp.statusCode, 201);
//       });
//
//       it('sends the default email', async () => {
//         assert.equal(transporter.sendMail.firstCall.args[0].subject, 'Welcome!');
//       });
//
//       it('sends a customized email');
//       it('blocks access to other resources until account is confirmed');
//       it('expires confirmation tokens after a period of time');
//
//     });
//
//     context('failure', () => {
//
//       it('returns an error if the user email already exists', async () => {
//         const resp = await request.post('/user').send({ email: 'tom@mailinator.com', password: 'welcome@1' }).expect(400);
//         assert.deepEqual(resp.body, { email: { messages: ['Email already exists'] } });
//       });
//
//       it('returns an error if no email is supplied', async () => {
//         const resp = await request.post('/user').send({ emale: 'bob@mailinator.com', password: 'welcome@1' }).expect(400);
//         assert.deepEqual(resp.body, { email: { messages: ['Email is required'] } });
//       });
//
//       it('returns an error if no password is supplied', async () => {
//         const resp = await request.post('/user').send({ email: 'bob@mailinator.com', passsword: 'welcome@1' }).expect(400);
//         assert.deepEqual(resp.body, { password: { messages: ['Password is required'] } });
//       });
//
//       it('returns an error if the email is invalid', async () => {
//         const resp = await request.post('/user').send({ email: 'bob@mailinator', password: 'welcome@1' }).expect(400);
//         assert.deepEqual(resp.body, { email: { messages: ['Email is invalid'] } });
//       });
//
//       it('returns an error if the database fails when detecting email uniqueness', async () => {
//         const resp = await request.post('/user').send({ email: 'tom@mailinator.com', password: 'welcome@1' }).expect(400);
//         assert.deepEqual(resp.body, { email: { messages: ['Email already exists'] } });
//       });
//
//     });
//
//   });
//
// });
