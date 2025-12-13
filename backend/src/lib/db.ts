import { Pool } from 'pg';
import { config } from '../config/env';

export const pool = new Pool({
  connectionString: config.databaseUrl,
  ssl: false,
  max: 20, // Max number of clients in the pool
  idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
  connectionTimeoutMillis: 2000, // Return an error after 2 seconds if connection could not be established
});

export const checkDbConnection = async () => {
  const result = await pool.query('SELECT 1 as ok');
  return result.rows[0]?.ok === 1;
};