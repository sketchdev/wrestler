module.exports = class PgDriver {

  constructor(options) {
    this.options = options;
    if (process.env.NODE_ENV !== 'test') console.log('using the pg driver\n');
  }

  async connect() {
    if (!this.knex) {
      const connection = process.env.PG_CONNECTION_STRING || this.options.pgConnectionString;
      const pool = process.env.NODE_ENV === 'test' ? { min: 0, max: 1 } : undefined;
      this.knex = require('knex')({ client: 'pg', connection, pool });
    }
  }

  async findOne(collectionName, filter, options = {}) {
    if (Object.values(filter).some(v => v === undefined)) return null;
    const fields = options.projection ? Object.keys(Object.assign(options.projection, { id: 1 })) : '*';
    return await this.knex.first(fields).from(collectionName).where(filter);
  }

  async findMany(collectionName, filter, projection, options) {
    if (Object.values(filter).some(v => v === undefined)) return [];
    const fields = projection ? Object.keys(Object.assign(projection, { id: 1 })) : '*';
    let query = this.knex.select(fields).from(collectionName);
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

  // NOTE: relational databases don't really replace. instead, just update
  async findOneAndReplace(collectionName, filter, doc) {
    return this.findOneAndUpdate(collectionName, filter, doc);
  }

  async findOneAndUpdate(collectionName, filter, doc) {
    const result = await this.knex(collectionName).where(filter).update(doc).returning(['id']);
    if (Array.isArray(result) && result.length > 0) {
      const record = result[0];
      return await this.findOne(collectionName, { id: record.id });
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
      return parseInt(result[0].count, 10);
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
