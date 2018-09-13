/** @namespace options.persistentDataPath */

const { MongoClient } = require('mongodb');
const MongoDriver = require('./mongo');
const NeDbDriver = require('./nedb');

exports.connect = async (options = {}) => {
  const mongoDbUri = process.env.MONGO_DB_URI;
  const mongoDbName = process.env.MONGO_DB_NAME;
  if (mongoDbUri && mongoDbName) {
    console.log('using the mongodb driver\n');
    const mongodb = await connectToMongo(mongoDbUri, mongoDbName);
    return new MongoDriver(mongodb);
  } else {
    const persistentDataPath = process.env.PERSISTENT_DATA_PATH || options.persistentDataPath;
    console.log(`using nedb driver @ ${persistentDataPath || 'in-memory'}\n`);
    return new NeDbDriver(persistentDataPath);
  }
};

exports.isValidDriver = (obj) => {
  //TODO check available methods instead to support custom drivers
  return obj instanceof NeDbDriver || obj instanceof MongoDriver;
};

async function connectToMongo(uri, dbName) {
  const client = await MongoClient.connect(uri, { useNewUrlParser: true });
  return client.db(dbName);
}

