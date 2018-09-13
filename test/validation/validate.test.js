const { WrestlerTesterBuilder } = require('../setup');
const { assert } = require('chai');

describe('validating resources', () => {

  let tester;

  beforeEach(async () => {
    tester = await new WrestlerTesterBuilder().enableValidation({
      resources: {
        widget: {
          name: {
            isLength: { options: { min: 2 }, errorMessage: 'must be at least two characters' },
            isEmpty: { negated: true, errorMessage: 'required' },
            optional: false,
          }
        }
      }
    }).build();
    await tester.dropWidgets();
  });

  it('creates a widget', async () => {
    const resp = await tester.post('/widget', { name: 'coconut', company: 'acme' });
    assert.equal(resp.status, 201);
  });

  it('returns an error when name is too short', async () => {
    const resp = await tester.post('/widget', { name: 'c' });
    assert.equal(resp.status, 422);
    assert.deepEqual(resp.body, { name: { messages: ['must be at least two characters'] } });
  });

  it('returns an error when name is missing', async () => {
    const resp = await tester.post('/widget', { company: 'acme' });
    assert.equal(resp.status, 422);
    assert.deepEqual(resp.body, { name: { messages: ['must be at least two characters', 'required'] } });
  });

  it('returns an error when name is empty', async () => {
    const resp = await tester.post('/widget', { name: '', company: 'acme' });
    assert.equal(resp.status, 422);
    assert.deepEqual(resp.body, { name: { messages: ['must be at least two characters', 'required'] } });
  });

});
