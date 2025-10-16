const { Pool } = require('pg');
const dotenv = require('dotenv');

const envResult = dotenv.config();
if (envResult.error) {
  console.warn('[Database] Unable to load .env file. Falling back to process environment variables only.');
}

const FALLBACK_CONNECTIONS = {
  DATABASE_URL: 'postgres://postgres:postgres@localhost:5432/cswa_v2',
  MARKETER_DATABASE_URL: 'postgres://postgres:postgres@localhost:5432/marketerv2'
};

const obfuscateConnectionString = (connectionString) => {
  if (!connectionString) return 'undefined';
  try {
    const parsed = new URL(connectionString);
    const credentials = parsed.username ? `${parsed.username}:***@` : '';
    return `${parsed.protocol}//${credentials}${parsed.host}${parsed.pathname}${parsed.search}`;
  } catch (error) {
    return '[invalid connection string]';
  }
};

const resolveConnectionString = (envKey) => {
  const value = process.env[envKey];
  if (value) {
    console.info(`[Database] ${envKey} loaded: ${obfuscateConnectionString(value)}`);
    return value;
  }

  const fallback = FALLBACK_CONNECTIONS[envKey];
  if (fallback) {
    console.warn(
      `[Database] ${envKey} is not set. Using fallback value: ${obfuscateConnectionString(fallback)}`
    );
    return fallback;
  }

  const message = `[Database] Missing required environment variable ${envKey}. Please set it in the deployment environment.`;
  console.error(message);
  throw new Error(message);
};

const createPool = (connectionString, label) => {
  if (!connectionString) {
    const message = `[Database] Connection string for ${label} database is undefined.`;
    console.error(message);
    throw new Error(message);
  }

  const isLocalhost = /localhost|127\.0\.0\.1/i.test(connectionString);

  console.info(
    `[Database] Initialising connection pool for ${label} database (ssl=${isLocalhost ? 'disabled' : 'enabled'})`
  );

  return new Pool({
    connectionString,
    max: 10,
    idleTimeoutMillis: 30000,
    ssl: isLocalhost ? false : { rejectUnauthorized: false }
  });
};

const primaryConnectionString = resolveConnectionString('DATABASE_URL');
const marketerConnectionString = resolveConnectionString('MARKETER_DATABASE_URL');

const primaryPool = createPool(primaryConnectionString, 'primary');
const marketerPool = createPool(marketerConnectionString, 'marketer');

module.exports = {
  primaryPool,
  marketerPool
};
