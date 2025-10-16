const followUpService = require('../services/followUpService');

const listPending = async (_req, res, next) => {
  try {
    const followUps = await followUpService.listPendingFollowUps();
    res.json({ status: 'success', data: followUps });
  } catch (error) {
    next(error);
  }
};

const createFollowUp = async (req, res, next) => {
  try {
    const id = await followUpService.createFollowUp({
      ...req.body,
      createdBy: req.user.id
    });
    res.status(201).json({ status: 'success', data: { id } });
  } catch (error) {
    next(error);
  }
};

const updateStatus = async (req, res, next) => {
  try {
    await followUpService.updateFollowUpStatus(req.params.id, req.body.status, req.user.id);
    res.json({ status: 'success', message: 'Status tindak lanjut diperbarui' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  listPending,
  createFollowUp,
  updateStatus
};
