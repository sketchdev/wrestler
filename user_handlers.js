/** @namespace req.body.passwordConfirmation */
/** @namespace req.headers.authorization */

const crypto = require('crypto');
const util = require('util');
const validator = require('validator');
const jwt = require('jsonwebtoken');
const jwtSign = util.promisify(jwt.sign);
const jwtVerify = util.promisify(jwt.verify);
const pbkdf2 = util.promisify(crypto.pbkdf2);
const { LoginError, CreateUserError, ReplaceUserError, UpdateUserError } = require('./errors');

const ITERATIONS = 10000;
const KEYLEN = 64;
const DIGEST = 'sha512';
const JWT_SECRET_KEY = process.env.JWT_SECRET_KEY || 'efwpoeiurpoijk123`3asd;lkj32E@#;l3kj3#Eeplk3j34fpoiu-Oiu;lkj';

exports.handleUserRequest = async (req, res, next) => {
  if (req.wrestler.options.handleUsers && req.resource === 'user') {
    try {
      await login(req, res);
      await handleGetRequest(req, res);
      await handlePostRequest(req, res);
      await handlePutRequest(req, res);
      await handlePatchRequest(req, res);
      await handleDeleteRequest(req, res);
    } catch (err) {
      return next(err);
    }
  }
  next();
};

const isCreateUser = (req) => {
  return req.method === 'POST' && req.path === '/user';
};

const isLogin = (req) => {
  return req.method === 'POST' && req.path === '/user/login';
};

exports.checkAuthentication = async (req, res, next) => {
  if (req.wrestler.options.handleUsers && !isCreateUser(req) && !isLogin(req)) {
    if (req.headers.authorization) {
      const [scheme, token] = req.headers.authorization.split(' ');
      if (scheme === 'Bearer') {
        const decoded = await jwtVerify(token, JWT_SECRET_KEY, { algorithms: 'HS512' });
        req.user.id = decoded.id;
        return next();
      }
    }
    res.sendStatus(401);
  }
  next();
};

exports.checkAuthorization = async (req, res, next) => {
  next();
};

const login = async (req, res) => {
  if (isLogin(req)) {
    const user = await req.db.collection(req.resource).findOne({ email: req.body.email });
    if (!user) {
      res.wrestler.errors = { base: { messages: ['Invalid email or password'] } };
      throw new LoginError();
    }
    const derivedKey = await pbkdf2(req.body.password, user.salt, user.iterations, user.keylen, user.digest);
    const passwordHash = derivedKey.toString('hex');
    if (passwordHash !== user.passwordHash) {
      res.wrestler.errors = { base: { messages: ['Invalid email or password'] } };
      throw new LoginError();
    }
    const token = await jwtSign({ id: user._id, email: user.email }, JWT_SECRET_KEY, { algorithms: 'HS512', expiresIn: '1h' });
    res.json({ token });
  }
};

const handleGetRequest = async (req, res) => {
  if (req.method === 'GET') {
    res.wrestler.transformer = transformMany;
  }
};

const handlePostRequest = async (req, res) => {
  if (isCreateUser(req)) {
    const { email, password } = req.body;
    req.body = sanitizeBody(req);

    const errors = validateUpsert(req, email, password);
    if (errors) throw new CreateUserError();

    const salt = crypto.randomBytes(128).toString('base64');
    const derivedKey = await pbkdf2(password, salt, ITERATIONS, KEYLEN, DIGEST);
    const passwordHash = derivedKey.toString('hex');
    req.body = Object.assign({}, req.body, { salt, iterations: ITERATIONS, keylen: KEYLEN, digest: DIGEST, passwordHash });

    // TODO: send email

    res.wrestler.transformer = transformOne;
  }
};

const handlePutRequest = async (req, res) => {
  if (req.method === 'PUT') {
    const { email, password, passwordConfirmation } = req.body;
    req.body = sanitizeBody(req);

    const errors = validateUpsert(req, email, password, passwordConfirmation);
    if (errors) throw new ReplaceUserError();

    // TODO: send email

    res.wrestler.transformer = transformOne;
  }
};

const handlePatchRequest = async (req, res) => {
  if (req.method === 'PATCH') {
    const { email } = req.body;
    req.body = sanitizeBody(req);

    const errors = validatePatch(req, email);
    if (errors) throw new UpdateUserError();

    // TODO: send email (if email or password is changed)

    res.wrestler.transformer = transformOne;
  }
};

const handleDeleteRequest = async (req, res) => {
  // TODO: cleanup child resources?
};

const sanitizeBody = (req) => {
  const body = Object.assign({}, req.body);
  if (!body.email) {
    delete body.email;
  }
  delete body.password;
  delete body.salt;
  delete body.iterations;
  delete body.keylen;
  delete body.digest;
  delete body.passwordHash;
  return body;
};

const validateUpsert = async (req, email, password) => {
  const errors = {};
  if (!email) {
    errors.email = { messages: ['Email is required'] };
  }
  if (email && !validator.isEmail(email)) {
    if (errors.email) {
      errors.email.messages.push('Email is invalid');
    } else {
      errors.email = { messages: ['Email is invalid'] };
    }
  }
  if (!password) {
    errors.password = { messages: ['Password is required'] };
  }
  if (email && errors.email === undefined && await req.db.collection(req.resource).countDocuments({ email }) !== 0) {
    errors.email = { messages: ['Email already exists'] };
  }
  return Object.keys(errors).length > 0 ? errors : undefined;
};

const validatePatch = async (req, email) => {
  const errors = {};
  if (email && !validator.isEmail(email)) {
    errors.email = { messages: ['Email is invalid'] };
  }
  if (email && errors.email === undefined && await req.db.collection(req.resource).countDocuments({ email }) !== 0) {
    errors.email = { messages: ['Email already exists'] };
  }
  return Object.keys(errors).length > 0 ? errors : undefined;
};

const transformMany = (entities) => {
  return entities.map(e => transformOne(e));
};

const transformOne = (doc) => {
  doc.id = doc._id;
  delete doc._id;
  delete doc.salt;
  delete doc.iterations;
  delete doc.keylen;
  delete doc.digest;
  delete doc.passwordHash;
  return doc;
};
