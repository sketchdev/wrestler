#!/usr/bin/env node

require('dotenv').config();

const express = require('express');
const logger = require('morgan');
const wrestler = require('./wrestler');

const PORT = process.env.PORT || 3000;

const app = express();
app.set('trust proxy', 1); // trust first proxy
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(wrestler());
app.listen(PORT, () => console.log(`Listening on port ${PORT}...`));
