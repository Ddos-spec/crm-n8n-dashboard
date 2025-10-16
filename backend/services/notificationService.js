const notificationRepository = require('../repositories/notificationRepository');
const eventBus = require('../lib/eventBus');

const listNotifications = (userId) => notificationRepository.listNotifications(userId);

const createNotification = async (payload) => {
  const { id } = await notificationRepository.createNotification(payload);
  eventBus.emit('notification', { ...payload, id });
  return id;
};

module.exports = {
  listNotifications,
  createNotification
};
