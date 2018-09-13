const { ObjectID } = require('mongodb');

module.exports = class MongoDriver {

  constructor(db) {
    this.db = db;
  }

  async findOne(collectionName, filter, projection) {
    const normalizedFilter = normalizeFilter(filter);
    return (await this.db.collection(collectionName).find(normalizedFilter, { projection }).limit(1).toArray())[0];
  }

  async find(collectionName, filter, projection, options) {
    const normalizedFilter = normalizeFilter(filter);
    return this.db.collection(collectionName).find(normalizedFilter, { projection }).sort(options.sort).limit(options.limit).skip(options.skip).toArray()
  }

  async insertOne(collectionName, doc) {
    return (await this.db.collection(collectionName).insertOne(doc)).ops[0];
  }

  async findOneAndReplace(collectionName, filter, doc) {
    const normalizedFilter = normalizeFilter(filter);
    return (await this.db.collection(collectionName).findOneAndReplace(normalizedFilter, doc, { upsert: true, returnOriginal: false })).value
  }

  async findOneAndUpdate(collectionName, filter, doc) {
    const normalizedFilter = normalizeFilter(filter);
    return (await this.db.collection(collectionName).findOneAndUpdate(normalizedFilter, { $set: doc }, { upsert: false, returnOriginal: false })).value;
  }

  async deleteOne(collectionName, filter) {
    const normalizedFilter = normalizeFilter(filter);
    return await this.db.collection(collectionName).deleteOne(normalizedFilter);
  }

  async count(collectionName, filter) {
    const normalizedFilter = normalizeFilter(filter);
    return await this.db.collection(collectionName).countDocuments(normalizedFilter);
  }

  async clean(...names) {
    for (const name of names) {
      try {
        await this.db.collection(name).drop();
      } catch (err) {
        //currently swallowing this error, probably should check if it is due to collection or DB not existing and only ignore in that case
      }
    }
  }

};

const normalizeFilter = (filter) => {
  const filterClone = Object.assign({}, filter);
  if (filterClone.id) {
    filterClone._id = ObjectID.createFromHexString(filterClone.id);
    delete filterClone.id;
  }
  return filterClone;
};
