const bcrypt = require('bcryptjs');
const { primaryPool } = require('../config/database');

const DEFAULTS = {
  email: process.env.DEFAULT_ADMIN_EMAIL || 'admin@crm.local',
  password: process.env.DEFAULT_ADMIN_PASSWORD || 'admin123',
  fullName: process.env.DEFAULT_ADMIN_FULL_NAME || 'Administrator',
  role: process.env.DEFAULT_ADMIN_ROLE || 'admin'
};

const ensureAdminUser = async () => {
  const client = await primaryPool.connect();

  try {
    const passwordHash = await bcrypt.hash(DEFAULTS.password, 10);

    await client.query('BEGIN');

    const existingUser = await client.query(
      'SELECT id FROM dashboard_users WHERE email = $1 LIMIT 1',
      [DEFAULTS.email]
    );

    if (existingUser.rows.length > 0) {
      const userId = existingUser.rows[0].id;
      await client.query(
        `UPDATE dashboard_users
         SET full_name = $1,
             role = $2,
             password_hash = $3,
             updated_at = NOW()
         WHERE id = $4`,
        [DEFAULTS.fullName, DEFAULTS.role, passwordHash, userId]
      );
      console.info(`[ensure-admin] Updated existing admin user with email ${DEFAULTS.email}`);
    } else {
      await client.query(
        `INSERT INTO dashboard_users (email, password_hash, full_name, role)
         VALUES ($1, $2, $3, $4)`,
        [DEFAULTS.email, passwordHash, DEFAULTS.fullName, DEFAULTS.role]
      );
      console.info(`[ensure-admin] Created admin user with email ${DEFAULTS.email}`);
    }

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[ensure-admin] Failed to ensure admin user:', error.message);
    throw error;
  } finally {
    client.release();
  }
};

ensureAdminUser()
  .then(() => {
    console.info('[ensure-admin] Operation completed successfully.');
  })
  .catch(() => {
    console.error('[ensure-admin] Operation failed.');
    process.exitCode = 1;
  })
  .finally(async () => {
    await primaryPool.end();
  });
