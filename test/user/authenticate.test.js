const common = require('../../lib/users/common');
const { WrestlerTesterBuilder } = require('../setup');
const jwtHelper = require('../jwt_helper');
const { assert } = require('chai');
const util = require('util');
const jwt = require('jsonwebtoken');
const jwtSign = util.promisify(jwt.sign);
const JWT_SECRET_KEY = require('../../lib/users/common').JWT_SECRET_KEY;

describe('authenticating users', () => {

  let tester;

  context('with default options', () => {

    beforeEach(async () => {
      tester = await new WrestlerTesterBuilder().enableUsers().build();
      await tester.dropWidgets();
      await tester.dropUsers();
      await tester.createUser('tom@mailinator.com', 'welcome@1');
    });

    describe('sending a good request', () => {

      let resp;

      beforeEach(async () => {
        resp = await tester.post('/user/login', { email: 'tom@mailinator.com', password: 'welcome@1' });
      });

      it('returns the correct status code', async () => {
        assert.equal(resp.status, 200);
      });

      it('returns a login token', async () => {
        assert.exists(resp.body.token);
      });

    });

    describe('creating a user at startup', () => {

      let tester;
      const user = { email: 'root@mailinator.com', password: 'welcome@1', role: 'superadmin' };

      beforeEach(async () => {
        tester = await new WrestlerTesterBuilder().enableUsers().createUser(user).build();
      });

      it('authenticates the user', async () => {
        const resp = await tester.post('/user/login', user);
        assert.equal(resp.status, 200);
      });

      it('saves additional properties', async () => {
        const dbUser = await tester.getDatabaseDriver().findOne(common.USER_COLLECTION_NAME, { email: user.email });
        assert.equal(dbUser.role, user.role);
      });

      it('returns unauthorized if the password is incorrect', async () => {
        const resp = await tester.post('/user/login', { email: user.email, password: 'abc' });
        assert.equal(resp.status, 401);
      })

    });

    describe('login token expiration', () => {

      it('expires login tokens after a period of time');

    });

    describe('sending bad requests', () => {

      it('returns an error if the email is not found', async () => {
        const resp = await tester.post('/user/login', { email: 'thomas@mailinator.com', password: 'welcome@2' });
        assert.equal(resp.status, 401);
        assert.deepEqual(resp.body, { base: { messages: ['Invalid email or password'] } });
      });

      it('returns an error if credentials are incorrect', async () => {
        const resp = await tester.post('/user/login', { email: 'tom@mailinator.com', password: 'welcome@2' });
        assert.equal(resp.status, 401);
        assert.deepEqual(resp.body, { base: { messages: ['Invalid email or password'] } });
      });

      it('requires authentication to other resources', async () => {
        const resp = await tester.get('/widget');
        assert.equal(resp.status, 401);
      });

      it('returns an error if the jwt user is not found', async () => {
        const id = process.env.PG_CONNECTION_STRING ? 9999999 : 'blah';
        const token = await jwtSign({ id }, JWT_SECRET_KEY, { algorithm: 'HS512', expiresIn: '1h' });
        const resp = await tester.get('/widget', token);
        assert.equal(resp.status, 403);
      });

    });

    describe('authenticating with jwt', () => {

      let tom;

      context('when jwt is valid', () => {

        beforeEach(async () => {
          tom = await tester.createAndLoginUser('tomjwt@mailinator.com', 'welcome@1');
        });

        describe('making an authenticated request', () => {

          it('has a token that expires in 1hr', () => {
            const epochTime = jwtHelper.getEpochTime();
            const tomPayload = jwtHelper.getJwtPayload(tom.token);
            assert.equal(tomPayload.exp, epochTime + 3600);
          });

          it('returns 200', async () => {
            resp = await tester.patch(`/user/${tom.user.id}`, { age: 41 }, tom.token);
            assert.equal(resp.status, 200);
          });

        });

      });

      context('when jwt is expired', () => {

        let expiredToken;

        beforeEach(async () => {
          tom = await tester.createAndLoginUser('tomjwt_old@mailinator.com', 'welcome@1');
          const epochTime = Math.floor(Date.now() / 1000);
          expiredToken = await jwtSign({...tom.user, iat: epochTime - 600, exp: epochTime - 330}, JWT_SECRET_KEY, { algorithm: 'HS512' });
        });

        describe('making an authenticated request', () => {

          it('returns 401', async () => {
            const resp = await tester.patch(`/user/${tom.user.id}`, { age: 41 }, expiredToken);
            assert.equal(resp.status, 401);
          });

        });

      });

    });

  });

  context('with custom jwt options', () => {

    beforeEach(async () => {
      tester = await new WrestlerTesterBuilder({ jwtTimeout: '12h' }).enableUsers().build();
      await tester.dropWidgets();
      await tester.dropUsers();
      await tester.createUser('tom@mailinator.com', 'welcome@1');
    });

    describe('authenticating with jwt', () => {

      let tom;

      context('when jwt is valid', () => {

        beforeEach(async () => {
          tom = await tester.createAndLoginUser('tomjwt@mailinator.com', 'welcome@1');
        });

        describe('making an authenticated request', () => {

          it('has a token that expires in 12hrs', () => {
            const epochTime = jwtHelper.getEpochTime();
            const tomPayload = jwtHelper.getJwtPayload(tom.token);
            assert.equal(tomPayload.exp, epochTime + 43200);
          });

          it('returns 200', async () => {
            resp = await tester.patch(`/user/${tom.user.id}`, { age: 41 }, tom.token);
            assert.equal(resp.status, 200);
          });

        });

      });

    });

  });

});
