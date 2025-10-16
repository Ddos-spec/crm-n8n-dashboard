const express = require('express');
const followUpController = require('../controllers/followUpController');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

router.use(authenticate);

router.get('/', followUpController.listPending);
router.post('/', authorize('admin', 'manager', 'operator'), followUpController.createFollowUp);
router.patch('/:id/status', authorize('admin', 'manager', 'operator'), followUpController.updateStatus);

module.exports = router;
