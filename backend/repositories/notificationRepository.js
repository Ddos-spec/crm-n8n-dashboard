const { primaryPool } = require('../config/database');

const listNotifications = async (userId) => {
  const { rows } = await primaryPool.query(
    `SELECT id, user_id AS "userId", title, message, type, is_read AS "isRead",
            metadata, created_at AS "createdAt"
     FROM notifications
     WHERE user_id = $1 OR user_id IS NULL
     ORDER BY created_at DESC
     LIMIT 50`,
    [userId]
  );
  return rows;
};

const createNotification = async ({ userId, title, message, type, metadata }) => {
  const { rows } = await primaryPool.query(
    `INSERT INTO notifications (user_id, title, message, type, metadata)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id`,
    [userId, title, message, type, metadata]
  );
  return rows[0];
};

module.exports = {
  listNotifications,
  createNotification
};
