import { campaigns, customers, escalations } from '../data/mock';

const cards = [
  {
    title: 'Customers',
    value: `${customers.length}`,
    detail: 'Pelanggan aktif & pending',
  },
  {
    title: 'Eskalasi',
    value: `${escalations.length}`,
    detail: 'Kasus perlu respon',
  },
  {
    title: 'Campaign',
    value: `${campaigns.length}`,
    detail: 'Marketing aktif',
  },
];

const mockHealth = {
  status: 'ok',
  uptime: '99.9% (dummy)',
  requestId: 'dummy-request-id',
  timestamp: new Date().toISOString(),
};

export default function Dashboard() {
  return (
    <div className="stack">
      <header className="hero">
        <div>
          <p className="eyebrow">Dashboard</p>
          <h1>Snapshot Operasional</h1>
          <p className="lede">
            Ringkasan cepat dari Customer Service dan Marketing. Data dummy untuk alur awal, siap dihubungkan ke API.
          </p>
        </div>
        <div className="card">
          <div className="card-title">Ringkasan Dummy</div>
          <p className="muted">Gunakan untuk validasi UI; nanti diisi data API.</p>
          <div className="grid three">
            {cards.map((card) => (
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
        <h2>Checklist koneksi</h2>
        <ol className="list">
          <li>Set `VITE_API_URL` nanti saat integrasi backend.</li>
          <li>Pastikan CORS memuat domain Vercel dan EasyPanel.</li>
          <li>Sinkronkan CS & Marketing data ke API saat backend siap.</li>
        </ol>
      </section>
    </div>
  );
}
