const _ = require('lodash');

exports.handleRestfulGetRequest = async (req, res, next) => {
  try {
    if (req.method === 'GET') {
      const { projection, projectionQuery } = projectionFromQuery(req);
      if (req.wrestler.id) {
        const filter = { id: req.wrestler.id };
        const entity = await req.wrestler.dbDriver.findOne(req.wrestler.resource, filter, { projection });
        if (entity) {
          const result = res.wrestler.transformer ? res.wrestler.transformer(entity) : entity;
          return res.json(result);
        } else {
          return res.sendStatus(404);
        }
      } else {
        const { sort, sortQuery } = sortFromQuery(req);
        const limit = limitFromQuery(req);
        const skip = skipFromQuery(req);
        const filter = req.query;
        const docs = await req.wrestler.dbDriver.find(req.wrestler.resource, filter, projection, { sort, limit: limit + 1, skip });
        const results = res.wrestler.transformer ? res.wrestler.transformer(docs) : docs;
        const links = linksFromResult(req, req.wrestler.resource, results, projectionQuery, sortQuery, limit, skip);
        if (results.length < limit) {
          return res.links(links).json(results);
        }
        results.pop();
        return res.links(links).json(results);
      }
    }
    next();
  } catch (err) {
    next(err);
  }
};

exports.handleRestfulPostRequest = async (req, res, next) => {
  try {
    if (req.method === 'POST' && !req.wrestler.bypassRest) {
      if (req.wrestler.id) {
        return res.sendStatus(400);
      }
      delete req.body.id;
      const now = new Date();
      const doc = appendCreatedBy(req, Object.assign(req.body, { createdAt: now, updatedAt: now }));
      const insertedDoc = await req.wrestler.dbDriver.insertOne(req.wrestler.resource, doc);
      const result = res.wrestler.transformer ? res.wrestler.transformer(insertedDoc) : insertedDoc;
      res.location(`/${req.wrestler.resource}/${result.id}`).status(201).json(result);
    }
    next();
  } catch (err) {
    next(err);
  }
};

exports.handleRestfulPutRequest = async (req, res, next) => {
  try {
    if (req.method === 'PUT') {
      if (req.wrestler.id === undefined) {
        return res.sendStatus(400);
      }
      delete req.body.id;
      delete req.body.createdBy;
      delete req.body.createdAt;
      const now = new Date();
      const doc = appendUpdatedBy(req, Object.assign({}, req.body, { createdAt: now, updatedAt: now }));
      const filter = appendFilter(req, { id: req.wrestler.id });
      const replacedDoc = await req.wrestler.dbDriver.findOneAndReplace(req.wrestler.resource, filter, doc);
      if (!replacedDoc) {
        return res.sendStatus(404);
      }
      res.json(replacedDoc);
    }
    next();
  } catch (err) {
    next(err);
  }
};

exports.handleRestfulPatchRequest = async (req, res, next) => {
  try {
    if (req.method === 'PATCH') {
      if (req.wrestler.id === undefined) {
        return res.sendStatus(400);
      }
      delete req.body.id;
      const doc = appendUpdatedBy(req, Object.assign({}, req.body, { updatedAt: new Date() }));
      const filter = appendFilter(req, { id: req.wrestler.id });
      const updatedDoc = await req.wrestler.dbDriver.findOneAndUpdate(req.wrestler.resource, filter, doc);
      if (!updatedDoc) {
        return res.sendStatus(404);
      }
      const result = res.wrestler.transformer ? res.wrestler.transformer(updatedDoc) : updatedDoc;
      res.json(result);
    }
    next();
  } catch (err) {
    next(err);
  }
};

exports.handleRestfulDeleteRequest = async (req, res, next) => {
  try {
    if (req.method === 'DELETE') {
      if (req.wrestler.id === undefined) {
        return res.sendStatus(400);
      }
      const filter = appendFilter(req, { id: req.wrestler.id });
      const deletedDoc = await req.wrestler.dbDriver.deleteOne(req.wrestler.resource, filter);
      if (!deletedDoc) {
        return res.sendStatus(404);
      }
      res.sendStatus(204);
    }
    next();
  } catch (err) {
    next(err);
  }
};

const appendCreatedBy = (req, doc) => {
  const userId = _.get(req, 'wrestler.user.id');
  return Object.assign({}, doc, { createdBy: userId });
};

const appendUpdatedBy = (req, doc) => {
  const userId = _.get(req, 'wrestler.user.id');
  return Object.assign({}, doc, { updatedBy: userId });
};

const appendFilter = (req, filter) => {
  const userFilter = _.get(req, 'wrestler.user.filter', {});
  return Object.assign({}, filter, userFilter);
};

const sortFromQuery = (req) => {
  let { sort: sortQuery } = req.query;
  delete req.query.sort;
  if (sortQuery) {
    const sort = sortQuery.split(',').reduce((acc, v) => {
      const key = v.startsWith('-') ? v.substring(1) : v;
      acc[key] = v.startsWith('-') ? -1 : 1;
      return acc;
    }, {});
    return { sort, sortQuery }
  }
  return { sort: { createdAt: 1 }, sortQuery: undefined };
};

const projectionFromQuery = (req) => {
  let { fields: projectionQuery } = req.query;
  delete req.query.fields;
  if (projectionQuery) {
    const projection = projectionQuery.split(',').reduce((acc, v) => {
      acc[v] = 1;
      return acc;
    }, {});
    return { projection, projectionQuery };
  }
  return { projection: undefined, projectionQuery: undefined };
};

const limitFromQuery = (req) => {
  let { limit } = req.query;
  delete req.query.limit;
  return parseInt(limit, 10) || req.wrestler.options.pageSize;
};

const skipFromQuery = (req) => {
  let { skip } = req.query;
  delete req.query.skip;
  return parseInt(skip, 10) || 0;
};

const linksFromResult = (req, resource, results, projectionQuery, sortQuery, limit, skip) => {
  const nextSkip = skip + limit;
  const prevSkip = skip - limit;
  const fields = projectionQuery ? `&fields=${projectionQuery}` : '';
  const sort = sortQuery ? `&sort=${sortQuery}` : '';
  const links = {};
  if (results.length > limit) {
    links.next = buildLink(req, resource, limit, nextSkip, fields, sort);
  }
  if (skip > 0) {
    links.prev = buildLink(req, resource, limit, prevSkip, fields, sort);
  }
  return links;
};

const buildLink = (req, resource, limit, skip, fields, sort) => {
  return `${req.protocol}://${req.headers.host}/${resource}?limit=${limit}&skip=${skip}${fields}${sort}`
};


