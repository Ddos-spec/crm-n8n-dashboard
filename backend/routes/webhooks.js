const express = require('express');
const webhookController = require('../controllers/webhookController');

const router = express.Router();

router.post('/customer-message', webhookController.customerMessage);
router.post('/new-lead', webhookController.newLead);
router.post('/campaign-stats', webhookController.campaignStats);

module.exports = router;
