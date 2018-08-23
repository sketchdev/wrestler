const _ = require('lodash');
const { checkSchema, validationResult } = require('express-validator/check');
const { WhitelistError, ValidationError } = require('./errors');

exports.validateRequest = (config) => {
  const validators = {};
  const configResources = _.get(config, 'validation.resources', {});
  for (const [resourceName, rc] of Object.entries(configResources)) {
    validators[resourceName] = checkSchema(rc || {});
  }

  return async (req, res, next) => {
    const config = _.get(req, 'wrestler.options.validation.resources', {});
    const rc = config[req.resource];

    if (rc && (req.method === 'POST' || req.method === 'PUT')) {
      const mwa = validators[req.resource] || [];
      for (const mw of mwa) {
        await mw(req, res, () => {
        });
      }
    }
    next();
  };
};

exports.whitelist = (req, res, next) => {
  const config = _.get(req, 'wrestler.options.validation', {});
  if (config.whitelist && !config.resources[req.resource]) {
    let message = `${req.resource} is an unknown resource`;
    res.wrestler.errors = { base: { messages: [message] } };
    next(new WhitelistError(message));
  } else {
    next();
  }
};

exports.handleValidationErrors = (req, res, next) => {
  const result = validationResult(req);
  if (!result.isEmpty()) {
    const errors = {};
    for (const error of result.array()) {
      if (errors[error.param] === undefined) {
        errors[error.param] = { messages: [] }
      }

      errors[error.param].messages.push(error.msg);
    }

    res.wrestler.errors = errors;
    next(new ValidationError(`data for ${req.resource} is not valid`));
  } else {
    next();
  }
};
