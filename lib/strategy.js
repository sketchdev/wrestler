'use strict';

const UnknownError = require('./errors').UnknownError;

class Context {

  constructor() {
    this.advance = true;
    this.error = undefined;
  }

  stop(error) {
    this.advance = false;
    this.error = error;
  }

  hasError() {
    return !!this.error;
  }

  shouldStop() {
    return !this.advance;
  }

}

class MiddlewareStrategy {

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

  async run() {
    try {
      const ctx = await executeSteps(this.steps, this.req, this.res);
      if (ctx.hasError()) {
        this.next(ctx.error);
      } else if (!this.req.headersSent) {
        this.next();
      }
    } catch (err) {
      if (process.env.NODE_ENV !== 'test') console.error(err);
      this.res.wrestler.errors = { base: { messages: ['Unexpected error'] } };
      this.next(new UnknownError());
    }
  }

}

const executeSteps = async (steps, req, res) => {
  const ctx = new Context();
  for (const step of steps) {
    await step.call(null, ctx, req, res);
    if (ctx.shouldStop()) break;
  }
  return ctx;
};

exports.MiddlewareStrategy = MiddlewareStrategy;
