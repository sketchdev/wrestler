const validator = require('validator');
const validateEmailUniqueness = require('./common').validateEmailUniqueness;
const ValidationError = require('../errors').ValidationError;
const buildEmailCodeWithExpiry = require('./common').buildEmailCodeWithExpiry;
const buildEmail = require('./common').buildEmail;
const isUserRequest = require('./common').isUserRequest;
const MiddlewareStrategy = require('../strategy').MiddlewareStrategy;

exports.userChangeEmailHandler = async (req, res, next) => {
  await new MiddlewareStrategy(req, res, next)
    .add(shouldHandle)
    .add(parseBody)
    .add(validateRequest)
    .add(updateUser)
    .add(sendEmail)
    .add(returnResponse)
    .run();
};

const shouldHandle = async (ctx, req) => {
  const isChangeEmail = isUserRequest(req) && req.method === 'POST' && req.path === '/user/change-email';
  if (!isChangeEmail) {
    ctx.stop();
  }
};

const parseBody = async (ctx, req) => {
  ctx.email = req.body.email;
};

const validateRequest = async (ctx, req, res) => {
  const errors = {};
  if (!ctx.email) {
    errors.email = { messages: ['Email is required'] };
  }
  if (ctx.email && !validator.isEmail(ctx.email)) {
    errors.email = { messages: ['Email is invalid'] };
  }
  await validateEmailUniqueness(req, ctx.email, errors);
  if (Object.keys(errors).length > 0) {
    res.wrestler.errors = errors;
    return ctx.stop(new ValidationError());
  }
};

const updateUser = async (ctx, req) => {
  const { email } = req.wrestler.user;
  const { email: newEmail } = ctx;
  const { changeEmailCode, changeEmailExpiresAt } = buildEmailCodeWithExpiry('changeEmail');
  const doc = { changeEmailCode, changeEmailExpiresAt, newEmail };
  await req.wrestler.dbDriver.findOneAndUpdate(req.wrestler.resource, { email }, doc);
  ctx.changeEmailCode = changeEmailCode;
};

const sendEmail = async (ctx, req, res) => {
  const { email } = req.wrestler.user;
  const { changeEmailCode, email: newEmail } = ctx;
  const defaultSubject = 'Change your email';
  const defaultBody = 'You requested to change your email to {{newEmail}}. Your confirmation code is {{changeEmailCode}}';
  res.wrestler.email = buildEmail(req, 'changeEmail', email, defaultSubject, defaultBody, { changeEmailCode, newEmail });
};

const returnResponse = async (ctx, req, res) => {
  res.sendStatus(204);
  req.wrestler.bypassRest = true;
};
