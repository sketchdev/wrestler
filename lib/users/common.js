const moment = require('moment');
const uuid = require('uuid/v4');
const _ = require('lodash');
const UnknownError = require('../errors').UnknownError;
const ValidationError = require('../errors').ValidationError;

exports.StepResult = class StepResult {
  constructor(advance, error) {
    this.advance = advance;
    this.error = error;
  }
  static Advance() {
    return new StepResult(true);
  }
  static Stop(error) {
    return new StepResult(false, error);
  }
  hasError() {
    return !!this.error;
  }
  shouldStop() {
    return !this.advance;
  }
};

exports.Handler = class Handler {
  constructor(req, res, next) {
    this.req = req;
    this.res = res;
    this.next = next;
    this.steps = [];
  }

  add(step) {
    this.steps.push(step);
    return this;
  }

  async handle() {
    try {
      let result;
      const ctx = {};
      for (const step of this.steps) {
        result = await step.call(ctx, this.req, this.res);
        if (result.shouldStop()) break;
      }
      if (result.hasError()) {
        this.next(result.error);
      } else if (!this.req.headersSent) {
        this.next();
      }
    } catch (err) {
      if (process.env.NODE_ENV !== 'test') console.error(err);
      this.res.wrestler.errors = { base: { messages: ['Unexpected error'] } };
      this.next(new UnknownError());
    }
  }
};

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
