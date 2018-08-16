require('dotenv').config({path: '.env.test'});
const db = require('../db/db_util');

const setupDb = async () => {
  global.testDb = await db.connect();
};

setupDb().then(run);
