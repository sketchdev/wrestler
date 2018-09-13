module.exports = class PgDriver {

  constructor(options) {
    this.options = options;
    if (process.env.NODE_ENV !== 'test') console.log('using the pg driver\n');
  }

  async connect() {
    const connectionString = process.env.PG_CONNECTION_STRING || this.options.pgConnectionString;
    this.knex = require('knex')({ client: 'pg', connection: connectionString });
  }

  async findOne(collectionName, filter, options = {}) {
    return await this.knex.first(options.projection).from(collectionName).where(filter);
  }

  async findMany(collectionName, filter, projection, options) {
    let query = this.knex.select(projection).from(collectionName);
    query = query.where(filter);
    query = query.limit(options.limit);
    for (const sortField of Object.keys((options.sort || {}))) {
      const sortOrder = options.sort[sortField] === 1 ? 'asc' : 'desc';
      query = query.orderBy(sortField, sortOrder);
    }
    const result = await query.offset(options.skip);
    return (result || []);
  }

  async insertOne(collectionName, doc) {
    const projection = Object.keys(doc).concat('id');
    const result = await this.knex(collectionName).insert(doc).returning(projection);
    return result[0];
  }

  async findOneAndReplace(collectionName, filter, doc) {
    return this.findOneAndUpdate(collectionName, filter, doc);
  }

  async findOneAndUpdate(collectionName, filter, doc) {
    const result = await this.knex(collectionName).where(filter).update(doc);
    if (result === 1) {
      return await this.findOne(collectionName, { id: filter.id });
    }
    return undefined;
  }

  async deleteOne(collectionName, filter) {
    const result = await this.knex(collectionName).where(filter).delete();
    if (result === 1) {
      return {};
    }
    return undefined;
  }

  async countBy(collectionName, filter) {
    const result = await this.knex(collectionName).where(filter).count('id');
    if (Array.isArray(result) && result.length > 0) {
      return result[0].count;
    }
    return undefined;
  }

  async clean(...names) {
    for (const name of names) {
      try {
        const tableExists = await this.knex.schema.hasTable(name);
        if (tableExists) {
          await this.knex(name).delete();
        }
      } catch (err) {
        console.log('error', err);
        //currently swallowing this error, probably should check if it is due to collection or DB not existing and only ignore in that case
      }
    }
  }

};
