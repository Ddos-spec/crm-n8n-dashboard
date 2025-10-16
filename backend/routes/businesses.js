const express = require('express');
const businessController = require('../controllers/businessController');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

router.use(authenticate);

router.get('/', businessController.listBusinesses);
router.put('/:id', authorize('admin', 'manager'), businessController.updateBusiness);

module.exports = router;
