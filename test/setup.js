require('dotenv').config();

const { MongoClient } = require('mongodb');

const setupDb = async () => {
  const dbName = process.env.DB_NAME;
  const dbUri = process.env.DB_URI;
  const client = await MongoClient.connect(dbUri, { useNewUrlParser: true });
  global.testDb = client.db(dbName);
};

setupDb().then(run);
