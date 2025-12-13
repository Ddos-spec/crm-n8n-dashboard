import React, { useMemo, useState, useCallback, useRef, useEffect } from 'react';
import {
  Target,
  CheckCircle,
  Activity,
  BarChart2,
  Search,
  Download,
  Plus,
  MoreVertical,
  MessageSquare,
  Phone,
  CheckCheck,
  XCircle,
  Eye
} from 'lucide-react';
import { useBusinesses } from '../hooks/useData';
import { api, Business } from '../lib/api';
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

// Actions Dropdown Component
const ActionsDropdown = ({
  business,
  onAction
}: {
  business: Business;
  onAction: (action: string, business: Business) => void;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleAction = (action: string) => {
    setIsOpen(false);
    onAction(action, business);
  };

  return (
    <div className="action-dropdown-wrapper" ref={dropdownRef}>
      <Button
        variant="ghost"
        size="sm"
        icon={<MoreVertical size={14} />}
        onClick={() => setIsOpen(!isOpen)}
      />
      {isOpen && (
        <div className="action-dropdown">
          <button className="action-item" onClick={() => handleAction('view')}>
            <Eye size={14} />
            <span>Lihat Detail</span>
          </button>
          {business.phone && (
            <button className="action-item" onClick={() => handleAction('contact')}>
              <MessageSquare size={14} />
              <span>Hubungi via WA</span>
            </button>
          )}
          {business.phone && (
            <button className="action-item" onClick={() => handleAction('call')}>
              <Phone size={14} />
              <span>Telepon</span>
            </button>
          )}
          <div className="action-divider" />
          {business.status !== 'contacted' && (
            <button className="action-item" onClick={() => handleAction('mark-contacted')}>
              <CheckCheck size={14} />
              <span>Tandai Contacted</span>
            </button>
          )}
          {business.status !== 'qualified' && (
            <button className="action-item" onClick={() => handleAction('mark-qualified')}>
              <CheckCircle size={14} />
              <span>Tandai Qualified</span>
            </button>
          )}
          {business.status !== 'invalid' && (
            <button className="action-item danger" onClick={() => handleAction('mark-invalid')}>
              <XCircle size={14} />
              <span>Tandai Invalid</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};

// Business Detail Modal
const BusinessDetailModal = ({
  business,
  onClose
}: {
  business: Business | null;
  onClose: () => void;
}) => {
  if (!business) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Detail Lead</h3>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>
        <div className="modal-body">
          <div className="detail-row">
            <label>Nama</label>
            <span>{business.name || '-'}</span>
          </div>
          <div className="detail-row">
            <label>Telepon</label>
            <span style={{ fontFamily: 'var(--font-mono)' }}>{business.phone || '-'}</span>
          </div>
          <div className="detail-row">
            <label>Status</label>
            <Badge variant={getStatusVariant(business.status || 'new')} dot>
              {business.status || 'new'}
            </Badge>
          </div>
          <div className="detail-row">
            <label>Lead Score</label>
            <span>{formatScore(business.lead_score)}</span>
          </div>
          <div className="detail-row">
            <label>Lokasi</label>
            <span>{business.location || '-'}</span>
          </div>
          <div className="detail-row">
            <label>Market Segment</label>
            <span>{business.market_segment || '-'}</span>
          </div>
          <div className="detail-row">
            <label>Campaign</label>
            <span>{business.campaign_batch || '-'}</span>
          </div>
          <div className="detail-row">
            <label>Pesan Terkirim</label>
            <span>{business.message_sent ? 'Ya' : 'Belum'}</span>
          </div>
          <div className="detail-row">
            <label>Tanggal Dibuat</label>
            <span>{business.created_at ? new Date(business.created_at).toLocaleDateString('id-ID') : '-'}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function Marketing() {
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [selectedBusiness, setSelectedBusiness] = useState<Business | null>(null);
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  const { data: businesses, loading } = useBusinesses({
    status: statusFilter === 'all' ? undefined : statusFilter,
    search: search || undefined,
  });

  const summary = useMemo(() => {
    const total = businesses.length;
    const contacted = businesses.filter((b) => b.message_sent).length;
    // Active campaigns count
    const activeCampaigns = new Set(businesses.map(b => b.campaign_batch).filter(Boolean)).size;
    const avgScore = total > 0
      ? Math.round(businesses.reduce((acc, curr) => acc + formatScore(curr.lead_score), 0) / total)
      : 0;

    return { total, contacted, activeCampaigns, avgScore };
  }, [businesses]);

  // Handle actions
  const handleAction = useCallback(async (action: string, business: Business) => {
    switch (action) {
      case 'view':
        setSelectedBusiness(business);
        break;

      case 'contact':
        if (business.phone) {
          // Format phone for WhatsApp
          let phone = business.phone.replace(/\D/g, '');
          if (phone.startsWith('0')) {
            phone = '62' + phone.substring(1);
          }
          window.open(`https://wa.me/${phone}`, '_blank');
        }
        break;

      case 'call':
        if (business.phone) {
          window.open(`tel:${business.phone}`, '_blank');
        }
        break;

      case 'mark-contacted':
        try {
          setActionLoading(business.id);
          await api.updateBusiness(business.id, { status: 'contacted', message_sent: true });
          // Refresh would happen automatically if we refetch, but for now just alert
          alert('Status berhasil diubah menjadi Contacted');
          window.location.reload();
        } catch (err) {
          console.error('Failed to update business', err);
          alert('Gagal mengubah status');
        } finally {
          setActionLoading(null);
        }
        break;

      case 'mark-qualified':
        try {
          setActionLoading(business.id);
          await api.updateBusiness(business.id, { status: 'qualified' });
          alert('Status berhasil diubah menjadi Qualified');
          window.location.reload();
        } catch (err) {
          console.error('Failed to update business', err);
          alert('Gagal mengubah status');
        } finally {
          setActionLoading(null);
        }
        break;

      case 'mark-invalid':
        try {
          setActionLoading(business.id);
          await api.updateBusiness(business.id, { status: 'invalid' });
          alert('Status berhasil diubah menjadi Invalid');
          window.location.reload();
        } catch (err) {
          console.error('Failed to update business', err);
          alert('Gagal mengubah status');
        } finally {
          setActionLoading(null);
        }
        break;
    }
  }, []);

  // Export to CSV
  const handleExport = useCallback(() => {
    if (!businesses.length) return;

    const headers = ['Name', 'Phone', 'Status', 'Lead Score', 'Location', 'Campaign', 'Created At'];
    const rows = businesses.map(b => [
      `"${(b.name || '').replace(/"/g, '""')}"`,
      `"${b.phone || ''}"`,
      b.status || '',
      formatScore(b.lead_score),
      `"${(b.location || '').replace(/"/g, '""')}"`,
      `"${(b.campaign_batch || '').replace(/"/g, '""')}"`,
      b.created_at ? new Date(b.created_at).toLocaleDateString('id-ID') : ''
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `leads_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [businesses]);

  return (
    <div className="page active" id="marketing">
      <style>{`
        .action-dropdown-wrapper {
          position: relative;
          display: inline-block;
        }

        .action-dropdown {
          position: absolute;
          right: 0;
          top: 100%;
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: 8px;
          min-width: 180px;
          box-shadow: 0 4px 20px rgba(0,0,0,0.15);
          z-index: 100;
          overflow: hidden;
        }

        .action-item {
          display: flex;
          align-items: center;
          gap: 10px;
          width: 100%;
          padding: 10px 14px;
          border: none;
          background: transparent;
          color: var(--text-primary);
          font-size: 13px;
          cursor: pointer;
          transition: background 0.15s ease;
          text-align: left;
        }

        .action-item:hover {
          background: var(--bg-hover);
        }

        .action-item.danger {
          color: var(--danger);
        }

        .action-item.danger:hover {
          background: rgba(239, 68, 68, 0.1);
        }

        .action-divider {
          height: 1px;
          background: var(--border);
          margin: 4px 0;
        }

        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }

        .modal-content {
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: 12px;
          width: 90%;
          max-width: 500px;
          max-height: 80vh;
          overflow-y: auto;
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 20px;
          border-bottom: 1px solid var(--border);
        }

        .modal-header h3 {
          margin: 0;
          font-size: 16px;
          font-weight: 600;
        }

        .modal-close {
          background: none;
          border: none;
          font-size: 24px;
          color: var(--text-muted);
          cursor: pointer;
          line-height: 1;
        }

        .modal-close:hover {
          color: var(--text-primary);
        }

        .modal-body {
          padding: 20px;
        }

        .detail-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 10px 0;
          border-bottom: 1px solid var(--border);
        }

        .detail-row:last-child {
          border-bottom: none;
        }

        .detail-row label {
          color: var(--text-muted);
          font-size: 13px;
        }

        .detail-row span {
          font-size: 14px;
          font-weight: 500;
        }
      `}</style>

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
          <Button variant="secondary" icon={<Download size={16} />} onClick={handleExport}>Export</Button>
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
                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{b.market_segment || 'General'}</div>
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
                        <ActionsDropdown business={b} onAction={handleAction} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardBody>
      </Card>

      {/* Business Detail Modal */}
      <BusinessDetailModal
        business={selectedBusiness}
        onClose={() => setSelectedBusiness(null)}
      />
    </div>
  );
}
