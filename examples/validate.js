require('dotenv').config();

const express = require('express');
const logger = require('morgan');
const wrestler = require('../wrestler');

const PORT = process.env.PORT || 3000;

const app = express();
app.set('trust proxy', 1); // trust first proxy
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use(wrestler({
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
}));

app.listen(PORT, () => console.log(`Listening on port ${PORT}...`));
