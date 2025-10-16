const businessRepository = require('../repositories/businessRepository');
const activityLogRepository = require('../repositories/activityLogRepository');
const eventBus = require('../lib/eventBus');

const listBusinesses = (filters) => businessRepository.listBusinesses(filters);

const updateBusiness = async (id, payload) => {
  const { updatedBy, ...data } = payload;
  await businessRepository.updateBusiness(id, data);
  await activityLogRepository.logActivity({
    userId: updatedBy || 'system',
    action: 'update_business',
    details: `Memperbarui prospek bisnis ${id}`,
    entity: 'business',
    entityId: id
  });
  eventBus.emit('business_updated', { id, type: 'updated' });
};

module.exports = {
  listBusinesses,
  updateBusiness
};
