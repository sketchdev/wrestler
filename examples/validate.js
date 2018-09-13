require('dotenv').config();

(async () => {
  const PORT = process.env.PORT || 3000;
  const express = require('express');
  const logger = require('morgan');
  const Wrestler = require('../wrestler');

  const wrestler = new Wrestler();
  await wrestler.setup({
    validation: {
      whitelist: true, // enables whitelisting resources
      resources: {
        movies: { // passing an object validates properties based on express-validator's schema validation
          name: { // refer to `https://express-validator.github.io/docs/schema-validation.html` for more details
            trim: true,
            isLength: { options: { min: 2 }, errorMessage: 'Must be at least two characters' },
          }
        }
      }
    }
  });

  const app = express();
  app.set('trust proxy', 1); // trust first proxy
  app.use(logger('dev'));
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));

  app.use(wrestler.middleware());

  app.listen(PORT, () => console.log(`Listening on port ${PORT}...`));
})();
