const validator = require('validator');
const validateEmailUniqueness = require('./common').validateEmailUniqueness;
const ValidationError = require('../errors').ValidationError;
const buildEmailCodeWithExpiry = require('./common').buildEmailCodeWithExpiry;
const buildEmail = require('./common').buildEmail;
const isUserRequest = require('./common').isUserRequest;
const Handler = require('./common').Handler;
const StepResult = require('./common').StepResult;

exports.userChangeEmailHandler = async (req, res, next) => {
  const handler = new Handler(req, res, next)
    .add(shouldHandle)
    .add(parseBody)
    .add(validateRequest)
    .add(updateUser)
    .add(sendEmail)
    .add(returnResponse);
  await handler.handle();
};

const shouldHandle = async (req) => {
  const shouldAdvance = isUserRequest(req) && req.method === 'POST' && req.path === '/user/change-email';
  return new StepResult(shouldAdvance);
};

const parseBody = async (req) => {
  this.email = req.body.email;
  return StepResult.Advance();
};

const validateRequest = async (req, res) => {
  const errors = {};
  if (!this.email) {
    errors.email = { messages: ['Email is required'] };
  }
  if (this.email && !validator.isEmail(this.email)) {
    errors.email = { messages: ['Email is invalid'] };
  }
  await validateEmailUniqueness(req, this.email, errors);
  if (Object.keys(errors).length > 0) {
    res.wrestler.errors = errors;
    return StepResult.Stop(new ValidationError());
  }
  return StepResult.Advance();
};

const updateUser = async (req) => {
  const { email } = req.wrestler.user;
  const { email: newEmail } = this;
  const { changeEmailCode, changeEmailExpiresAt } = buildEmailCodeWithExpiry('changeEmail');
  const doc = { changeEmailCode, changeEmailExpiresAt, newEmail };
  await req.wrestler.dbDriver.findOneAndUpdate(req.wrestler.resource, { email }, doc);
  this.changeEmailCode = changeEmailCode;
  return StepResult.Advance();
};

const sendEmail = async (req, res) => {
  const { email } = req.wrestler.user;
  const { changeEmailCode, email: newEmail } = this;
  const defaultSubject = 'Change your email';
  const defaultBody = 'You requested to change your email to {{newEmail}}. Your confirmation code is {{changeEmailCode}}';
  res.wrestler.email = buildEmail(req, 'changeEmail', email, defaultSubject, defaultBody, { changeEmailCode, newEmail });
  return StepResult.Advance();
};

const returnResponse = async (req, res) => {
  res.sendStatus(204);
  req.wrestler.bypassRest = true;
  return StepResult.Advance();
};
