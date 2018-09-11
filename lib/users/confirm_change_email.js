const validator = require('validator');
const common = require('./common');
const validateEmailUniqueness = require('./common').validateEmailUniqueness;
const ValidationError = require('../errors').ValidationError;
const isUserRequest = require('./common').isUserRequest;
const MiddlewareStrategy = require('../strategy').MiddlewareStrategy;

exports.userConfirmChangeEmailHandler = async (req, res, next) => {
  await new MiddlewareStrategy(req, res, next)
    .add(shouldHandle)
    .add(parseBody)
    .add(validateRequest)
    .add(updateUser)
    .add(returnResponse)
    .run();
};

const shouldHandle = async (ctx, req) => {
  const isConfirmChangeEmail = isUserRequest(req) && req.method === 'POST' && req.path === '/user/confirm-change-email';
  if (!isConfirmChangeEmail) {
    ctx.stop();
  }
};

const parseBody = async (ctx, req) => {
  ctx.email = req.body.email;
  ctx.changeEmailCode = req.body.changeEmailCode;
};

const validateRequest = async (ctx, req, res) => {
  const errors = {};
  if (!ctx.email) {
    errors.email = { messages: ['Email is required'] };
  }
  if (ctx.email && !validator.isEmail(ctx.email)) {
    errors.email = { messages: ['Email is invalid'] };
  }
  if (!ctx.changeEmailCode) {
    errors.changeEmailCode = { messages: ['Change email code is required'] };
  }

  if (!errors.email && !errors.changeEmailCode) {
    const user = await req.wrestler.dbDriver.findOne(common.USER_COLLECTION_NAME, { newEmail: ctx.email });
    if (!user) {
      errors.email = { messages: ['Invalid email'] };
    } else {
      const now = new Date();
      if (ctx.changeEmailCode === user.changeEmailCode) {
        if (user.changeEmailExpiresAt <= now) {
          errors.changeEmailCode = { messages: ['Expired change email code'] };
        }
      } else {
        errors.changeEmailCode = { messages: ['Invalid change email code'] };
      }
      await validateEmailUniqueness(req, ctx.email, errors);
    }
  }

  if (Object.keys(errors).length > 0) {
    res.wrestler.errors = errors;
    return ctx.stop(new ValidationError());
  }
};

const updateUser = async (ctx, req) => {
  const { email } = req.wrestler.user;
  const { email: newEmail } = ctx;
  const doc = { changeEmailCode: null, changeEmailExpiresAt: null, email: newEmail };
  await req.wrestler.dbDriver.findOneAndUpdate(req.wrestler.resource, { email }, doc);
};

const returnResponse = async (ctx, req, res) => {
  res.sendStatus(200);
  req.wrestler.bypassRest = true;
};
