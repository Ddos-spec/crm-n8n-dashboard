const campaignService = require('../services/campaignService');

const listCampaigns = async (_req, res, next) => {
  try {
    const campaigns = await campaignService.listCampaigns();
    res.json({ status: 'success', data: campaigns });
  } catch (error) {
    next(error);
  }
};

const createCampaign = async (req, res, next) => {
  try {
    const campaigns = await campaignService.createCampaign({
      ...req.body,
      createdBy: req.user.id
    });
    res.status(201).json({ status: 'success', data: campaigns });
  } catch (error) {
    next(error);
  }
};

const changeStatus = async (req, res, next) => {
  try {
    const updated = await campaignService.changeCampaignStatus(
      req.params.id,
      req.body.status,
      req.user.id
    );
    res.json({ status: 'success', data: updated });
  } catch (error) {
    next(error);
  }
};

const triggerWorkflow = async (req, res, next) => {
  try {
    await campaignService.triggerN8nWorkflow(req.body.path, req.body.payload);
    res.json({ status: 'success', message: 'Workflow berhasil dipicu' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  listCampaigns,
  createCampaign,
  changeStatus,
  triggerWorkflow
};
