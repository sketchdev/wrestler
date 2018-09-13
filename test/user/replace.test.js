const { WrestlerTesterBuilder } = require('../setup');
const { assert } = require('chai');

describe('replacing users', () => {

  let tester;

  beforeEach(async () => {
    tester = await new WrestlerTesterBuilder().enableUsers().build();
  });

  context('with default options', () => {

    it('fails always', async () => {
      await tester.dropUsers();
      const tom = await tester.createAndLoginUser('tom@mailinator.com', 'welcome@1');
      const resp = await tester.put(`/user/${tom.user.id}`, { age: 44 }, tom.token);
      assert.equal(resp.status, 405);
    });

  });

});
