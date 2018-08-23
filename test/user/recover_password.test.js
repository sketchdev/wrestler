const { WrestlerTesterBuilder } = require('../setup');

describe('recovering passwords', () => {

  let tester;

  before(() => {
    tester = new WrestlerTesterBuilder().enableUsers().build();
  });

  context('with default options', () => {

    describe('requesting a recovery token', () => {

      it('returns the correct status code');
      it('always returns a success status code even if the user email does not exist');
      it('sends a recovery email to the user only if the user email exists');
      it('returns an error if no email is supplied');

    });

    describe('using the recovery token', () => {

      it('returns the correct status code');
      it('authenticates with the new password');

    });

  });

});
