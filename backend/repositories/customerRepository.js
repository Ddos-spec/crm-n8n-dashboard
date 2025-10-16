const { primaryPool } = require('../config/database');

const listCustomers = async ({ search, stage, priority, assignedTo, limit = 50, offset = 0 }) => {
  const conditions = [];
  const values = [];

  if (search) {
    values.push(`%${search.toLowerCase()}%`);
    conditions.push('(LOWER(name) LIKE $' + values.length + ' OR phone LIKE $' + values.length + ')');
  }

  if (stage) {
    values.push(stage);
    conditions.push('conversationstage = $' + values.length);
  }

  if (priority) {
    values.push(priority);
    conditions.push('priority_level = $' + values.length);
  }

  if (assignedTo) {
    values.push(assignedTo);
    conditions.push('assigned_to = $' + values.length);
  }

  values.push(limit);
  values.push(offset);

  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const query = `
    SELECT id, phone, name, lastmessageat AS "lastMessageAt", messagecounttoday AS "messageCountToday",
           conversationstage AS "conversationStage", location, material, hassizeinfo AS "hasSizeInfo",
           iscooldownactive AS "isCooldownActive", cooldownuntil AS "cooldownUntil",
           lead_source AS "leadSource", priority_level AS "priorityLevel", assigned_to AS "assignedTo",
           tags, notes, campaign_id AS "campaignId", createdat AS "createdAt", updatedat AS "updatedAt"
    FROM customers
    ${whereClause}
    ORDER BY updatedat DESC
    LIMIT $${values.length - 1}
    OFFSET $${values.length}
  `;

  const { rows } = await primaryPool.query(query, values);
  return rows;
};

const findCustomerById = async (id) => {
  const { rows } = await primaryPool.query(
    `SELECT id, phone, name, lastmessageat AS "lastMessageAt", messagecounttoday AS "messageCountToday",
            conversationstage AS "conversationStage", location, material, hassizeinfo AS "hasSizeInfo",
            iscooldownactive AS "isCooldownActive", cooldownuntil AS "cooldownUntil",
            lead_source AS "leadSource", priority_level AS "priorityLevel", assigned_to AS "assignedTo",
            tags, notes, campaign_id AS "campaignId", createdat AS "createdAt", updatedat AS "updatedAt"
     FROM customers WHERE id = $1`,
    [id]
  );
  return rows[0];
};

const createCustomer = async (payload) => {
  const {
    phone,
    name,
    leadSource,
    priorityLevel,
    assignedTo,
    tags,
    notes,
    campaignId
  } = payload;

  const { rows } = await primaryPool.query(
    `INSERT INTO customers (phone, name, lead_source, priority_level, assigned_to, tags, notes, campaign_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING id`,
    [phone, name, leadSource, priorityLevel, assignedTo, tags, notes, campaignId]
  );
  return rows[0];
};

const updateCustomer = async (id, payload) => {
  const fields = [];
  const values = [];

  Object.entries(payload).forEach(([key, value]) => {
    if (value === undefined || ['updatedBy', 'createdBy'].includes(key)) return;

    const column =
      {
        leadSource: 'lead_source',
        priorityLevel: 'priority_level',
        assignedTo: 'assigned_to',
        campaignId: 'campaign_id',
        lastMessageAt: 'lastmessageat',
        messageCountToday: 'messagecounttoday',
        conversationStage: 'conversationstage',
        hasSizeInfo: 'hassizeinfo',
        isCooldownActive: 'iscooldownactive',
        cooldownUntil: 'cooldownuntil'
      }[key] || key;

    fields.push(`${column} = $${fields.length + 1}`);
    values.push(value);
  });

  if (!fields.length) return null;

  values.push(id);
  const query = `UPDATE customers SET ${fields.join(', ')}, updatedat = NOW() WHERE id = $${fields.length + 1}`;

  await primaryPool.query(query, values);
  return findCustomerById(id);
};

module.exports = {
  listCustomers,
  findCustomerById,
  createCustomer,
  updateCustomer
};
