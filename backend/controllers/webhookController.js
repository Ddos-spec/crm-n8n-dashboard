const webhookService = require('../services/webhookService');

const customerMessage = async (req, res, next) => {
  try {
    await webhookService.handleCustomerMessage(req.body);
    res.json({ status: 'success' });
  } catch (error) {
    next(error);
  }
};

const newLead = async (req, res, next) => {
  try {
    await webhookService.handleNewLead(req.body);
    res.json({ status: 'success' });
  } catch (error) {
    next(error);
  }
};

const campaignStats = async (req, res, next) => {
  try {
    await webhookService.handleCampaignStats(req.body);
    res.json({ status: 'success' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  customerMessage,
  newLead,
  campaignStats
};
