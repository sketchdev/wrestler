exports.handleRestRequest = async (req, res, next) => {
  try {
    await handleRestfulGetRequest(req, res);
    await handleRestfulPostRequest(req, res);
    await handleRestfulPutRequest(req, res);
    await handleRestfulPatchRequest(req, res);
    await handleRestfulDeleteRequest(req, res);
    next();
  } catch (err) {
    next(err);
  }
};

const handleRestfulGetRequest = async (req, res) => {
  if (req.method === 'GET') {
    const { projection, projectionQuery } = projectionFromQuery(req);
    if (req.id === undefined) {
      const { sort, sortQuery } = sortFromQuery(req);
      const limit = limitFromQuery(req);
      const skip = skipFromQuery(req);
      const filter = appendUserScope(req, req.query);
      const docs = await req.db.find(req.resource, filter, { projection }, {sort, limit: limit + 1, skip});
      const results = res.wrestler.transformer ? res.wrestler.transformer(docs) : transformManyId(docs);
      const links = linksFromResult(req, req.resource, results, projectionQuery, sortQuery, limit, skip);
      if (results.length < limit) {
        return res.links(links).json(results);
      }
      results.pop();
      return res.links(links).json(results);
    } else {
      const _id = req.db.toObjectId(req.id);
      const filter = appendUserScope(req, { _id });
      const item = await req.db.findOne(req.resource, filter, { projection });
      if (item) {
        return res.json(transformOneId(item));
      } else {
        return res.sendStatus(404);
      }
    }
  }
};

const handleRestfulPostRequest = async (req, res) => {
  if (req.method === 'POST') {
    delete req.body.id;
    const now = new Date();
    const doc = appendUserId(req, Object.assign(req.body, { createdAt: now, updatedAt: now }));
    const insertedDoc = await req.db.insertOne(req.resource, doc);
    const result = res.wrestler.transformer ? res.wrestler.transformer(insertedDoc) : transformOneId(insertedDoc);
    return res.location(`/${req.resource}/${result.id}`).status(201).json(result);
  }
};

const handleRestfulPutRequest = async (req, res) => {
  if (req.method === 'PUT') {
    if (req.id === undefined) {
      return res.sendStatus(400);
    }
    delete req.body.id;
    const now = new Date();
    const doc = appendUserId(req, Object.assign({}, req.body, { createdAt: now, updatedAt: now }));
    const filter = appendUserScope(req, { _id: req.db.toObjectId(req.id) });
    const replacedDoc = await req.db.findOneAndReplace(req.resource, filter, doc);
    const result = res.wrestler.transformer ? res.wrestler.transformer(replacedDoc) : transformOneId(replacedDoc);
    return res.json(result);
  }
};

const handleRestfulPatchRequest = async (req, res) => {
  if (req.method === 'PATCH') {
    if (req.id === undefined) {
      return res.sendStatus(400);
    }
    delete req.body.id;
    const doc = appendUserId(req, Object.assign({}, req.body, { updatedAt: new Date() }));
    const filter = appendUserScope(req, { _id: req.db.toObjectId(req.id) });
    console.log('patch', filter, doc);
    const updatedDoc = await req.db.findOneAndUpdate(req.resource, filter, doc);
    const result = res.wrestler.transformer ? res.wrestler.transformer(updatedDoc) : transformOneId(updatedDoc);
    return res.json(result);
  }
};

const handleRestfulDeleteRequest = async (req, res) => {
  if (req.method === 'DELETE') {
    if (req.id === undefined) {
      return res.sendStatus(400);
    }
    const filter = appendUserScope(req, { _id: req.db.toObjectId(req.id) });
    await req.db.deleteOne(req.resource, filter);
    // TODO: maybe enumerate a whitelist of collections and delete all child documents for this userId in a transaction?
    return res.sendStatus(204);
  }
};

const appendUserScope = (req, filter) => {
  if (req.wrestler && req.wrestler.user && req.wrestler.user.id) {
    if (req.resource === 'user') {
      // TODO: if req.wrestler.user.id !== req.id, then throw error i think
      return Object.assign({}, filter, { _id: req.db.toObjectId(req.wrestler.user.id) });
    }
    return Object.assign({}, filter, { userId: req.wrestler.user.id });
  }
  return filter;
};

const appendUserId = (req, doc) => {
  if (req.wrestler && req.wrestler.user && req.wrestler.user.id && req.resource !== 'user') {
    return Object.assign({}, doc, { userId: req.wrestler.user.id });
  }
  return doc;
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
  return { sort: undefined, sortQuery: undefined };
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
    links.next = `${req.protocol}://${req.headers.host}/${resource}?limit=${limit}&skip=${nextSkip}${fields}${sort}`
  }
  if (skip > 0) {
    links.prev = `${req.protocol}://${req.headers.host}/${resource}?limit=${limit}&skip=${prevSkip}${fields}${sort}`;
  }
  return links;
};

const transformManyId = (entities) => {
  return entities.map(e => transformOneId(e));
};

const transformOneId = (entity) => {
  const _id = entity._id;
  delete entity._id;
  entity.id = _id;
  return entity;
};


