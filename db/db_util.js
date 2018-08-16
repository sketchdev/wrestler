const { MongoClient } = require('mongodb');
const MongoDriver = require('./mongo_driver');
const NeDbDriver = require('./nedb_driver');

exports.connect = async (options = {}) => {
  const mongodbUri = process.env.MONGO_DB_URI;
  const dbName = process.env.MONGO_DB_NAME;
  if (mongodbUri && dbName) {
    console.log('using the mongodb driver');
    const mongodb = await connectToMongo(mongodbUri, dbName);
    return new MongoDriver(mongodb);
  } else {
    const persistentDataPath = process.env.PERSISTENT_DATA_PATH || options.persistentDataPath;
    console.log(`using nedb driver @ ${persistentDataPath || 'in-memory'}`);
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

