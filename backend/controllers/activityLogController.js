const activityLogRepository = require('../repositories/activityLogRepository');

const listActivities = async (_req, res, next) => {
  try {
    const activities = await activityLogRepository.listRecentActivities();
    res.json({ status: 'success', data: activities });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  listActivities
};
