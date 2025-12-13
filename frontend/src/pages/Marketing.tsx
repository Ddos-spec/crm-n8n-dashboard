import { campaigns } from '../data/mock';

const formatNumber = (num: number) => num.toLocaleString('id-ID');

export default function Marketing() {
  return (
    <div className="stack">
      <header className="hero">
        <div>
          <p className="eyebrow">Marketing</p>
          <h1>Performa Kampanye</h1>
          <p className="lede">
            Lihat performa campaign lintas kanal dan jadwalkan sinkronisasi ke n8n untuk follow-up otomatis.
          </p>
        </div>
      </header>

      <section className="card">
        <div className="card-title">Ringkasan Kampanye</div>
        <div className="table">
          <div className="table-head">
            <span>Nama</span>
            <span>Kanal</span>
            <span>Dikirim</span>
            <span>Open rate</span>
            <span>CTR</span>
            <span>Revenue</span>
          </div>
          {campaigns.map((c) => (
            <div key={c.name} className="table-row">
              <span>{c.name}</span>
              <span>{c.channel}</span>
              <span>{formatNumber(c.sent)}</span>
              <span>{(c.openRate * 100).toFixed(0)}%</span>
              <span>{(c.ctr * 100).toFixed(0)}%</span>
              <span>Rp {formatNumber(c.revenue)}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
