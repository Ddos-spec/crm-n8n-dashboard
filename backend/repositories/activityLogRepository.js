const { primaryPool } = require('../config/database');

const logActivity = async ({ userId, action, details, entity, entityId }) => {
  await primaryPool.query(
    `INSERT INTO activity_log (user_id, action, details, entity, entity_id)
     VALUES ($1, $2, $3, $4, $5)`,
    [userId, action, details, entity, entityId]
  );
};

const listRecentActivities = async (limit = 50) => {
  const { rows } = await primaryPool.query(
    `SELECT id, user_id AS "userId", action, details, entity, entity_id AS "entityId",
            created_at AS "createdAt"
     FROM activity_log
     ORDER BY created_at DESC
     LIMIT $1`,
    [limit]
  );
  return rows;
};

module.exports = {
  logActivity,
  listRecentActivities
};
