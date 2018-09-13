// const { WrestlerTesterBuilder } = require('../setup');
// const { assert } = require('chai');
//
// describe('testing knex/postgres', () => {
//
//   let tester;
//
//   beforeEach(async () => {
//     const machineName = process.env.PG_MACHINE;
//     const dbName = process.env.PG_DB_NAME;
//     tester = await new WrestlerTesterBuilder({ database: { pgConnectionString: `postgresql://${machineName}:@localhost/${dbName}` } }).build();
//     await tester.clean('cars');
//   });
//
//   describe('finding multiple', () => {
//
//     let resp;
//
//     beforeEach(async () => {
//       resp = await tester.get('/cars?sort=year,-model');
//     });
//
//     it('returns the correct status code', async () => {
//       console.log(resp.body);
//       assert.equal(resp.statusCode, 200);
//     });
//
//   });
//
//   describe('finding one', () => {
//
//     let resp;
//
//     beforeEach(async () => {
//       const createResp = await tester.post('/cars', { year: 2013, make: 'Honda', model: 'CR-V' });
//       console.log(createResp.body.id);
//       console.log(createResp.status);
//       assert.equal(createResp.status, 201);
//       resp = await tester.get(`/cars/${createResp.body.id}`);
//     });
//
//     it('returns the correct status code', async () => {
//       console.log(resp.body);
//       assert.equal(resp.statusCode, 200);
//     });
//
//   });
//
//   describe('insert one', () => {
//
//     let resp;
//
//     beforeEach(async () => {
//       resp = await tester.post('/cars', { year: 2013, make: 'Honda', model: 'CR-V' });
//     });
//
//     it('returns the correct status code', async () => {
//       console.log(resp.body);
//       assert.equal(resp.statusCode, 201);
//     });
//
//   });
//
//   describe('patch', () => {
//
//     let resp;
//
//     beforeEach(async () => {
//       const createResp = await tester.post('/cars', { year: 2013, make: 'Honda', model: 'CR-V' });
//       assert.equal(createResp.status, 201);
//       resp = await tester.patch(`/cars/${createResp.body.id}`, { year: 2014 });
//     });
//
//     it('returns the correct status code', async () => {
//       console.log(resp.body);
//       assert.equal(resp.statusCode, 200);
//       assert.equal(resp.body.year, 2014);
//     });
//
//   });
//
//   describe('delete', () => {
//
//     let resp, createResp;
//
//     beforeEach(async () => {
//       createResp = await tester.post('/cars', { year: 2013, make: 'Honda', model: 'CR-V' });
//       assert.equal(createResp.status, 201);
//       const findResp = await tester.get(`/cars/${createResp.body.id}`);
//       assert.equal(findResp.body.year, createResp.body.year);
//       resp = await tester.delete(`/cars/${createResp.body.id}`);
//     });
//
//     it('returns the correct status code', async () => {
//       console.log(resp.body);
//       assert.equal(resp.statusCode, 204);
//       const findResp = await tester.get(`/cars/${createResp.body.id}`);
//       assert.equal(findResp.status, 404);
//     });
//
//   });
//
//   describe('count', () => {
//
//     let resp;
//
//     beforeEach(async () => {
//       const createResp = await tester.post('/cars', { year: 2013, make: 'Honda', model: 'CR-V' });
//       assert.equal(createResp.status, 201);
//       resp = await tester.getDatabaseDriver().countBy('cars', {});
//     });
//
//     it('returns the correct status code', async () => {
//       console.log(resp);
//       assert.equal(resp, 1);
//     });
//
//   });
//
// });
