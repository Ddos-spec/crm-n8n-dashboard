const { primaryPool } = require('../config/database');

const findByEmail = async (email) => {
  const { rows } = await primaryPool.query(
    `SELECT id, email, password_hash AS "passwordHash", role, full_name AS "fullName"
     FROM dashboard_users WHERE email = $1 LIMIT 1`,
    [email]
  );
  return rows[0];
};

const findById = async (id) => {
  const { rows } = await primaryPool.query(
    `SELECT id, email, role, full_name AS "fullName" FROM dashboard_users WHERE id = $1`,
    [id]
  );
  return rows[0];
};

module.exports = {
  findByEmail,
  findById
};
