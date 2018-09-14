require('dotenv').config();

(async () => {
  const PORT = process.env.PORT || 3000;
  const express = require('express');
  const logger = require('morgan');
  const Wrestler = require('../wrestler');
  const wrestler = new Wrestler();
  await wrestler.setup({
    users: {
      allow: [
        // allow admins to do anything to users
        { roles: ['admin'], resource: 'user', methods: '*' },
        // allow anyone to create a user (but the auth function forces the `guest` role)
        { roles: '*', resource: 'user', methods: ['POST'] },
        // allow guests to read, update, and delete users but only their own user
        { roles: ['guest'], resource: 'user', methods: ['GET', 'PATCH', 'DELETE'], onlyOwned: true },
        // allow admins to do anything to widgets
        { roles: ['admin'], resource: 'widgets', methods: '*' },
        // allow guests to read any widgets
        { roles: ['guest'], resource: 'widgets', methods: ['GET'] },
        // allow anybody to do anything with any foo that they own
        { roles: '*', resource: 'foo', methods: '*', onlyOwned: true },
      ],
      authorization: (req) => {
        // only handle the POST /user scenario
        if (req.method !== 'POST' || req.wrestler.resource !== 'user') return;
        // force the `guest` role if either no user is authenticated, or a non-admin user is authenticated
        if (!req.session || !req.session.user || req.session.user.role !== 'admin') {
          req.body = Object.assign({}, req.body, { role: 'guest' });
        }
      }
    }
  });

  // create a default admin user at startup
  await wrestler.createUserIfNotExist({ email: 'demo@mailinator.com', password: 'welcome@1', role: 'admin' });

  const app = express();
  app.set('trust proxy', 1); // trust first proxy
  app.use(logger('dev'));
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));

  app.use(wrestler.middleware());

  app.listen(PORT, () => console.log(`Listening on port ${PORT}...`));
})();
