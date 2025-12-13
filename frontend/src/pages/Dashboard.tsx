import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { 
  Users, 
  MessageSquare, 
  AlertTriangle, 
  Target, 
  ChevronRight,
  UserPlus,
  Settings,
  MoreHorizontal
} from 'lucide-react';
import { useCampaigns, useCustomers, useEscalations, useDashboardStats } from '../hooks/useData';
import { StatCard } from '../components/ui/StatCard';
import { Card, CardHeader, CardBody } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';

export default function Dashboard() {
  const { data: stats, loading: statsLoading } = useDashboardStats();
  const { data: customers } = useCustomers();
  const { data: escalations } = useEscalations();
  const { data: campaigns } = useCampaigns();

  // Logic to calculate active/pending breakdown based on real data
  const customerStats = useMemo(() => {
    const totals = { active: 0, pending: 0, inactive: 0 };
    customers.forEach((c) => {
      // Robust check for status strings
      const s = c.status?.toLowerCase() || 'pending';
      if (s === 'active') totals.active += 1;
      else if (s === 'pending') totals.pending += 1;
      else totals.inactive += 1;
    });
    return totals;
  }, [customers]);

  const totalCustomers = customers.length || 1; 
  const activePct = Math.round((customerStats.active / totalCustomers) * 100);

  return (
    <div className="page active">
      <div className="page-header">
        <h1 className="page-title">Dashboard Overview</h1>
        <p className="page-subtitle">Monitor kinerja bisnis dan aktivitas real-time</p>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid">
        <StatCard 
          label="Total Customers" 
          value={statsLoading ? "..." : stats.totalCustomers.toLocaleString()} 
          icon={<Users size={24} />} 
          color="green" 
          change={statsLoading ? undefined : stats.customerTrend} 
          trend={stats.customerTrendStatus} 
        />
        <StatCard 
          label="Total Chats" 
          value={statsLoading ? "..." : stats.totalChats.toLocaleString()} 
          icon={<MessageSquare size={24} />} 
          color="blue" 
          change={statsLoading ? undefined : stats.chatTrend} 
          trend={stats.chatTrendStatus} 
        />
        <StatCard 
          label="Open Escalations" 
          value={statsLoading ? "..." : stats.openEscalations.toLocaleString()} 
          icon={<AlertTriangle size={24} />} 
          color="orange" 
          change={statsLoading ? undefined : stats.escTrend} 
          // For Escalations: Up means Bad (Red), Down means Good (Green). 
          // StatCard usually colors trend based on up/down. We might need to override color logic in StatCard or just accept it.
          // Let's assume standard logic: Up = Green, Down = Red. 
          // Ideally we pass a specific color for the trend badge.
          // For now, let's keep it simple. If it goes down, it shows red arrow down.
          trend={stats.escTrendStatus} 
        />
        <StatCard 
          label="Leads Bulan Ini" 
          value={statsLoading ? "..." : stats.leadsThisMonth.toLocaleString()} 
          icon={<Target size={24} />} 
          color="purple" 
          change={statsLoading ? undefined : stats.leadsTrend} 
          trend={stats.leadsTrendStatus} 
        />
      </div>

      {/* Content Grid */}
      <div className="grid-2" style={{ marginBottom: 24 }}>
        {/* Customer Status - Real Data */}
        <Card>
          <CardHeader 
            title="Status Customer" 
            icon={<Users size={16} />}
            action={<Button variant="ghost" size="sm">Lihat Semua</Button>}
          />
          <CardBody>
            <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
              <div className="progress-ring">
                <svg width="120" height="120">
                  <circle className="bg" cx="60" cy="60" r="52" />
                  <circle 
                    className="progress" 
                    cx="60" 
                    cy="60" 
                    r="52" 
                    strokeDasharray="327" 
                    strokeDashoffset={327 - (327 * activePct) / 100} 
                  />
                </svg>
                <div className="value">
                  <strong>{activePct}%</strong>
                  <span>Active</span>
                </div>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ marginBottom: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontSize: 14 }}>Active</span>
                    <span style={{ fontSize: 14, fontFamily: 'var(--font-mono)', color: 'var(--accent)' }}>
                      {customerStats.active}
                    </span>
                  </div>
                  <div className="score-bar">
                    <div className="score-bar-track">
                      <div className="score-bar-fill high" style={{ width: `${(customerStats.active / totalCustomers) * 100}%` }}></div>
                    </div>
                  </div>
                </div>
                <div style={{ marginBottom: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontSize: 14 }}>Pending</span>
                    <span style={{ fontSize: 14, fontFamily: 'var(--font-mono)', color: 'var(--warning)' }}>
                      {customerStats.pending}
                    </span>
                  </div>
                  <div className="score-bar">
                    <div className="score-bar-track">
                      <div className="score-bar-fill medium" style={{ width: `${(customerStats.pending / totalCustomers) * 100}%` }}></div>
                    </div>
                  </div>
                </div>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontSize: 14 }}>Inactive</span>
                    <span style={{ fontSize: 14, fontFamily: 'var(--font-mono)', color: 'var(--danger)' }}>
                      {customerStats.inactive}
                    </span>
                  </div>
                  <div className="score-bar">
                    <div className="score-bar-track">
                      <div className="score-bar-fill low" style={{ width: `${(customerStats.inactive / totalCustomers) * 100}%` }}></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Recent Campaigns - Real Data */}
        <Card>
          <CardHeader 
            title="Campaign Terbaru" 
            icon={<Target size={16} />}
            action={<Button variant="ghost" size="sm">Lihat Semua</Button>}
          />
          <CardBody>
            {campaigns.slice(0, 4).map((c, i) => (
              <div key={i} className="campaign-card">
                <div className="campaign-info">
                  <h4>{c.name}</h4>
                  <p>Batch {c.batch_date ? new Date(c.batch_date).toLocaleDateString('id-ID') : 'N/A'}</p>
                </div>
                <div className="campaign-stats">
                  <div className="leads">{c.total_leads}</div>
                  <div className="contacted">Contacted: {c.contacted}</div>
                </div>
              </div>
            ))}
            {campaigns.length === 0 && <div className="muted" style={{textAlign: 'center', padding: 20}}>Belum ada campaign</div>}
          </CardBody>
        </Card>
      </div>

      {/* Escalations & Quick Actions - Real Data */}
      <div className="grid-2">
        {/* Open Escalations */}
        <Card>
          <CardHeader 
            title="Escalations Terbuka" 
            icon={<AlertTriangle size={16} />}
            iconColor="var(--danger)"
            iconBg="rgba(239, 68, 68, 0.15)"
            action={<Badge variant="red" dot>{stats.openEscalations} Open</Badge>}
          />
          <CardBody noPadding>
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Customer</th>
                    <th>Issue</th>
                    <th>Priority</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {escalations.slice(0, 3).map((e, i) => (
                    <tr key={i}>
                      <td>
                        <div style={{ fontWeight: 500 }}>{e.name}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{e.phone}</div> 
                      </td>
                      <td><Badge variant="blue">{e.issue.length > 20 ? e.issue.substring(0, 20) + '...' : e.issue}</Badge></td>
                      <td>
                        <Badge variant={e.priority === 'high' ? 'red' : 'yellow'} dot>
                          {e.priority}
                        </Badge>
                      </td>
                      <td><Badge variant="yellow">{e.status}</Badge></td>
                    </tr>
                  ))}
                  {escalations.length === 0 && (
                    <tr><td colSpan={4} style={{textAlign: 'center', padding: 20}}>Tidak ada eskalasi aktif</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardBody>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader 
            title="Quick Actions" 
            icon={<Settings size={16} />}
            iconColor="var(--purple)"
            iconBg="rgba(139, 92, 246, 0.15)"
          />
          <CardBody>
            <div className="quick-actions">
              <div className="quick-action">
                <div className="quick-action-icon stat-icon green">
                  <UserPlus size={20} />
                </div>
                <div className="quick-action-label">Add Customer</div>
              </div>
              <div className="quick-action">
                <div className="quick-action-icon stat-icon blue">
                  <MessageSquare size={20} />
                </div>
                <div className="quick-action-label">Start Chat</div>
              </div>
              <div className="quick-action">
                <div className="quick-action-icon stat-icon purple">
                  <Target size={20} />
                </div>
                <div className="quick-action-label">New Campaign</div>
              </div>
              <div className="quick-action">
                <div className="quick-action-icon stat-icon orange">
                  <Settings size={20} />
                </div>
                <div className="quick-action-label">Settings</div>
              </div>
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}