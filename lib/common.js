const { MissingError } = require('./errors');

exports.BULK_RESOURCE = '_bulk';

const appendUpdatedBy = exports.appendUpdatedBy = (user, doc) => {
  const id = (user || {}).id || null;
  return Object.assign({}, doc, { updatedBy: id });
};

const appendFilter = exports.appendFilter = (user, filter) => {
  const userFilter = (user || {}).filter || {};
  return Object.assign({}, filter, userFilter);
};

exports.patch = ({ resource, dbDriver, transformer, user }) => async (id, body) => {
  delete body.id;
  delete body._id;
  delete body.createdAt;
  delete body.updatedAt;
  const doc = appendUpdatedBy(user, Object.assign({}, body, { updatedAt: new Date() }));
  const filter = appendFilter(user, { id });
  const updatedDoc = await dbDriver.findOneAndUpdate(resource, filter, doc);
  if (!updatedDoc) {
    throw new MissingError();
  }
  return transformer ? transformer(updatedDoc) : updatedDoc;
};
