const moment = require('moment');
const uuid = require('uuid');
const _ = require('lodash');
const crypto = require('crypto');
const util = require('util');
const pbkdf2 = util.promisify(crypto.pbkdf2);

const ITERATIONS = 10000;
const KEYLEN = 64;
const DIGEST = 'sha512';

// TODO: also export the user endpoint path (/user) and eliminate the "magic" word elsewhere
const USER_COLLECTION_NAME = exports.USER_COLLECTION_NAME = 'user';

exports.JWT_SECRET_KEY = process.env.JWT_SECRET_KEY || 'efwpoeiurpoijk123`3asd;lkj32E@#;l3kj3#Eeplk3j34fpoiu-Oiu;lkj';

exports.validateEmailUniqueness = async (req, email, errors) => {
  if (email && errors.email === undefined && +(await req.wrestler.dbDriver.countBy(req.wrestler.resource, { email })) !== 0) {
    errors.email = { messages: ['Email already exists'] };
  }
};

exports.isUserRequest = (req) => {
  return req.wrestler.options.users && req.wrestler.resource === USER_COLLECTION_NAME;
};

exports.buildEmail = (req, type, to, defaultSubject, defaultBody, tokens) => {
  const result = {};
  result.from = _.get(req, 'wrestler.options.email.from', 'no-reply@wrestlerjs.com');
  result.to = to;
  result.subject = _.get(req, `wrestler.options.email.${type}.subject`, defaultSubject);
  result.text = _.get(req, `wrestler.options.email.${type}.text`, defaultBody);

  for (const [token, value] of Object.entries(tokens)) {
    result.subject = result.subject.replace(`{{${token}}}`, value);
    result.text = result.text.replace(`{{${token}}}`, value);
  }

  return result;
};

exports.buildEmailCodeWithExpiry = (name, expireDuration = 1, expireUnit = 'hour') => {
  const result = {};
  result[`${name}Code`] = uuid.v4();
  result[`${name}ExpiresAt`] = moment().add(expireDuration, expireUnit).toDate();
  return result;
};

exports.randomPassword = () => {
  return uuid.v4();
};

exports.hashPassword = async (doc, password) => {
  const salt = crypto.randomBytes(128).toString('base64');
  const derivedKey = await pbkdf2(password, salt, ITERATIONS, KEYLEN, DIGEST);
  const passwordHash = derivedKey.toString('hex');
  return Object.assign({}, doc, { passwordHash, salt, iterations: ITERATIONS, keylen: KEYLEN, digest: DIGEST });
};

exports.hashPasswordFromUser = async (user, password) => {
  const derivedKey = await pbkdf2(password, user.salt, user.iterations, user.keylen, user.digest);
  return derivedKey.toString('hex');
};
