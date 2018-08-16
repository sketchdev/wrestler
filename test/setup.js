require('dotenv').config({path: '.env.test'});
const db = require('../db/db-util');

const setupDb = async () => {
  global.testDb = await db.connect();
};

setupDb().then(run);
