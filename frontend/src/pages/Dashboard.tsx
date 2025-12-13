const formatUptime = (seconds: number) => {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  return `${hrs}h ${mins}m ${secs}s`;
};

const mockHealth = {
  status: 'ok',
  uptime: 86400 + 3600 + 42,
  requestId: 'dummy-request-id',
  timestamp: new Date().toISOString(),
};

export default function Dashboard() {
  return (
    <div className="stack">
      <header className="hero">
        <div>
          <p className="eyebrow">Dashboard</p>
          <h1>Status Backend & Integrasi</h1>
          <p className="lede">
            Dummy view untuk pantau kesehatan API. Hubungkan ke backend nanti dengan VITE_API_URL jika sudah siap.
          </p>
        </div>
        <div className="card">
          <div className="card-title">Health Check (Dummy)</div>
          <p className="muted">Data statis agar sederhana (KISS). Integrasi API bisa ditambahkan belakangan.</p>
          <div className="status-grid">
            <div className="status-row">
              <span>Status</span>
              <span className="status-badge success">{mockHealth.status}</span>
            </div>
            <div className="status-row">
              <span>Uptime</span>
              <span>{formatUptime(mockHealth.uptime)}</span>
            </div>
            <div className="status-row">
              <span>Request ID</span>
              <span className="mono">{mockHealth.requestId}</span>
            </div>
            <div className="status-row">
              <span>Timestamp</span>
              <span>{new Date(mockHealth.timestamp).toLocaleString()}</span>
            </div>
          </div>
        </div>
      </header>

      <section className="section">
        <h2>Checklist koneksi</h2>
        <ol className="list">
          <li>Set `VITE_API_URL` nanti saat integrasi backend.</li>
          <li>Pastikan CORS memuat domain Vercel dan EasyPanel.</li>
          <li>Gunakan data dummy ini untuk validasi UI dulu.</li>
        </ol>
      </section>
    </div>
  );
}
