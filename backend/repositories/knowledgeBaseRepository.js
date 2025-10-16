const { primaryPool } = require('../config/database');

const listKnowledgeArticles = async () => {
  const { rows } = await primaryPool.query(
    `SELECT id, title, category, content, tags, is_active AS "isActive",
            created_by AS "createdBy", created_at AS "createdAt", updated_at AS "updatedAt"
     FROM knowledge_base
     ORDER BY updated_at DESC`
  );
  return rows;
};

const createArticle = async ({ title, category, content, tags, isActive, createdBy }) => {
  const { rows } = await primaryPool.query(
    `INSERT INTO knowledge_base (title, category, content, tags, is_active, created_by)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id`,
    [title, category, content, tags, isActive, createdBy]
  );
  return rows[0];
};

const updateArticle = async (id, { title, category, content, tags, isActive }) => {
  const fields = [];
  const values = [];

  const mapping = {
    title: 'title',
    category: 'category',
    content: 'content',
    tags: 'tags',
    isActive: 'is_active'
  };

  Object.entries({ title, category, content, tags, isActive }).forEach(([key, value]) => {
    if (value !== undefined) {
      fields.push(`${mapping[key]} = $${fields.length + 1}`);
      values.push(value);
    }
  });

  if (!fields.length) return null;

  values.push(id);
  const query = `UPDATE knowledge_base SET ${fields.join(', ')}, updated_at = NOW() WHERE id = $${fields.length + 1}`;
  await primaryPool.query(query, values);
};

module.exports = {
  listKnowledgeArticles,
  createArticle,
  updateArticle
};
