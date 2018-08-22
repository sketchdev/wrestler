require('dotenv').config({ path: '.env.test' });

let db;

const initDatabase = async () => {
  const d = await require('../lib/db').connect();
  global.testDb = d;
  db = d;
};

(async () => {
  await initDatabase();
})().then(run);




const express = require('express');
const wrestler = require('../wrestler');
const supertest = require('supertest');
const nodemailer = require('nodemailer');
const uuid = require('uuid/v4');

exports.buildWrestler = (wrestlerOptions) => {
  const transport = { name: 'wrestler', version: '1', send: (mail, callback) => callback(null, { envelope: {}, messageId: uuid() }) };
  const transporter = nodemailer.createTransport(transport);

  const app = express();
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));
  app.use(wrestler(Object.assign({}, wrestlerOptions, { db, email: { transporter } })));

  return supertest(app);
};
