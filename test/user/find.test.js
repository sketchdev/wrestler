const { WrestlerTesterBuilder } = require('../setup');
const { assert } = require('chai');

describe('finding users', () => {

  let tester;

  before(async () => {
    tester = await new WrestlerTesterBuilder().enableUsers().build();
  });

  context('with default options', () => {

    let sam, tom;

    beforeEach(async () => {
      await tester.dropUsers();
      tom = await tester.createAndLoginUser('tom@mailinator.com', 'welcome@1', { age: 40 });
    });

    describe('sending a good request for many', () => {

      let resp;

      beforeEach(async () => {
        resp = await tester.get('/user', tom.token);
      });

      it('returns the correct status code', async () => {
        assert.equal(resp.statusCode, 200);
      });

      it('returns an array of one item', async () => {
        assert.equal(resp.body.length, 1);
      });

      it('returns user details', async () => {
        assert.equal(resp.body[0].email, 'tom@mailinator.com');
        assert.equal(resp.body[0].age, 40);
        assert.exists(resp.body[0].createdAt);
        assert.exists(resp.body[0].updatedAt);
        assert.exists(resp.body[0].id);
      });

      it('omits sensitive details', async () => {
        assert.notExists(resp.body[0].password);
        assert.notExists(resp.body[0].confirmationCode);
        assert.notExists(resp.body[0].confirmed);
      });

    });

    describe('sending a good request for one', () => {

      let resp;

      beforeEach(async () => {
        resp = await tester.get(`/user/${tom.user.id}`, tom.token);
      });

      it('returns the correct status code', async () => {
        assert.equal(resp.statusCode, 200);
      });

      it('returns user details', async () => {
        assert.equal(resp.body.email, 'tom@mailinator.com');
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

    });

    describe('sending a bad requests', () => {

      beforeEach(async () => {
        await tester.dropUsers();
        sam = await tester.createUser('sam@mailinator.com', 'welcome@1');
        tom = await tester.createAndLoginUser('tom@mailinator.com', 'welcome@1', { age: 40 });
      });

      it('returns a not found if the user does not exist', async () => {
        const resp = await tester.get('/user/4', tom.token);
        assert.equal(resp.statusCode, 404);
      });

      it('returns an error if get user is not the person logged in', async () => {
        const resp = await tester.get(`/user/${sam.id}`, tom.token);
        assert.equal(resp.statusCode, 404);
      });

    });

  });

});
