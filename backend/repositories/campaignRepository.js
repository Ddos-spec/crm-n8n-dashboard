const { primaryPool } = require('../config/database');

const listCampaigns = async () => {
  const { rows } = await primaryPool.query(
    `SELECT id, name, description, status, start_date AS "startDate", end_date AS "endDate",
            target_audience AS "targetAudience", channel, budget, success_metric AS "successMetric",
            created_by AS "createdBy", created_at AS "createdAt", updated_at AS "updatedAt"
     FROM marketing_campaigns
     ORDER BY created_at DESC`
  );
  return rows;
};

const createCampaign = async (payload) => {
  const {
    name,
    description,
    targetAudience,
    channel,
    budget,
    successMetric,
    createdBy
  } = payload;

  const { rows } = await primaryPool.query(
    `INSERT INTO marketing_campaigns
      (name, description, status, target_audience, channel, budget, success_metric, created_by)
     VALUES ($1, $2, 'draft', $3, $4, $5, $6, $7)
     RETURNING id`,
    [name, description, targetAudience, channel, budget, successMetric, createdBy]
  );

  return rows[0];
};

const updateCampaignStatus = async (id, status) => {
  const { rows } = await primaryPool.query(
    `UPDATE marketing_campaigns SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
    [status, id]
  );
  return rows[0];
};

module.exports = {
  listCampaigns,
  createCampaign,
  updateCampaignStatus
};
