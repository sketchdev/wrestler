const { WrestlerTesterBuilder } = require('../setup');
const { assert } = require('chai');

describe('whitelisting resources', () => {

  let tester;

  before(async () => {
    tester = await new WrestlerTesterBuilder().enableValidation({
      whitelist: true,
      resources: { widget: true }
    }).build();
  });

  beforeEach(async () => {
    await tester.dropWidgets();
  });

  it('allows creating a widget', async () => {
    const resp = await tester.post('/widget', { name: 'coconut', company: 'acme' });
    assert.equal(resp.status, 201);
  });

  it('rejects creating a thing', async () => {
    const resp = await tester.post('/thing', { title: 'something' });
    assert.equal(resp.status, 404);
  });

});
