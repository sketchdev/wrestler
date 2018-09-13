require('dotenv').config();

(async () => {
  const PORT = process.env.PORT || 3000;
  const express = require('express');
  const logger = require('morgan');
  const Wrestler = require('../wrestler');

  const wrestler = new Wrestler();
  await wrestler.setup({ users: true });

  const app = express();
  app.set('trust proxy', 1); // trust first proxy
  app.use(logger('dev'));
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));

  app.use(wrestler.middleware());

  app.listen(PORT, () => console.log(`Listening on port ${PORT}...`));
})();
