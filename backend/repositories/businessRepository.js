const { marketerPool } = require('../config/database');

const listBusinesses = async ({ search, status, priority, assignedTo, limit = 50, offset = 0 }) => {
  const conditions = [];
  const values = [];

  if (search) {
    values.push(`%${search.toLowerCase()}%`);
    conditions.push('(LOWER(name) LIKE $' + values.length + ' OR LOWER(address) LIKE $' + values.length + ')');
  }

  if (status) {
    values.push(status);
    conditions.push('status = $' + values.length);
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
    SELECT id, placeid AS "placeId", name, phone, formattedphonenumber AS "formattedPhoneNumber",
           address, rating, website, businessstatus AS "businessStatus", businesstypes AS "businessTypes",
           searchquery AS "searchQuery", location, marketsegment AS "marketSegment", hasphone AS "hasPhone",
           leadscore AS "leadScore", campaignbatch AS "campaignBatch", status, aiprocessed AS "aiProcessed",
           messagesent AS "messageSent", contactattempts AS "contactAttempts", whatsappvalid AS "whatsappValid",
           messagedeliverystatus AS "messageDeliveryStatus", leadtemperature AS "leadTemperature",
           lastcontacted AS "lastContacted", assigned_to AS "assignedTo", priority_level AS "priorityLevel",
           follow_up_date AS "followUpDate", conversion_status AS "conversionStatus", updatedat AS "updatedAt"
    FROM businesses
    ${whereClause}
    ORDER BY updatedat DESC
    LIMIT $${values.length - 1}
    OFFSET $${values.length}
  `;

  const { rows } = await marketerPool.query(query, values);
  return rows;
};

const updateBusiness = async (id, payload) => {
  const fields = [];
  const values = [];

  Object.entries(payload).forEach(([key, value]) => {
    if (value === undefined || ['updatedBy', 'createdBy'].includes(key)) return;

    const column =
      {
        placeId: 'placeid',
        formattedPhoneNumber: 'formattedphonenumber',
        businessStatus: 'businessstatus',
        businessTypes: 'businesstypes',
        searchQuery: 'searchquery',
        marketSegment: 'marketsegment',
        hasPhone: 'hasphone',
        leadScore: 'leadscore',
        campaignBatch: 'campaignbatch',
        aiProcessed: 'aiprocessed',
        messageSent: 'messagesent',
        contactAttempts: 'contactattempts',
        whatsappValid: 'whatsappvalid',
        messageDeliveryStatus: 'messagedeliverystatus',
        leadTemperature: 'leadtemperature',
        lastContacted: 'lastcontacted',
        assignedTo: 'assigned_to',
        priorityLevel: 'priority_level',
        followUpDate: 'follow_up_date',
        conversionStatus: 'conversion_status'
      }[key] || key;

    fields.push(`${column} = $${fields.length + 1}`);
    values.push(value);
  });

  if (!fields.length) return null;

  values.push(id);
  const query = `UPDATE businesses SET ${fields.join(', ')}, updatedat = NOW() WHERE id = $${fields.length + 1}`;

  await marketerPool.query(query, values);
};

module.exports = {
  listBusinesses,
  updateBusiness
};
