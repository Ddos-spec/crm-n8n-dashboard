import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useCampaigns, useCustomers, useEscalations } from '../hooks/useData';

export default function Dashboard() {
  const [showEscalations, setShowEscalations] = useState(false);
  const { data: customers } = useCustomers();
  const { data: escalations } = useEscalations();
  const { data: campaigns } = useCampaigns();
  const engagementStats: { name: string; priority: string; totalChats: number; lastChat: string }[] = [];
  const customerStats = useMemo(() => {
    const totals = { active: 0, pending: 0, escalation: 0 };
    customers.forEach((c) => {
      if (c.status === 'active') totals.active += 1;
      else if (c.status === 'pending') totals.pending += 1;
      else totals.escalation += 1;
    });
    return totals;
  }, [customers]);

  const escalationTotals = useMemo(() => {
    let high = 0;
    let other = 0;
    escalations.forEach((e) => {
      if (e.priority === 'high') high += 1;
      else other += 1;
    });
    return { high, other };
  }, [escalations]);

  const headlineStats = [
    {
      title: 'Customers',
      value: customers.length,
      detail: `Active ${customerStats.active} · Pending ${customerStats.pending} · Eskalasi ${customerStats.escalation}`,
    },
    { title: 'Eskalasi', value: escalations.length, detail: `High ${escalationTotals.high} · Lainnya ${escalationTotals.other}` },
    { title: 'Campaign', value: campaigns.length, detail: 'Marketing aktif' },
  ];

  return (
    <div className="stack">
      <header className="hero">
        <div>
          <p className="eyebrow">Dashboard</p>
          <h1>Snapshot Operasional</h1>
          <div className="pill-row" style={{ marginTop: 12 }}>
            <Link className="chip link" to="/customer-service">
              Buka Customer Service
            </Link>
            <Link className="chip link" to="/marketing">
              Buka Marketing
            </Link>
          </div>
        </div>
        <div className="card">
          <div className="stats-grid">
            {headlineStats.map((card) => (
              <div key={card.title} className="summary-card">
                <div className="summary-title">{card.title}</div>
                <div className="summary-value">{card.value}</div>
                <div className="muted">{card.detail}</div>
              </div>
            ))}
          </div>
        </div>
      </header>

      <section className="section">
        <h2>Insight Cepat</h2>
        <div className="grid two">
          <div className="card">
            <div className="card-title">Customer Service</div>
            <div className="muted">Status pelanggan & eskalasi (dummy chart)</div>
            <div className="line-chart">
              <div className="line">
                <span>Active</span>
                <div className="line-bar">
                  <div className="line-fill success" style={{ width: `${(customerStats.active / customers.length) * 100}%` }} />
                </div>
                <span className="mono">{customerStats.active}</span>
              </div>
              <div className="line">
                <span>Pending</span>
                <div className="line-bar">
                  <div className="line-fill warning" style={{ width: `${(customerStats.pending / customers.length) * 100}%` }} />
                </div>
                <span className="mono">{customerStats.pending}</span>
              </div>
              <div className="line">
                <span>Eskalasi</span>
                <div className="line-bar">
                  <div className="line-fill danger" style={{ width: `${(customerStats.escalation / customers.length) * 100}%` }} />
                </div>
                <span className="mono">{customerStats.escalation}</span>
                <button className="chip link" type="button" onClick={() => setShowEscalations(true)}>
                  Lihat
                </button>
              </div>
            </div>
        </div>

        <div className="card">
          <div className="card-title">Marketing</div>
          <div className="muted">Campaign WA (dari DB)</div>
          <div className="line-chart">
            {campaigns.map((c) => (
              <div key={c.name} className="line">
                <span>{c.name}</span>
                <div className="line-bar">
                    <div className="line-fill info" style={{ width: '100%' }} />
                </div>
                <span className="mono">
                  Leads {c.total_leads.toLocaleString('id-ID')} · Contacted {c.contacted.toLocaleString('id-ID')}
                </span>
              </div>
            ))}
          </div>
          <Link className="chip link" to="/marketing" style={{ marginTop: 10 }}>
            Buka Marketing
          </Link>
        </div>
        </div>
      </section>

      {showEscalations ? (
        <div className="modal-backdrop" onClick={() => setShowEscalations(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Eskalasi (Dummy)</h3>
              <button className="icon-button" type="button" onClick={() => setShowEscalations(false)}>
                ✕
              </button>
            </div>
            <div className="table">
              <div className="table-head">
                <span>Pelanggan</span>
                <span>Isu</span>
                <span>Owner</span>
                <span>SLA</span>
                <span>Prioritas</span>
              </div>
              {escalations.map((e) => (
                <div key={e.name} className="table-row">
                  <span>{e.name}</span>
                  <span className="truncate">{e.issue}</span>
                  <span>{e.owner}</span>
                  <span>{e.sla}</span>
                  <span className={e.priority === 'high' ? 'pill danger' : 'pill warning'}>{e.priority}</span>
                </div>
              ))}
            </div>
            <Link className="button" style={{ marginTop: 12, textAlign: 'center' }} to="/customer-service">
              Buka halaman CS
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}
