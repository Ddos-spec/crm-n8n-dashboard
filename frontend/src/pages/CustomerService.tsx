type Customer = {
  name: string;
  phone: string;
  status: 'active' | 'pending' | 'churn';
  lastContact: string;
};

type Chat = {
  customer: string;
  channel: 'WhatsApp' | 'Email' | 'Chatbot';
  intent: string;
  status: 'resolved' | 'waiting' | 'escalated';
  updatedAt: string;
};

const customers: Customer[] = [
  { name: 'Siti Rahma', phone: '+62 812-9000-1234', status: 'active', lastContact: '13 Des 2025' },
  { name: 'Budi Santoso', phone: '+62 813-4555-2211', status: 'pending', lastContact: '12 Des 2025' },
  { name: 'Andi Pratama', phone: '+62 851-7777-0987', status: 'active', lastContact: '10 Des 2025' },
  { name: 'Mega Lestari', phone: '+62 822-6666-1221', status: 'churn', lastContact: '01 Des 2025' },
];

const chats: Chat[] = [
  { customer: 'Siti Rahma', channel: 'WhatsApp', intent: 'Follow-up pesanan', status: 'resolved', updatedAt: '2m lalu' },
  { customer: 'Budi Santoso', channel: 'Chatbot', intent: 'Cek stok', status: 'waiting', updatedAt: '8m lalu' },
  { customer: 'Andi Pratama', channel: 'Email', intent: 'Konfirmasi pembayaran', status: 'resolved', updatedAt: '30m lalu' },
  { customer: 'Mega Lestari', channel: 'WhatsApp', intent: 'Komplain retur', status: 'escalated', updatedAt: '1h lalu' },
];

const statusClass = {
  active: 'pill success',
  pending: 'pill warning',
  churn: 'pill danger',
  resolved: 'pill success',
  waiting: 'pill warning',
  escalated: 'pill danger',
};

export default function CustomerService() {
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
          <div className="card-title">Riwayat Chat</div>
          <div className="table">
            <div className="table-head">
              <span>Pelanggan</span>
              <span>Kanal</span>
              <span>Intent</span>
              <span>Status</span>
              <span>Diperbarui</span>
            </div>
            {chats.map((c, idx) => (
              <div key={`${c.customer}-${idx}`} className="table-row">
                <span>{c.customer}</span>
                <span>{c.channel}</span>
                <span className="truncate">{c.intent}</span>
                <span className={statusClass[c.status]}>{c.status}</span>
                <span>{c.updatedAt}</span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
