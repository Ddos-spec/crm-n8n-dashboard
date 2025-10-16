const express = require('express');
const authRoutes = require('./auth');
const customerRoutes = require('./customers');
const businessRoutes = require('./businesses');
const campaignRoutes = require('./campaigns');
const followUpRoutes = require('./followUps');
const knowledgeBaseRoutes = require('./knowledgeBase');
const analyticsRoutes = require('./analytics');
const notificationRoutes = require('./notifications');
const activityLogRoutes = require('./activityLog');
const webhookRoutes = require('./webhooks');

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/customers', customerRoutes);
router.use('/businesses', businessRoutes);
router.use('/campaigns', campaignRoutes);
router.use('/follow-ups', followUpRoutes);
router.use('/knowledge-base', knowledgeBaseRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/notifications', notificationRoutes);
router.use('/activity-log', activityLogRoutes);
router.use('/webhooks', webhookRoutes);

module.exports = router;
