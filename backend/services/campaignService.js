const axios = require('axios');
const campaignRepository = require('../repositories/campaignRepository');
const activityLogRepository = require('../repositories/activityLogRepository');
const eventBus = require('../lib/eventBus');

const listCampaigns = () => campaignRepository.listCampaigns();

const createCampaign = async (payload) => {
  const { id } = await campaignRepository.createCampaign(payload);
  await activityLogRepository.logActivity({
    userId: payload.createdBy,
    action: 'create_campaign',
    details: `Membuat kampanye ${payload.name}`,
    entity: 'campaign',
    entityId: id
  });
  eventBus.emit('campaign_created', { id });
  return campaignRepository.listCampaigns();
};

const changeCampaignStatus = async (id, status, userId) => {
  const updated = await campaignRepository.updateCampaignStatus(id, status);
  await activityLogRepository.logActivity({
    userId,
    action: 'update_campaign_status',
    details: `Mengubah status kampanye ${id} menjadi ${status}`,
    entity: 'campaign',
    entityId: id
  });
  eventBus.emit('campaign_updated', { id, status });
  return updated;
};

const triggerN8nWorkflow = async (path, payload) => {
  const url = `${process.env.N8N_WEBHOOK_URL}${path}`;
  await axios.post(url, payload);
};

module.exports = {
  listCampaigns,
  createCampaign,
  changeCampaignStatus,
  triggerN8nWorkflow
};
