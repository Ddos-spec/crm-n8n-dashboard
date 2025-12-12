const { Client } = require('pg');

const connectionString = 'postgres://postgres:a0bd3b3c1d54b7833014@163.61.44.41:5432/CRM?sslmode=disable';

const client = new Client({
  connectionString: connectionString,
});

console.log('Testing connection to:', connectionString.replace(/:[^:@]+@/, ':****@')); // Hide password in log

async function testConnection() {
  try {
    await client.connect();
    console.log('✅ BERHASIL LOGIN! Password dan Username Benar.');
    console.log('Database "CRM" ditemukan.');
    
    const res = await client.query('SELECT NOW()');
    console.log('Server Time:', res.rows[0].now);
    
    await client.end();
  } catch (err) {
    console.error('❌ GAGAL KONEKSI:', err.message);
    if (err.message.includes('password authentication failed')) {
        console.error('-> KESIMPULAN: Password Salah.');
    } else if (err.message.includes('database "CRM" does not exist')) {
        console.error('-> KESIMPULAN: Database dengan nama "CRM" belum dibuat.');
    } else {
        console.error('-> KESIMPULAN: Masalah Jaringan/Firewall atau IP tidak diizinkan.');
    }
    process.exit(1);
  }
}

testConnection();
