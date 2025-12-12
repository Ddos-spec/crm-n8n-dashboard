import { Pool } from 'pg';
import { config } from '../config/env';

export const pool = new Pool({
  connectionString: config.databaseUrl,
  ssl: false,
});

export const checkDbConnection = async () => {
  const result = await pool.query('SELECT 1 as ok');
  return result.rows[0]?.ok === 1;
};
