/** @namespace req.body.passwordConfirmation */
/** @namespace req.headers.authorization */

const crypto = require('crypto');
const util = require('util');
const validator = require('validator');
const jwt = require('jsonwebtoken');
const jwtSign = util.promisify(jwt.sign);
const jwtVerify = util.promisify(jwt.verify);
const pbkdf2 = util.promisify(crypto.pbkdf2);
const { LoginError } = require('./errors');

const ITERATIONS = 10000;
const KEYLEN = 64;
const DIGEST = 'sha512';
const JWT_SECRET_KEY = process.env.JWT_SECRET_KEY || 'efwpoeiurpoijk123`3asd;lkj32E@#;l3kj3#Eeplk3j34fpoiu-Oiu;lkj';

exports.handleUserRequest = async (req, res, next) => {
  if (req.wristrest.options.handleUsers && req.resource === 'user') {
    try {
      await login(req, res, next);
      await handleGetRequest(req, res, next);
      await handlePostRequest(req, res, next);
      await handlePutRequest(req, res, next);
      await handlePatchRequest(req, res, next);
      await handleDeleteRequest(req, res, next);
    } catch (err) {
      return next(err);
    }
  }
  next();
};

exports.checkAuthentication = async (req, res, next) => {
  if (req.wristrest.options.handleUsers) {
    if (req.headers.authorization) {
      const [scheme, token] = req.headers.authorization.split(' ');
      if (scheme === 'Bearer') {
        try {
          const decoded = await jwtVerify(token, JWT_SECRET_KEY, { algorithms: 'HS512' });
          req.user.id = decoded.id;
          return next();
        } catch (err) {
          return next(err);
        }
      }
    }
    res.sendStatus(401);
  } else {
    next();
  }
};

exports.checkAuthorization = async (req, res, next) => {
  next();
};

const login = async (req, res, next) => {
  const user = await req.db.collection(req.resource).findOne({ email: req.body.email });
  if (!user) {
    res.wristrest.errors = { base: { messages: ['Invalid email or password'] }};
    next(new LoginError(message));
  }
  const derivedKey = await pbkdf2(req.body.password, user.salt, user.iterations, user.keylen, user.digest);
  const passwordHash = derivedKey.toString('hex');
  if (passwordHash !== user.passwordHash) {
    res.wristrest.errors = { base: { messages: ['Invalid email or password'] }};
    next(new LoginError(message));
  }
  const token = await jwtSign({ id: user._id, email: user.email }, JWT_SECRET_KEY, { algorithms: 'HS512', expiresIn: '1h' });
  res.json({ token });
};

const handleGetRequest = async (req, res, next) => {
  res.wristrest.transformer = transformMany;
  next();
};

const handlePostRequest = async (req, res, next) => {
  if (req.method === 'POST') {
    const { email, password } = req.body;
    req.body = sanitizeBody(req);

    const fieldErrors = validateUpsert(req.db, email, password);
    if (fieldErrors.length > 0) {
      return next(fieldErrors);
    }

    const salt = crypto.randomBytes(128).toString('base64');
    const derivedKey = await pbkdf2(password, salt, ITERATIONS, KEYLEN, DIGEST);
    const passwordHash = derivedKey.toString('hex');
    req.body = Object.assign({}, req.body, { salt, iterations: ITERATIONS, keylen: KEYLEN, digest: DIGEST, passwordHash });

    // TODO: send email

    res.wristrest.transformer = transformOne;
    next();
  }
};

const handlePutRequest = async (req, res, next) => {
  if (req.method === 'PUT') {
    const { email, password, passwordConfirmation } = req.body;
    req.body = sanitizeBody(req);

    const fieldErrors = validateUpsert(req.db, email, password, passwordConfirmation);
    if (fieldErrors.length > 0) {
      return next(fieldErrors);
    }

    // TODO: send email

    res.wristrest.transformer = transformOne;
    next();
  }
};

const handlePatchRequest = async (req, res, next) => {
  if (req.method === 'PATCH') {
    const { email, password, passwordConfirmation } = req.body;
    req.body = sanitizeBody(req);

    const fieldErrors = validatePatch(req.db, email, password, passwordConfirmation);
    if (fieldErrors.length > 0) {
      return next(fieldErrors);
    }

    // TODO: send email (if email or password is changed)

    res.wristrest.transformer = transformOne;
    next();
  }
};

const handleDeleteRequest = async (req, res, next) => {
  // TODO: cleanup child resources?
  next();
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

const validateUpsert = async (db, email, password) => {
  const fieldErrors = [];
  if (!email) {
    fieldErrors.push({ code: -1001, field: 'email', message: 'Email is required' });
  }
  if (email && !validator.isEmail(email)) {
    fieldErrors.push({ code: -1005, field: 'email', message: 'Email is invalid' });
  }
  if (!password) {
    fieldErrors.push({ code: -1002, field: 'password', message: 'Password is required' });
  }
  if (email && await db.collection(req.resource).countDocuments({ email }) !== 0) {
    fieldErrors.push({ code: -1000, field: 'email', message: 'Email already exists' })
  }
  return fieldErrors;
};

const validatePatch = async (db, email, password) => {
  const fieldErrors = [];
  if (email && !validator.isEmail(email)) {
    fieldErrors.push({ code: -1005, field: 'email', message: 'Email is invalid' });
  }
  if (!password) {
    fieldErrors.push({ code: -1002, field: 'password', message: 'Password is required' });
  }
  if (email && await db.collection(req.resource).countDocuments({ email }) !== 0) {
    fieldErrors.push({ code: -1000, field: 'email', message: 'Email already exists' })
  }
  return fieldErrors;
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
