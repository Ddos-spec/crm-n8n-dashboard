const followUpRepository = require('../repositories/followUpRepository');
const activityLogRepository = require('../repositories/activityLogRepository');
const eventBus = require('../lib/eventBus');

const listPendingFollowUps = () => followUpRepository.listPendingFollowUps();

const createFollowUp = async (payload) => {
  const { id } = await followUpRepository.createFollowUp(payload);
  await activityLogRepository.logActivity({
    userId: payload.createdBy,
    action: 'create_follow_up',
    details: 'Menjadwalkan tindak lanjut baru',
    entity: 'follow_up',
    entityId: id
  });
  eventBus.emit('pending_followups', { id });
  return id;
};

const updateFollowUpStatus = async (id, status, userId) => {
  await followUpRepository.updateFollowUpStatus(id, status);
  await activityLogRepository.logActivity({
    userId,
    action: 'update_follow_up_status',
    details: `Mengubah status tindak lanjut ${id} menjadi ${status}`,
    entity: 'follow_up',
    entityId: id
  });
};

module.exports = {
  listPendingFollowUps,
  createFollowUp,
  updateFollowUpStatus
};
