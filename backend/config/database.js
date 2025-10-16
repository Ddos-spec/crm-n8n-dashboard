const { Pool } = require('pg');
const dotenv = require('dotenv');

dotenv.config();

const createPool = (connectionString) =>
  new Pool({
    connectionString,
    max: 10,
    idleTimeoutMillis: 30000,
    ssl: connectionString.includes('localhost') ? false : { rejectUnauthorized: false }
  });

const primaryPool = createPool(process.env.DATABASE_URL);
const marketerPool = createPool(process.env.MARKETER_DATABASE_URL);

module.exports = {
  primaryPool,
  marketerPool
};
