import { useEffect, useState } from 'react';
import api from '../services/api';
import { Users, ShoppingBag, AlertCircle } from 'lucide-react';

interface DashboardStats {
  total_businesses: number;
  active_customers: number;
  unresolved_escalations: number;
}

const StatCard = ({ title, value, icon: Icon, color }: { title: string, value: number, icon: any, color: string }) => (
  <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-100 flex items-center space-x-4">
    <div className={`p-3 rounded-full ${color} text-white`}>
      <Icon size={24} />
    </div>
    <div>
      <p className="text-sm text-slate-500">{title}</p>
      <p className="text-2xl font-bold text-slate-800">{value}</p>
    </div>
  </div>
);

const Dashboard = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await api.get('/analytics/dashboard');
        setStats(response.data);
      } catch (error) {
        console.error('Failed to fetch dashboard stats', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
    const interval = setInterval(fetchStats, 10000); // Refresh every 10s
    return () => clearInterval(interval);
  }, []);

  if (loading) return <div className="p-8">Loading...</div>;

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6 text-slate-800">Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <StatCard
          title="Total Businesses"
          value={stats?.total_businesses || 0}
          icon={ShoppingBag}
          color="bg-blue-500"
        />
        <StatCard
          title="Active Customers"
          value={stats?.active_customers || 0}
          icon={Users}
          color="bg-teal-500"
        />
        <StatCard
          title="Unresolved Escalations"
          value={stats?.unresolved_escalations || 0}
          icon={AlertCircle}
          color="bg-red-500"
        />
      </div>

      <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-100">
        <h2 className="text-lg font-bold mb-4">Welcome to CRM Automation</h2>
        <p className="text-slate-600">
          This dashboard connects to your Easypanel backend. The stats above are fetched from the API.
          Use the sidebar to navigate to other modules.
        </p>
      </div>
    </div>
  );
};

export default Dashboard;
