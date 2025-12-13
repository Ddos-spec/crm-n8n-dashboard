import React, { useMemo, useState } from 'react';
import { 
  Target, 
  CheckCircle, 
  Activity, 
  BarChart2, 
  Search,
  Download,
  Plus,
  MoreVertical
} from 'lucide-react';
import { useBusinesses } from '../hooks/useData';
import { StatCard } from '../components/ui/StatCard';
import { Card, CardHeader, CardBody } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';

// Helper for status badge variant
const getStatusVariant = (status: string) => {
  switch (status) {
    case 'new': return 'green';
    case 'contacted': return 'blue';
    case 'qualified': return 'yellow';
    case 'invalid': 
    case 'invalid_whatsapp': return 'red';
    default: return 'gray';
  }
};

const formatScore = (score: any) => {
  const num = parseInt(score);
  return isNaN(num) ? 0 : num;
};

export default function Marketing() {
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  
  const { data: businesses, loading } = useBusinesses({
    status: statusFilter === 'all' ? undefined : statusFilter,
    search: search || undefined,
  });

  const summary = useMemo(() => {
    const total = businesses.length;
    const contacted = businesses.filter((b) => b.message_sent).length;
    // Dummy active campaigns count as it's not in businesses data directly, using fixed or calc
    const activeCampaigns = new Set(businesses.map(b => b.campaign_batch).filter(Boolean)).size;
    const avgScore = total > 0 
      ? Math.round(businesses.reduce((acc, curr) => acc + formatScore(curr.lead_score), 0) / total) 
      : 0;

    return { total, contacted, activeCampaigns, avgScore };
  }, [businesses]);

  return (
    <div className="page active" id="marketing">
      <div className="page-header">
        <h1 className="page-title">Marketing & Leads</h1>
        <p className="page-subtitle">Kelola leads dan campaign WhatsApp</p>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid">
        <StatCard 
          label="Total Leads" 
          value={summary.total.toLocaleString()} 
          icon={<Target size={24} />} 
          color="cyan" 
          miniChart={
            <div className="mini-chart">
              {[40, 60, 35, 80, 55, 90, 70].map((h, i) => (
                <div key={i} className="mini-chart-bar" style={{ height: `${h}%` }}></div>
              ))}
            </div>
          }
        />
        <StatCard 
          label="Contacted" 
          value={summary.contacted.toLocaleString()} 
          icon={<CheckCircle size={24} />} 
          color="green" 
          change="22.9%" 
          trend="up" 
        />
        <StatCard 
          label="Active Campaigns" 
          value={summary.activeCampaigns} 
          icon={<Activity size={24} />} 
          color="pink" 
          change="+3 this month" 
          trend="up" 
        />
        <StatCard 
          label="Avg Lead Score" 
          value={summary.avgScore} 
          icon={<BarChart2 size={24} />} 
          color="blue" 
          miniChart={
            <div className="score-bar" style={{ marginTop: 16 }}>
              <div className="score-bar-track">
                <div 
                  className="score-bar-fill high" 
                  style={{ width: `${summary.avgScore}%` }}
                ></div>
              </div>
            </div>
          }
        />
      </div>

      {/* Filter & Actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div className="filter-pills">
          {['all', 'new', 'contacted', 'qualified', 'invalid'].map((filter) => (
            <button
              key={filter}
              className={`filter-pill ${statusFilter === filter ? 'active' : ''}`}
              onClick={() => setStatusFilter(filter)}
            >
              {filter.charAt(0).toUpperCase() + filter.slice(1)}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <Button variant="secondary" icon={<Download size={16} />}>Export</Button>
          <Button icon={<Plus size={16} />}>Add Lead</Button>
        </div>
      </div>

      {/* Leads Table */}
      <Card>
        <CardHeader 
          title="Leads dari Businesses" 
          icon={<Target size={16} />} 
          action={
            <div style={{ width: 280 }}>
              <Input 
                placeholder="Cari lead..." 
                icon={<Search size={16} />} 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          }
        />
        <CardBody noPadding>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Business Name</th>
                  <th>Phone</th>
                  <th>Status</th>
                  <th>Lead Score</th>
                  <th>Location</th>
                  <th>Campaign</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr><td colSpan={7} style={{textAlign: 'center', padding: 20}}>Memuat data...</td></tr>
                )}
                {!loading && businesses.length === 0 && (
                  <tr><td colSpan={7} style={{textAlign: 'center', padding: 20}}>Tidak ada data ditemukan.</td></tr>
                )}
                {!loading && businesses.map((b) => {
                  const score = formatScore(b.lead_score);
                  let scoreClass = 'low';
                  if (score > 70) scoreClass = 'high';
                  else if (score > 40) scoreClass = 'medium';

                  return (
                    <tr key={b.id}>
                      <td>
                        <div style={{ fontWeight: 500 }}>{b.name}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{b.business_type || 'General'}</div>
                      </td>
                      <td style={{ fontFamily: 'var(--font-mono)', fontSize: 13 }}>{b.phone || '-'}</td>
                      <td>
                        <Badge variant={getStatusVariant(b.status || 'new')} dot>
                          {b.status || 'new'}
                        </Badge>
                      </td>
                      <td>
                        <div className="score-bar">
                          <div className="score-bar-track" style={{ width: 80 }}>
                            <div 
                              className={`score-bar-fill ${scoreClass}`} 
                              style={{ width: `${score}%` }}
                            ></div>
                          </div>
                          <span className="score-value">{score}</span>
                        </div>
                      </td>
                      <td>{b.location || '-'}</td>
                      <td><Badge variant="gray">{b.campaign_batch || '-'}</Badge></td>
                      <td>
                        <Button variant="ghost" size="sm" icon={<MoreVertical size={14} />} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}