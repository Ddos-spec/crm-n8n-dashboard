# Tepat Laser CRM Dashboard

Dashboard CRM modern berbasis HTML/CSS/JavaScript murni yang terhubung ke workflow n8n melalui Cloudflare Worker proxy. Tampilan baru menekankan visualisasi data, tabel interaktif, dan pengalaman pengguna profesional untuk tim customer service, marketing, dan analis.

## Fitur Utama

### Ringkasan & Visualisasi
- **Kartu statistik** dengan indikator tren mingguan, badge persentase, dan mini sparkline Chart.js.
- **Grafik kinerja** meliputi tren waktu respon, distribusi status escalation (doughnut), dan funnel konversi.
- **Widget performa** untuk leaderboard tim, skor CSAT dengan rating bintang, dan insight pipeline.

### Customer Service
- Tabel pipeline pelanggan dengan pencarian, filter prioritas, range tanggal, sorting per kolom, dan pagination (10/25/50 baris).
- Tabel escalation dengan status badge berwarna, aksi cepat (detail & resolve), serta ekspor CSV.
- Notifikasi urgent dan aktivitas terbaru disusun otomatis dari data customers/leads.

### Marketing & Analitik
- Tabel leads lengkap dengan pencarian, filter status, filter owner, sorting, pagination, dan tombol follow-up.
- Widget analitik yang dapat diekspor (CSV) mencakup conversion rate, response time, tickets resolved, NPS, revenue impact, dan active campaigns.

### Interaktivitas & UX
- Quick actions (Assign Lead, Resolve Escalation, Send Message) dengan modal form dan toast notification.
- Modal detail untuk pelanggan, leads, escalation, serta histori chat real-time.
- Sistem auto-refresh dengan countdown configurable (off/30s/1m/5m) dan badge update baru.
- Tema glassmorphism, animasi halus, ikon Lucide, serta dukungan responsif mobile-first.

## Struktur Proyek
```
index.html         # Struktur HTML utama + style dasar
config.js          # Konfigurasi endpoint n8n & opsi UI
api-connector.js   # Wrapper fetch Cloudflare Worker → n8n
webhook-handler.js # (Opsional) helper integrasi lanjutan
dashboard.js       # Logika UI, tabel, charts, state management
```

## Dependensi CDN
- [Tailwind CSS](https://cdn.tailwindcss.com)
- [Lucide Icons](https://lucide.dev)
- [Moment.js](https://momentjs.com/) + locale Indonesia
- [Chart.js](https://www.chartjs.org/) v4

## Cara Menjalankan
1. Clone repository dan buka `index.html` melalui HTTP server (mis. `python -m http.server`) untuk menghindari isu CORS.
2. Pastikan konfigurasi `CONFIG.n8n.baseUrl` mengarah ke Cloudflare Worker proxy yang telah terhubung dengan webhook n8n.
3. Dashboard otomatis memuat data quick stats, customers, leads, dan escalations. Gunakan tombol **Refresh data** untuk sinkron manual atau aktifkan auto-refresh.

## Pengembangan Lanjutan
- Tambahkan dark mode toggle dengan mengganti atribut `data-theme` pada `<body>`.
- Integrasikan notifikasi push (WebSocket / SSE) untuk real-time update tanpa polling.
- Lengkapi aksi quick actions dengan workflow n8n spesifik (assign lead, resolve escalation) sesuai kebutuhan bisnis.

## Lisensi
Proyek ini mengikuti lisensi pada repository asli Tepat Laser CRM Dashboard.
