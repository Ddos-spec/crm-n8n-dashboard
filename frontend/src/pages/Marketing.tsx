import { useMemo, useState } from 'react';
import { useBusinesses, useCampaigns } from '../hooks/useData';

const statusColor = (status: string) => {
  if (status === 'escalation' || status === 'invalid_whatsapp') return 'pill danger';
  if (status === 'pending' || status === 'contacted') return 'pill warning';
  return 'pill success';
};

const statusLabel = (status: string) => {
  if (status === 'invalid_whatsapp') return 'invalid';
  return status || 'unknown';
};

const formatNumber = (num?: number | null) => (typeof num === 'number' ? num.toLocaleString('id-ID') : '-');

export default function Marketing() {
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const { data: campaigns, loading: campaignsLoading } = useCampaigns();
  const { data: businesses, loading: bizLoading } = useBusinesses({
    status: statusFilter === 'all' ? undefined : statusFilter,
    search: search || undefined,
  });

  const summary = useMemo(() => {
    const total = businesses.length;
    const contacted = businesses.filter((b) => b.message_sent).length;
    const invalid = businesses.filter((b) => b.status === 'invalid_whatsapp').length;
    return { total, contacted, invalid };
  }, [businesses]);

  return (
    <div className="stack">
      <header className="hero">
        <div>
          <p className="eyebrow">Marketing</p>
          <h1>Leads dari Businesses</h1>
          <p className="lede">Data langsung dari tabel businesses; filter status atau cari nama/nomor.</p>
          <div className="pill-row" style={{ marginTop: 10 }}>
            <button
              className={statusFilter === 'all' ? 'chip active' : 'chip'}
              type="button"
              onClick={() => setStatusFilter('all')}
            >
              Semua
            </button>
            <button
              className={statusFilter === 'pending' ? 'chip active' : 'chip'}
              type="button"
              onClick={() => setStatusFilter('pending')}
            >
              Pending
            </button>
            <button
              className={statusFilter === 'active' ? 'chip active' : 'chip'}
              type="button"
              onClick={() => setStatusFilter('active')}
            >
              Active
            </button>
            <button
              className={statusFilter === 'escalation' ? 'chip active' : 'chip'}
              type="button"
              onClick={() => setStatusFilter('escalation')}
            >
              Eskalasi
            </button>
          </div>
          <input
            className="input"
            placeholder="Cari nama atau nomor..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ marginTop: 8, maxWidth: 360 }}
          />
        </div>
        <div className="card">
          <div className="stats-grid">
            <div className="summary-card">
              <div className="summary-title">Total Leads</div>
              <div className="summary-value">{summary.total}</div>
              <div className="muted">Dari tabel businesses</div>
            </div>
            <div className="summary-card">
              <div className="summary-title">Contacted</div>
              <div className="summary-value">{summary.contacted}</div>
              <div className="muted">message_sent = true</div>
            </div>
            <div className="summary-card">
              <div className="summary-title">Invalid</div>
              <div className="summary-value">{summary.invalid}</div>
              <div className="muted">status invalid_whatsapp</div>
            </div>
          </div>
        </div>
      </header>

      <section className="section">
        <h2>Batch Campaign (campaign_performance)</h2>
        <div className="table">
          <div className="table-head">
            <span>Batch</span>
            <span>Total Leads</span>
            <span>Contacted</span>
            <span>Invalid</span>
            <span>Avg Score</span>
            <span>Last Batch</span>
          </div>
          {campaignsLoading && <div className="muted">Memuat batch...</div>}
          {!campaignsLoading && campaigns.length === 0 && <div className="muted">Belum ada data batch.</div>}
          {!campaignsLoading &&
            campaigns.map((row) => (
              <div key={row.name} className="table-row">
                <span>{row.name}</span>
                <span>{formatNumber(row.total_leads)}</span>
                <span>{formatNumber(row.contacted)}</span>
                <span>{row.invalid}</span>
                <span>{row.avg_lead_score.toFixed(0)}</span>
                <span>{row.batch_date ? new Date(row.batch_date).toLocaleDateString('id-ID') : '-'}</span>
              </div>
            ))}
        </div>
      </section>

      <section className="section">
        <h2>Leads Businesses</h2>
        <div className="table">
          <div className="table-head">
            <span>Nama</span>
            <span>Status</span>
            <span>Campaign</span>
            <span>Lead Score</span>
            <span>Lokasi</span>
            <span>Created</span>
          </div>
          {bizLoading && <div className="muted">Memuat leads...</div>}
          {!bizLoading && businesses.length === 0 && <div className="muted">Tidak ada data (periksa filter).</div>}
          {!bizLoading &&
            businesses.map((b) => (
              <div key={b.id} className="table-row">
                <span>{b.name ?? 'Tanpa nama'}</span>
                <span className={statusColor(b.status)}>{statusLabel(b.status)}</span>
                <span>{b.campaign_batch ?? '-'}</span>
                <span>{b.lead_score ?? '-'}</span>
                <span>{b.location ?? '-'}</span>
                <span>{new Date(b.created_at).toLocaleDateString('id-ID')}</span>
              </div>
            ))}
        </div>
      </section>
    </div>
  );
}
