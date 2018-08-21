require('dotenv').config({ path: '.env.test' });

const db = require('../lib/db_util');

const initDatabase = async () => {
  global.testDb = await db.connect();
};

(async () => {
  await initDatabase();
})().then(run);
