const knowledgeBaseRepository = require('../repositories/knowledgeBaseRepository');
const activityLogRepository = require('../repositories/activityLogRepository');

const listKnowledgeArticles = () => knowledgeBaseRepository.listKnowledgeArticles();

const createArticle = async (payload) => {
  const { id } = await knowledgeBaseRepository.createArticle(payload);
  await activityLogRepository.logActivity({
    userId: payload.createdBy,
    action: 'create_knowledge',
    details: `Menambahkan konten ${payload.title}`,
    entity: 'knowledge',
    entityId: id
  });
  return id;
};

const updateArticle = async (id, payload) => {
  await knowledgeBaseRepository.updateArticle(id, payload);
  await activityLogRepository.logActivity({
    userId: payload.updatedBy,
    action: 'update_knowledge',
    details: `Memperbarui konten ${id}`,
    entity: 'knowledge',
    entityId: id
  });
};

module.exports = {
  listKnowledgeArticles,
  createArticle,
  updateArticle
};
