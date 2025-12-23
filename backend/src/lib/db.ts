import { Pool } from 'pg';
import { config } from '../config/env';

// Determine SSL configuration based on environment
const isProduction = config.nodeEnv === 'production';
const sslConfig = isProduction
  ? { rejectUnauthorized: false } // Enable SSL in production (works with most cloud DBs)
  : false; // Disable SSL in development

export const pool = new Pool({
  connectionString: config.databaseUrl,
  ssl: sslConfig,
  max: 20, // Max number of clients in the pool
  idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
  connectionTimeoutMillis: 5000, // Increased timeout for reliability
});

// Handle pool errors gracefully
pool.on('error', (err) => {
  console.error('[DB_POOL_ERROR] Unexpected error on idle client:', err.message);
});

export const checkDbConnection = async (): Promise<boolean> => {
  try {
    const result = await pool.query('SELECT 1 as ok');
    return result.rows[0]?.ok === 1;
  } catch (error) {
    console.error('[DB_CONNECTION_CHECK] Failed:', (error as Error).message);
    return false;
  }
};