const analyticsRepository = require('../repositories/analyticsRepository');

const getConversationSummary = () => analyticsRepository.getConversationSummary();

module.exports = {
  getConversationSummary
};
