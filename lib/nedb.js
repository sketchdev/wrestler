const Datastore = require('nedb');

module.exports = class NeDbDriver {

  constructor(persistentPath) {
    this.persistentPath = persistentPath;
    this.datastores = {};
  }

  findOne(collectionName, filter, projection) {
    const normalizedFilter = normalizeFilter(filter);
    const ds = this._datastore(collectionName);
    return new Promise((resolve, reject) => {
      ds.findOne(normalizedFilter, projection).limit(1).exec(handler(resolve, reject));
    });
  }

  find(collectionName, filter, projection, options) {
    const normalizedFilter = normalizeFilter(filter);
    const ds = this._datastore(collectionName);
    return new Promise((resolve, reject) => {
      ds.find(normalizedFilter, projection).sort(options.sort).limit(options.limit).skip(options.skip).exec(handler(resolve, reject));
    });
  }

  insertOne(collectionName, doc) {
    const ds = this._datastore(collectionName);
    return new Promise((resolve, reject) => {
      ds.insert(doc, handler(resolve, reject));
    });
  }

  findOneAndReplace(collectionName, filter, doc) {
    const normalizedFilter = normalizeFilter(filter);
    const ds = this._datastore(collectionName);
    return new Promise((resolve, reject) => {
      ds.update(normalizedFilter, doc, { upsert: false, returnUpdatedDocs: true }, handler(resolve, reject, 1));
    });
  }

  findOneAndUpdate(collectionName, filter, doc) {
    const normalizedFilter = normalizeFilter(filter);
    const ds = this._datastore(collectionName);
    return new Promise((resolve, reject) => {
      ds.update(normalizedFilter, { $set: doc }, { upsert: false, returnUpdatedDocs: true }, handler(resolve, reject, 1));
    });
  }

  deleteOne(collectionName, filter) {
    const normalizedFilter = normalizeFilter(filter);
    const ds = this._datastore(collectionName);
    return new Promise((resolve, reject) => {
      ds.remove(normalizedFilter, handler(resolve, reject));
    });
  }

  count(collectionName, filter) {
    const normalizedFilter = normalizeFilter(filter);
    const ds = this._datastore(collectionName);
    return new Promise((resolve, reject) => {
      ds.count(normalizedFilter, handler(resolve, reject));
    });
  }

  _datastore(name) {
    let ds = this.datastores[name];
    if (!ds) {
      const filename = this.persistentPath ? `${this.persistentPath}/${name}.db` : `${name}.db`;
      const options = {
        filename,
        inMemoryOnly: !this.persistentPath,
        autoload: true
      };
      ds = new Datastore(options);
      this.datastores[name] = ds;
    }
    return ds;
  }

  dropCollections(...collectionNames) {
    const promises = [];
    const collections = collectionNames.map(name => this._datastore(name));
    for (const collection of collections) {
      promises.push(new Promise((resolve, reject) => {
        collection.remove({}, { multi: true }, handler(resolve, reject));
      }));
    }
    return Promise.all(promises);
  }

};

const transformManyId = (entities) => {
  return entities.map(e => transformOneId(e));
};

const transformOneId = (entity) => {
  if (entity && typeof entity === 'object' && '_id' in entity) {
    const _id = entity._id;
    delete entity._id;
    entity.id = _id;
  }
  return entity;
};

const handler = (resolve, reject, argIndex = 0) => (err, ...args) => {
  if (err) {
    reject(err);
  } else {
    const result = args[argIndex];
    if (Array.isArray(result)) {
      resolve(transformManyId(result));
    } else {
      resolve(transformOneId(result));
    }
  }
};

const normalizeFilter = (filter) => {
  const filterClone = Object.assign({}, filter);
  if (filterClone.id) {
    filterClone._id = filterClone.id;
    delete filterClone.id;
  }
  return filterClone;
};
