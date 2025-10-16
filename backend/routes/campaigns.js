const express = require('express');
const campaignController = require('../controllers/campaignController');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

router.use(authenticate);

router.get('/', campaignController.listCampaigns);
router.post('/', authorize('admin', 'manager'), campaignController.createCampaign);
router.patch('/:id/status', authorize('admin', 'manager'), campaignController.changeStatus);
router.post('/trigger', authorize('admin', 'manager'), campaignController.triggerWorkflow);

module.exports = router;
