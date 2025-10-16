const { primaryPool } = require('../config/database');

const addChatMessage = async ({ customerId, messageType, content, messageId, classification, aiConfidence, escalated }) => {
  const { rows } = await primaryPool.query(
    `INSERT INTO chathistory (customerid, messagetype, content, messageid, classification, aiconfidence, escalated)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id`,
    [customerId, messageType, content, messageId, classification, aiConfidence, escalated]
  );
  return rows[0];
};

module.exports = {
  addChatMessage
};
