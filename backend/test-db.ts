import { pool } from './src/lib/db';
import dotenv from 'dotenv';

dotenv.config();

async function test() {
  try {
    console.log('--- DB DIAGNOSTIC 2 ---');
    
    // 1. Cek Total Customers
    const cust = await pool.query('SELECT COUNT(*) as count FROM customers');
    console.log('Total Customers (Raw):', cust.rows[0].count);

    // 2. Cek Sample 20 Customers (seperti query API)
    console.log('\nChecking Top 20 Customers (Ordered by last_message_at):');
    const sample = await pool.query(`
      SELECT id, name, phone, last_message_at 
      FROM customers 
      ORDER BY last_message_at DESC NULLS LAST 
      LIMIT 20
    `);
    
    if (sample.rows.length === 0) {
      console.log('Result: KOSONG (0 rows)');
    } else {
      sample.rows.forEach((row, i) => {
        console.log(`${i+1}. ${row.name} (${row.phone}) - Last Msg: ${row.last_message_at}`);
      });
    }

  } catch (e) {
    console.error('ERROR:', e);
  } finally {
    await pool.end();
  }
}

test();