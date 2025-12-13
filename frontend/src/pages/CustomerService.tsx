import { useState } from 'react';
import { campaigns, chats, customers, escalations } from '../data/mock';

const statusClass = {
  active: 'pill success',
  pending: 'pill warning',
  churn: 'pill danger',
};

const chatBubbleClass = {
  left: 'bubble left',
  right: 'bubble right',
};

export default function CustomerService() {
  const [showEscalation, setShowEscalation] = useState(false);

  return (
    <div className="stack">
      <header className="hero">
        <div>
          <p className="eyebrow">Customer Service</p>
          <h1>Inbox & Profil Pelanggan</h1>
          <p className="lede">
            Pantau pelanggan prioritas, riwayat kontak, dan status percakapan lintas kanal sebelum dihubungkan ke agen
            atau otomatisasi n8n.
          </p>
        </div>
      </header>

      <section className="grid two">
        <div className="card">
          <div className="card-title">Pelanggan Aktif</div>
          <div className="table">
            <div className="table-head">
              <span>Nama</span>
              <span>Status</span>
              <span>Kontak</span>
              <span>Terakhir</span>
            </div>
            {customers.map((c) => (
              <div key={c.phone} className="table-row">
                <span>{c.name}</span>
                <span className={statusClass[c.status]}>{c.status}</span>
                <span className="mono">{c.phone}</span>
                <span>{c.lastContact}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="card-title">Inbox ala WhatsApp</div>
          <div className="chat-window">
            {chats.map((c, idx) => (
              <div key={`${c.customer}-${idx}`} className={chatBubbleClass[c.align]}>
                <div className="bubble-meta">
                  <span>{c.customer}</span>
                  <span className="muted">{c.channel} · {c.time}</span>
                </div>
                <div className="bubble-text">{c.snippet}</div>
              </div>
            ))}
          </div>
          <button className="button ghost" type="button" onClick={() => setShowEscalation((p) => !p)}>
            {showEscalation ? 'Tutup Eskalasi' : 'Tampilkan Eskalasi'}
          </button>
          {showEscalation && (
            <div className="table" style={{ marginTop: 12 }}>
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
          </div>
        </div>
      </section>
    </div>
  );
}
