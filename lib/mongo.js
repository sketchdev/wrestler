const { ObjectID } = require('mongodb');

module.exports = class MongoDriver {
  constructor(db) {
    this.db = db;
  }

  async findOne(collectionName, filter, projection) {
    return (await this.db.collection(collectionName).find(filter, { projection }).limit(1).toArray())[0];
  }

  async find(collectionName, filter, projection, options) {
    return this.db.collection(collectionName).find(filter, { projection }).sort(options.sort).limit(options.limit).skip(options.skip).toArray()
  }

  // noinspection JSMethodCanBeStatic
  toObjectId(id) {
    return ObjectID.createFromHexString(id);
  }

  async insertOne(collectionName, doc) {
    return (await this.db.collection(collectionName).insertOne(doc)).ops[0];
  }

  async findOneAndReplace(collectionName, filter, doc) {
    return (await this.db.collection(collectionName).findOneAndReplace(filter, doc, { upsert: true, returnOriginal: false })).value
  }

  async findOneAndUpdate(collectionName, filter, doc) {
    return (await this.db.collection(collectionName).findOneAndUpdate(filter, { $set: doc }, { upsert: false, returnOriginal: false })).value;
  }

  deleteOne(collectionName, filter) {
    return this.db.collection(collectionName).deleteOne(filter);
  }

  count(collectionName, filter) {
    return this.db.collection(collectionName).countDocuments(filter);
  }

  async dropCollections(...names) {
    for (const name of names) {
      try {
        await this.db.collection(name).drop();
      } catch (err) {
        //currently swallowing this error, probably should check if it is due to collection or DB not existing and only ignore in that case
      }
    }
  }
};
