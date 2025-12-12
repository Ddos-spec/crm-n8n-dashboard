import { useEffect, useMemo, useState } from 'react';

type HealthResponse =
  | {
      data: {
        status: string;
        uptime: number;
      };
      meta: {
        timestamp: string;
        requestId: string;
      };
    }
  | {
      error: string;
      code: string;
      meta: {
        timestamp: string;
        requestId: string;
      };
    };

type StatusState =
  | { state: 'idle' }
  | { state: 'loading' }
  | { state: 'ok'; data: HealthResponse }
  | { state: 'error'; message: string };

const formatUptime = (seconds: number) => {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  return `${hrs}h ${mins}m ${secs}s`;
};

const buildUrl = (base: string, path: string) => {
  const trimmed = base.endsWith('/') ? base.slice(0, -1) : base;
  return `${trimmed}${path}`;
};

export default function App() {
  const [apiBase, setApiBase] = useState<string>(() => import.meta.env.VITE_API_URL || '');
  const [status, setStatus] = useState<StatusState>({ state: 'idle' });

  const healthUrl = useMemo(() => (apiBase ? buildUrl(apiBase, '/health') : ''), [apiBase]);

  const fetchHealth = async () => {
    if (!healthUrl) {
      setStatus({ state: 'error', message: 'VITE_API_URL belum di-set' });
      return;
    }
    setStatus({ state: 'loading' });
    try {
      const res = await fetch(healthUrl);
      const json = (await res.json()) as HealthResponse;

      if (!res.ok) {
        const msg = 'Health check gagal';
        setStatus({ state: 'error', message: `${msg}: ${'error' in json ? json.error : 'Unknown'}` });
        return;
      }

      setStatus({ state: 'ok', data: json });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setStatus({ state: 'error', message });
    }
  };

  useEffect(() => {
    fetchHealth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="page">
      <header className="hero">
        <div>
          <p className="eyebrow">CRM x n8n Dashboard</p>
          <h1>Headless frontend siap Vercel</h1>
          <p className="lede">
            Frontend React ringan dengan konfigurasi environment yang eksplisit. Set VITE_API_URL lalu jalankan health
            check untuk verifikasi koneksi backend.
          </p>
        </div>
        <div className="card">
          <label className="label" htmlFor="apiBase">
            VITE_API_URL
          </label>
          <input
            id="apiBase"
            name="apiBase"
            value={apiBase}
            onChange={(e) => setApiBase(e.target.value)}
            placeholder="https://backend.easypanel.app"
            className="input"
          />
          <button className="button" type="button" onClick={fetchHealth}>
            Cek /health
          </button>
          <div className="status">
            {status.state === 'idle' && <span>Menunggu...</span>}
            {status.state === 'loading' && <span>Memeriksa kesehatan backend...</span>}
            {status.state === 'error' && (
              <span className="status-badge error">Error: {status.message || 'Tidak diketahui'}</span>
            )}
            {status.state === 'ok' && 'data' in status && (
              <div className="status-grid">
                <div className="status-row">
                  <span>Status</span>
                  <span className="status-badge success">{status.data.data?.status ?? 'n/a'}</span>
                </div>
                <div className="status-row">
                  <span>Uptime</span>
                  <span>{formatUptime(status.data.data?.uptime ?? 0)}</span>
                </div>
                <div className="status-row">
                  <span>Request ID</span>
                  <span className="mono">{status.data.meta.requestId}</span>
                </div>
                <div className="status-row">
                  <span>Timestamp</span>
                  <span>{new Date(status.data.meta.timestamp).toLocaleString()}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      <section className="section">
        <h2>Langkah deploy</h2>
        <ol className="list">
          <li>Set environment di Vercel: VITE_API_URL (wajib), VITE_WS_URL (opsional untuk WebSocket).</li>
          <li>Jalankan build lokal: npm install && npm run build.</li>
          <li>Deploy dari repo: Vercel otomatis pakai command npm run build dan output dist.</li>
          <li>Validasi di preview: buka /health dari frontend untuk cek CORS dan backend.</li>
        </ol>
      </section>
    </div>
  );
}
