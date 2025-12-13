import { pool } from './src/lib/db';
import dotenv from 'dotenv';

dotenv.config();

async function test() {
  try {
    console.log('--- DB DIAGNOSTIC ---');
    
    // 1. Cek Koneksi
    const res = await pool.query('SELECT current_database(), current_user');
    console.log('Connected to:', res.rows[0]);

    // 2. Cek Total Customers
    const cust = await pool.query('SELECT COUNT(*) as count FROM customers');
    console.log('Total Customers (Raw):', cust.rows);

    // 3. Cek Sample Customers
    const sample = await pool.query('SELECT id, name FROM customers LIMIT 3');
    console.log('Sample Customers:', sample.rows);

    // 4. Cek Total Chats
    const chats = await pool.query('SELECT COUNT(*) as count FROM chat_history');
    console.log('Total Chats (Raw):', chats.rows);

  } catch (e) {
    console.error('ERROR:', e);
  } finally {
    await pool.end();
  }
}

test();
