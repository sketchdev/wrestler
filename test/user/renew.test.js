const common = require('../../lib/users/common');
const { WrestlerTesterBuilder } = require('../setup');
const jwtHelper = require('../jwt_helper');
const { assert } = require('chai');
const util = require('util');
const jwt = require('jsonwebtoken');
const jwtSign = util.promisify(jwt.sign);
const JWT_SECRET_KEY = require('../../lib/users/common').JWT_SECRET_KEY;

describe('renewing user jwt', () => {

  let tester;

  beforeEach(async () => {
    tester = await new WrestlerTesterBuilder().enableUsers().build();
    await tester.dropWidgets();
    await tester.dropUsers();
  });

  context('with default options', () => {

    let tom;

    beforeEach(async () => {
      tom = await tester.createAndLoginUser('tomjwt@mailinator.com', 'welcome@1');
    });

    it('ensures expired tokens are rejected', async () => {
      const epochTime = jwtHelper.getEpochTime();
      const expiredToken = await jwtSign({...tom.user, iat: epochTime - 600, exp: epochTime - 330}, JWT_SECRET_KEY, { algorithm: 'HS512' });
      const resp = await tester.patch(`/user/${tom.user.id}`, { age: 41 }, expiredToken);
      assert.equal(resp.status, 401);
    });

    it('ensures valid tokens are accepted', async () => {
      resp = await tester.patch(`/user/${tom.user.id}`, { age: 41 }, tom.token);
      assert.equal(resp.status, 200);
    });

    describe('refresh token', () => {

      context('with expired token', () => {

        let expiredToken;

        beforeEach(async () => {
          const epochTime = jwtHelper.getEpochTime();
          expiredToken = await jwtSign({...tom.user, iat: epochTime - 600, exp: epochTime - 330}, JWT_SECRET_KEY, { algorithm: 'HS512' });
        });

        it('rejects request for refresh', async () => {
          const resp = await tester.post(`/user/refresh-token`, {}, expiredToken);
          assert.equal(resp.status, 401);
        });

      });

      context('with valid token', () => {

        let nearExpirationToken;

        beforeEach(async () => {
          const epochTime = jwtHelper.getEpochTime();
          nearExpirationToken = await jwtSign({...tom.user, iat: epochTime - 3600, exp: epochTime + 330}, JWT_SECRET_KEY, { algorithm: 'HS512' });
        });

        it('accepts request for refresh', async () => {
          const resp = await tester.post(`/user/refresh-token`, {}, nearExpirationToken);
          assert.equal(resp.status, 200);
        });

        it('responds with new token', async () => {
          const tokenRequestTime = jwtHelper.getEpochTime();
          const resp = await tester.post(`/user/refresh-token`, {}, nearExpirationToken);
          const newUserToken = resp.body.token
          const payload = jwtHelper.getJwtPayload(newUserToken);

          assert.notEqual(newUserToken, nearExpirationToken);

          // assert refreshed token was created just now and expires an hour from now
          const { iat, exp } = payload;
          assert.equal(iat, tokenRequestTime);
          assert.equal(exp, tokenRequestTime + 3600);
        });

        it('allows authenticating with new token', async () => {
          const resp = await tester.post(`/user/refresh-token`, {}, nearExpirationToken);
          const newUserToken = resp.body.token

          const newTokenResp = await tester.get('/widget', newUserToken);
          assert.equal(newTokenResp.status, 200);
        });

      });

    });

  });

});
