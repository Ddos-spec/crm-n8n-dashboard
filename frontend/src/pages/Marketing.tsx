import { useState } from 'react';
import { useCampaigns } from '../hooks/useData';

const formatNumber = (num: number) => num.toLocaleString('id-ID');

export default function Marketing() {
  const { data: campaigns } = useCampaigns();
  const [selected, setSelected] = useState<number>(0);
  const [audience, setAudience] = useState('Semua pelanggan');

  const hasData = campaigns.length > 0;
  const current = hasData ? campaigns[selected] : undefined;

  return (
    <div className="stack">
      <header className="hero">
        <div>
          <p className="eyebrow">Marketing</p>
          <h1>Performa Kampanye</h1>
          <p className="lede">
            Lihat performa campaign lintas kanal dan siapkan sinkronisasi ke n8n untuk follow-up otomatis.
          </p>
        </div>
      </header>

      <section className="grid two">
        <div className="card">
          <div className="card-title">Ringkasan Kampanye</div>
          <div className="table">
            <div className="table-head">
              <span>Nama</span>
              <span>Kanal</span>
              <span>Dikirim</span>
              <span>Contacted</span>
              <span>Invalid</span>
              <span>Avg score</span>
            </div>
            {campaigns.map((c, idx) => (
              <button
                key={c.name}
                className={selected === idx ? 'table-row selectable selected' : 'table-row selectable'}
                type="button"
                onClick={() => setSelected(idx)}
              >
                <span>{c.name}</span>
                <span>WhatsApp</span>
                <span>{formatNumber(c.total_leads)}</span>
                <span>{formatNumber(c.contacted)}</span>
                <span>{formatNumber(c.invalid)}</span>
                <span>{c.avg_lead_score.toFixed(0)}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="card-title">Detail & Aksi</div>
          <p className="muted">Pilih kampanye untuk lihat detail dan jalankan aksi dummy.</p>
          {current ? (
            <div className="summary-card">
              <div className="summary-title">{current.name}</div>
              <div className="muted">WhatsApp</div>
            <div className="metrics">
              <div>
                <div className="summary-value">{formatNumber(current.total_leads)}</div>
                <div className="muted">Dikirim</div>
              </div>
              <div>
                <div className="summary-value">{formatNumber(current.contacted)}</div>
                <div className="muted">Contacted</div>
              </div>
              <div>
                <div className="summary-value">{formatNumber(current.invalid)}</div>
                <div className="muted">Invalid</div>
              </div>
              <div>
                <div className="summary-value">{current.avg_lead_score.toFixed(0)}</div>
                <div className="muted">Avg score</div>
              </div>
            </div>
          </div>
          ) : (
            <div className="muted">Pilih kampanye.</div>
          )}
          <div className="stack" style={{ marginTop: 12 }}>
            <label className="label" htmlFor="audience">
              Audiens
            </label>
            <select id="audience" className="input" value={audience} onChange={(e) => setAudience(e.target.value)}>
              <option>Semua pelanggan</option>
              <option>Prioritas tinggi</option>
              <option>Pending follow-up</option>
              <option>Churn risk</option>
            </select>
            <div className="pill-row">
              <button className="button" type="button" onClick={() => alert(`Sync ke n8n (${audience})`)}>
                Sinkron ke n8n
              </button>
              <button className="button ghost" type="button" onClick={() => alert('Kirim ulang (dummy)')}>
                Kirim ulang
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="card">
        <div className="card-title">Batch Performance</div>
        <div className="table">
          <div className="table-head">
            <span>Batch</span>
            <span>Total Leads</span>
            <span>Contacted</span>
            <span>Invalid</span>
            <span>Avg Score</span>
            <span>Last Batch</span>
          </div>
          {campaigns.map((row) => (
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
    </div>
  );
}
