const { MongoClient, ObjectID } = require('mongodb');

module.exports = class MongoDriver {

  constructor(options) {
    this.options = options;
    if (process.env.NODE_ENV !== 'test') console.log('using the mongodb driver\n');
  }

  async connect() {
    const uri = this.options.mongoDbUri || process.env.MONGO_DB_URI;
    const dbName = this.options.mongoDbName || process.env.MONGO_DB_NAME;
    const client = await MongoClient.connect(uri, { useNewUrlParser: true });
    this.db = client.db(dbName);
  }

  async findOne(collectionName, filter, projection) {
    const normalizedFilter = normalizeFilter(filter);
    const entity = (await this.db.collection(collectionName).find(normalizedFilter, { projection }).limit(1).toArray())[0];
    return transformOneId(entity);
  }

  async findMany(collectionName, filter, projection, options) {
    const normalizedFilter = normalizeFilter(filter);
    const entities = await this.db.collection(collectionName).find(normalizedFilter, { projection }).sort(options.sort).limit(options.limit).skip(options.skip).toArray();
    return transformManyId(entities);
  }

  async insertOne(collectionName, doc) {
    const entity = (await this.db.collection(collectionName).insertOne(doc)).ops[0];
    return transformOneId(entity);
  }

  async findOneAndReplace(collectionName, filter, doc) {
    const normalizedFilter = normalizeFilter(filter);
    const entity = (await this.db.collection(collectionName).findOneAndReplace(normalizedFilter, doc, { upsert: false, returnOriginal: false })).value;
    return transformOneId(entity);
  }

  async findOneAndUpdate(collectionName, filter, doc) {
    const normalizedFilter = normalizeFilter(filter);
    const entity = (await this.db.collection(collectionName).findOneAndUpdate(normalizedFilter, { $set: doc }, { upsert: false, returnOriginal: false })).value;
    return transformOneId(entity);
  }

  async deleteOne(collectionName, filter) {
    const normalizedFilter = normalizeFilter(filter);
    return await this.db.collection(collectionName).deleteOne(normalizedFilter);
  }

  async countBy(collectionName, filter) {
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

const transformManyId = (entities) => {
  if (entities && Array.isArray(entities)) {
    return entities.map(e => transformOneId(e));
  }
  return entities;
};

const transformOneId = (entity) => {
  if (entity && typeof entity === 'object' && '_id' in entity) {
    const _id = entity._id;
    delete entity._id;
    entity.id = _id;
  }
  return entity;
};

const normalizeFilter = (filter) => {
  const filterClone = Object.assign({}, filter);
  if (filterClone.id && ObjectID.isValid(filterClone.id)) {
    filterClone._id = ObjectID.createFromHexString(filterClone.id);
    delete filterClone.id;
  }
  return filterClone;
};
