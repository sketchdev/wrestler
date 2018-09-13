const MongoDriver = require('./mongo');
const NeDbDriver = require('./nedb');
const PgDriver = require('./pg');

const getDriver = (options) => {
  if (process.env.MONGO_DB_URI && process.env.MONGO_DB_NAME) {
    return new MongoDriver(options);
  }
  if (process.env.PG_CONNECTION_STRING || options.pgConnectionString) {
    return new PgDriver(options);
  }
  return new NeDbDriver(options);
};

exports.connect = async (options = {}) => {
  const driver = getDriver(options);
  await driver.connect();
  return driver;
};

exports.isValidDriver = (obj) => {
  //TODO check available methods instead to support custom drivers
  return obj instanceof NeDbDriver || obj instanceof MongoDriver;
};

