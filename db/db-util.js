const { MongoClient } = require('mongodb');
const MongoDriver = require('./MongoDriver');
const NeDbDriver = require('./NeDbDriver');

exports.connect = async () => {
  const mongodbUri = process.env.MONGO_DB_URI;
  const dbName = process.env.MONGO_DB_NAME;
  if (mongodbUri) {
    console.log('using the mongodb driver');
    const mongodb = await connectToMongo(mongodbUri, dbName);
    return new MongoDriver(mongodb);
  } else {
    console.log('using nedb driver');
    return new NeDbDriver();
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

