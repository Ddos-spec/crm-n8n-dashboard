const customerRepository = require('../repositories/customerRepository');
const activityLogRepository = require('../repositories/activityLogRepository');
const eventBus = require('../lib/eventBus');

const listCustomers = (filters) => customerRepository.listCustomers(filters);

const getCustomer = (id) => customerRepository.findCustomerById(id);

const createCustomer = async (payload) => {
  const { id } = await customerRepository.createCustomer(payload);
  await activityLogRepository.logActivity({
    userId: payload.createdBy,
    action: 'create_customer',
    details: `Menambahkan pelanggan ${payload.name}`,
    entity: 'customer',
    entityId: id
  });
  eventBus.emit('customer_updated', { id, type: 'created' });
  return customerRepository.findCustomerById(id);
};

const updateCustomer = async (id, payload) => {
  const { updatedBy, ...data } = payload;
  const updated = await customerRepository.updateCustomer(id, data);
  if (updated) {
    await activityLogRepository.logActivity({
      userId: updatedBy || 'system',
      action: 'update_customer',
      details: `Memperbarui pelanggan ${id}`,
      entity: 'customer',
      entityId: id
    });
    eventBus.emit('customer_updated', { id, type: 'updated' });
  }
  return updated;
};

module.exports = {
  listCustomers,
  getCustomer,
  createCustomer,
  updateCustomer
};
