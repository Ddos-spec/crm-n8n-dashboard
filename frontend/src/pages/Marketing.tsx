import { useMemo, useState } from 'react';
import { useBusinesses } from '../hooks/useData';

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
const formatScore = (v: unknown) => {
  const n = Number(v);
  return Number.isFinite(n) ? n.toFixed(0) : '-';
};

export default function Marketing() {
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const { data: businesses, loading: bizLoading } = useBusinesses({
    status: statusFilter === 'all' ? undefined : statusFilter,
    search: search || undefined,
  });

  const summary = useMemo(() => {
    const total = businesses.length;
    const contacted = businesses.filter((b) => b.message_sent).length;
    return { total, contacted };
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
              <div className="summary-title">Leads Businesses</div>
              <div className="summary-value">{summary.total}</div>
              <div className="muted">Siap dihubungi</div>
            </div>
          </div>
        </div>
      </header>

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
