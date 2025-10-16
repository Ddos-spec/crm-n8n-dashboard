const { primaryPool } = require('../config/database');

const getConversationSummary = async () => {
  const { rows } = await primaryPool.query(
    `SELECT total_conversations AS "totalConversations",
            avg_response_time AS "avgResponseTime",
            satisfaction_score AS "satisfactionScore",
            resolution_rate AS "resolutionRate",
            created_at AS "createdAt"
     FROM conversation_analytics
     ORDER BY created_at DESC
     LIMIT 1`
  );
  return rows[0];
};

module.exports = {
  getConversationSummary
};
