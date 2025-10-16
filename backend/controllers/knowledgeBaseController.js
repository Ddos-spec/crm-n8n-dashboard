const knowledgeBaseService = require('../services/knowledgeBaseService');

const listArticles = async (_req, res, next) => {
  try {
    const articles = await knowledgeBaseService.listKnowledgeArticles();
    res.json({ status: 'success', data: articles });
  } catch (error) {
    next(error);
  }
};

const createArticle = async (req, res, next) => {
  try {
    const id = await knowledgeBaseService.createArticle({
      ...req.body,
      createdBy: req.user.id
    });
    res.status(201).json({ status: 'success', data: { id } });
  } catch (error) {
    next(error);
  }
};

const updateArticle = async (req, res, next) => {
  try {
    await knowledgeBaseService.updateArticle(req.params.id, {
      ...req.body,
      updatedBy: req.user.id
    });
    res.json({ status: 'success', message: 'Artikel diperbarui' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  listArticles,
  createArticle,
  updateArticle
};
