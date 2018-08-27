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

// add traditional express route methods to override Wrestler behavior
// just make sure to add the router before wrestler
app.get('/movies/:id', (req, res) => res.send('Hello World!'));

// `GET /movies/:id` is handled by the method above instead of Wrestler now
app.use(wrestler());

app.listen(PORT, () => console.log(`Listening on port ${PORT}...`));
