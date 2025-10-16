const notificationService = require('../services/notificationService');

const listNotifications = async (req, res, next) => {
  try {
    const notifications = await notificationService.listNotifications(req.user.id);
    res.json({ status: 'success', data: notifications });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  listNotifications
};
