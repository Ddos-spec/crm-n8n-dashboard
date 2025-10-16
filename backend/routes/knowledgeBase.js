const express = require('express');
const knowledgeBaseController = require('../controllers/knowledgeBaseController');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

router.use(authenticate);

router.get('/', knowledgeBaseController.listArticles);
router.post('/', authorize('admin', 'manager'), knowledgeBaseController.createArticle);
router.put('/:id', authorize('admin', 'manager'), knowledgeBaseController.updateArticle);

module.exports = router;
