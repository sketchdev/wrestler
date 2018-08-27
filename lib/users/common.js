const moment = require('moment');
const uuid = require('uuid/v4');
const _ = require('lodash');
const ValidationError = require('../errors').ValidationError;

exports.lookupUserByEmail = async (req, res, email, statusOrError) => {
  const user = await req.wrestler.dbDriver.findOne(req.wrestler.resource, { email });
  if (!user) {
    if (typeof statusOrError === 'number') {
      res.sendStatus(404);
      return undefined;
    } else {
      res.wrestler.errors = { email: { messages: [statusOrError] } };
      return new ValidationError();
    }
  }
};

exports.validateEmailUniqueness = async (req, email, errors) => {
  if (email && errors.email === undefined && (await req.wrestler.dbDriver.countDocuments(req.wrestler.resource, { email })) !== 0) {
    errors.email = { messages: ['Email already exists'] };
  }
};

exports.isUserRequest = (req) => {
  return req.wrestler.options.users && req.wrestler.resource === 'user';
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

exports.buildEmailCodeWithExpiry = (name) => {
  const result = {};
  result[`${name}Code`] = uuid();
  result[`${name}ExpiresAt`] = moment().add(1, 'hour').toDate();
  return result;
};
