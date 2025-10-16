const customerRepository = require('../repositories/customerRepository');
const chatRepository = require('../repositories/chatRepository');
const businessRepository = require('../repositories/businessRepository');
const eventBus = require('../lib/eventBus');

const handleCustomerMessage = async (payload) => {
  const { customerId, messageType, content, messageId, classification, aiConfidence, escalated } = payload;
  if (customerId) {
    await chatRepository.addChatMessage({
      customerId,
      messageType,
      content,
      messageId,
      classification,
      aiConfidence,
      escalated
    });
    await customerRepository.updateCustomer(customerId, {
      lastMessageAt: new Date(),
      messageCountToday: payload.messageCountToday,
      conversationStage: payload.conversationStage,
      updatedBy: 'system'
    });
    eventBus.emit('new_message', { customerId, content, messageType });
  }
};

const handleNewLead = async (payload) => {
  await businessRepository.updateBusiness(payload.businessId, {
    leadTemperature: payload.leadTemperature,
    status: payload.status,
    updatedBy: 'system'
  });
  eventBus.emit('new_lead', payload);
};

const handleCampaignStats = async (payload) => {
  eventBus.emit('campaign_stats', payload);
};

module.exports = {
  handleCustomerMessage,
  handleNewLead,
  handleCampaignStats
};
