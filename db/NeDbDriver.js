const Datastore = require('nedb');

module.exports = class NeDbDriver {
  constructor() {
    this.datastores = {};
  }

  findOne(collectionName, filter, projection) {
    const ds = this._datastore(collectionName);
    return new Promise((resolve, reject) => {
      ds.findOne(filter, projection).limit(1).exec(handler(resolve, reject));
    });
  }

  find(collectionName, filter, projection, options) {
    const ds = this._datastore(collectionName);
    return new Promise((resolve, reject) => {
      ds.find(filter, projection).sort(options.sort).limit(options.limit).skip(options.skip).exec(handler(resolve, reject));
    });
  }

  insertOne(collectionName, doc) {
    const ds = this._datastore(collectionName);
    return new Promise((resolve, reject) => {
      ds.insert(doc, handler(resolve, reject));
    });
  }
  
  findOneAndReplace(collectionName, filter, doc) {
    const ds = this._datastore(collectionName);
    return new Promise((resolve, reject) => {
      ds.update(filter, doc, {upsert: true, returnUpdatedDocs: true}, handler(resolve, reject, 1));
    });
  }
  
  findOneAndUpdate(collectionName, filter, doc) {
    const ds = this._datastore(collectionName);
    return new Promise((resolve, reject) => {
      ds.update(filter, {$set: doc}, {upsert: false, returnUpdatedDocs: true}, handler(resolve, reject, 1));
    });
  }
  
  deleteOne(collectionName, filter) {
    const ds = this._datastore(collectionName);
    return new Promise((resolve, reject) => {
      ds.remove(filter, handler(resolve, reject));
    });
  }

  countDocuments(collectionName, filter) {
    const ds = this._datastore(collectionName);
    return new Promise((resolve, reject) => {
      ds.count(filter, handler(resolve, reject));
    });
  }

  toObjectId(id) {
    return id;
  }

  _datastore(name) {
    let ds = this.datastores[name];
    if (!ds) {
      ds = new Datastore({filename: `data/${name}`, inMemoryOnly: true});
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

const handler = (resolve, reject, argIndex=0) => (err, ...args) => {
  if (err) {
    reject(err);
  } else {
    resolve(args[argIndex]);
  }
};
