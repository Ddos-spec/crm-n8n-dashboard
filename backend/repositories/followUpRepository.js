const { primaryPool } = require('../config/database');

const listPendingFollowUps = async () => {
  const { rows } = await primaryPool.query(
    `SELECT f.id, f.customer_id AS "customerId", f.business_id AS "businessId", f.channel,
            f.notes, f.scheduled_at AS "scheduledAt", f.status, f.assigned_to AS "assignedTo",
            f.created_at AS "createdAt", f.updated_at AS "updatedAt",
            c.name AS "customerName", b.name AS "businessName"
     FROM follow_ups f
     LEFT JOIN customers c ON f.customer_id = c.id
     LEFT JOIN businesses b ON f.business_id = b.id
     WHERE f.status = 'pending' AND f.scheduled_at <= NOW() + INTERVAL '1 day'
     ORDER BY f.scheduled_at ASC`
  );
  return rows;
};

const createFollowUp = async (payload) => {
  const { customerId, businessId, channel, notes, scheduledAt, assignedTo, createdBy } = payload;
  const { rows } = await primaryPool.query(
    `INSERT INTO follow_ups (customer_id, business_id, channel, notes, scheduled_at, status, assigned_to, created_by)
     VALUES ($1, $2, $3, $4, $5, 'pending', $6, $7)
     RETURNING id`,
    [customerId, businessId, channel, notes, scheduledAt, assignedTo, createdBy]
  );
  return rows[0];
};

const updateFollowUpStatus = async (id, status) => {
  const { rows } = await primaryPool.query(
    `UPDATE follow_ups SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
    [status, id]
  );
  return rows[0];
};

module.exports = {
  listPendingFollowUps,
  createFollowUp,
  updateFollowUpStatus
};
