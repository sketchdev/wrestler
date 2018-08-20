require('dotenv').config({ path: '.env.test' });

const db = require('../db/db_util');

const initDatabase = async () => {
  global.testDb = await db.connect();
};

(async () => {
  await initDatabase();
})().then(run);
