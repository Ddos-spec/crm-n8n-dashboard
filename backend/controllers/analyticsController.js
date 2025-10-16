const analyticsService = require('../services/analyticsService');

const getSummary = async (_req, res, next) => {
  try {
    const summary = await analyticsService.getConversationSummary();
    res.json({ status: 'success', data: summary });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getSummary
};
