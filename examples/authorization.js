require('dotenv').config();

(async () => {
  const PORT = process.env.PORT || 3000;
  const express = require('express');
  const logger = require('morgan');
  const wrestler = require('../wrestler');
  const api = await wrestler.setup({
    users: {
      allow: [
        { roles: ['appAdmin', 'admin'], resource: 'user', methods: '*' },
        { roles: ['appAdmin', 'admin'], resource: 'widgets', methods: '*' },
        { roles: ['guest'], resource: 'user', methods: '*', onlyOwned: true },
        { roles: ['guest'], resource: 'widgets', methods: ['GET'] },
        { roles: ['guest'], resource: 'widgets', methods: ['PUT', 'PATCH', 'POST', 'DELETE'], onlyOwned: true },
      ],
      authorization: (req, res) => {
        // is the current request `POST /user`?
        if (req.method !== 'POST' && req.wrestler.resource !== 'user') {
          // nope, these aren't the droids you're looking for
          return;
        }
        // yes. did the user pass a valid authorization token?
        // note: the authorization function is executed after authentication
        if (req.session && req.session.user) {
          // yes, is the user a appAdmin or admin?
          if (['appAdmin', 'admin'].includes(req.session.user.role)) {
            // yes, allow the user to create a new user as requested
          } else {
            // no, the user is not a appAdmin or admin.
            // return a forbidden status code because we don't want non-admins to be
            // able to create another user
            res.sendStatus(403);
          }
        } else {
          // no, the user did not pass an authorization token
          // allow the user to create themselves; however, make sure the role is always a `guest`
          req.body = Object.assign({}, req.body, { role: 'guest' });
        }
      }
    }
  });

  // create a default appAdmin user at startup
  await wrestler.createUserIfNotExist({ email: 'demo@mailinator.com', password: 'welcome@1', role: 'appAdmin' });

  const app = express();
  app.set('trust proxy', 1); // trust first proxy
  app.use(logger('dev'));
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));

  app.use(api);

  app.listen(PORT, () => console.log(`Listening on port ${PORT}...`));
})();
