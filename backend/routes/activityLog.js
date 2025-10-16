const express = require('express');
const activityLogController = require('../controllers/activityLogController');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

router.use(authenticate);

router.get('/', activityLogController.listActivities);

module.exports = router;
