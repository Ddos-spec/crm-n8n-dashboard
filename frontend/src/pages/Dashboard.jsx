import Layout from '../components/Layout.jsx';
import DashboardOverview from '../components/Dashboard.jsx';
import BusinessLeads from '../components/BusinessLeads.jsx';
import CampaignManager from '../components/CampaignManager.jsx';
import ConversationView from '../components/ConversationView.jsx';

const DashboardPage = () => (
  <Layout>
    <div className="space-y-6">
      <DashboardOverview />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <CampaignManager />
          <BusinessLeads />
        </div>
        <ConversationView />
      </div>
    </div>
  </Layout>
);

export default DashboardPage;
