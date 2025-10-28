# Tepat Laser CRM Dashboard (SvelteKit Edition)

Dashboard CRM modern berbasis SvelteKit yang terhubung ke workflow n8n melalui Cloudflare Worker proxy. Tampilan baru menekankan visualisasi data, tabel interaktif, dan pengalaman pengguna profesional untuk tim customer service, marketing, dan analis. Aplikasi ini kini dilengkapi dengan sistem otentikasi dan arsitektur berbasis halaman.

## Fitur Utama

### Ringkasan & Visualisasi
- **Kartu statistik** dengan indikator tren mingguan, badge persentase, dan mini sparkline Chart.js.
- **Grafik kinerja** meliputi tren waktu respon, distribusi status escalation (doughnut), dan funnel konversi.
- **Widget performa** untuk leaderboard tim, skor CSAT dengan rating bintang, dan insight pipeline.

### Customer Service
- Tabel pipeline pelanggan dengan pencarian, filter prioritas, range tanggal, sorting per kolom, dan pagination (10/25/50 baris).
- Tabel escalation dengan status badge berwarna, aksi cepat (detail & resolve), serta ekspor CSV.
- Notifikasi urgent dan aktivitas terbaru disusun otomatis dari data customers/leads.
- Fokus khusus pada penanganan eskalasi dan interaksi pelanggan.

### Marketing & Analitik
- Tabel leads lengkap dengan pencarian, filter status, filter owner, sorting, pagination, dan tombol follow-up.
- Widget analitik yang dapat diekspor (CSV) mencakup conversion rate, response time, tickets resolved, NPS, revenue impact, dan active campaigns.
- Fokus khusus pada manajemen lead dan analisis performa pemasaran.

### Interaktivitas & UX
- Quick actions (Assign Lead, Resolve Escalation, Send Message) dengan modal form dan toast notification.
- Modal detail untuk pelanggan, leads, escalation, serta histori chat real-time.
- Sistem auto-refresh dengan countdown configurable (off/30s/1m/5m) dan badge update baru.
- Tema glassmorphism, animasi halus, ikon Lucide, serta dukungan responsif mobile-first.

## Struktur Proyek
```
crm-n8n-dashboard/
├── package.json
├── README.md
└── apps/
    └── dashboard-sveltekit/
        ├── package.json
        ├── svelte.config.js
        ├── vite.config.ts
        ├── src/
        │   ├── app.html
        │   ├── app.postcss
        │   ├── routes/           # Halaman-halaman aplikasi
        │   │   ├── +layout.svelte  # Layout utama dengan navigasi
        │   │   ├── +page.svelte    # Dashboard utama
        │   │   ├── customer-service/ # Halaman customer service
        │   │   │   └── +page.svelte
        │   │   ├── marketing/      # Halaman marketing
        │   │   │   └── +page.svelte
        │   │   └── login/          # Halaman login
        │   │       └── +page.svelte
        │   ├── lib/
        │   │   ├── components/     # Komponen UI
        │   │   ├── stores/         # State management (Svelte stores)
        │   │   │   ├── auth/       # Store autentikasi
        │   │   │   └── ...         # Store lainnya
        │   │   ├── types/          # Definisi tipe TypeScript
        │   │   └── utils/          # Fungsi-fungsi utilitas
        │   └── hooks.ts            # Server hooks (otentikasi)
```

## Dependensi Utama
- [SvelteKit](https://kit.svelte.dev/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Chart.js](https://www.chartjs.org/) v4
- [Lucide Icons](https://lucide.dev)

## Teknologi & Arsitektur
- **Frontend**: SvelteKit (Svelte + Vite)
- **Styling**: Tailwind CSS
- **Otentikasi**: Sistem login berbasis localStorage dengan role-based access
- **API Proxy**: Server routes untuk menyembunyikan endpoint n8n sensitif
- **State Management**: Svelte stores
- **Aksesibilitas**: WCAG compliant components

## Cara Menjalankan
1. Clone repository dan masuk ke direktori proyek
2. Install dependensi: `npm install` (di root dan di dalam `apps/dashboard-sveltekit`)
3. Atur environment variables (lihat `.env.example`)
4. Jalankan development server: `npm run dev` (di `apps/dashboard-sveltekit`)
5. Buka browser di `http://localhost:5173`

## Akun Demo
- **Admin**: username: `admin`, password: `password`
- **Customer Service**: username: `cs`, password: `cs123`
- **Marketing**: username: `marketing`, password: `marketing123`

## Fitur-fitur Baru
- Sistem otentikasi dan manajemen session
- Arsitektur multi-halaman (Dashboard Utama, Customer Service, Marketing)
- Server-side proxy untuk menyembunyikan endpoint eksternal
- Optimasi interval refresh berdasarkan role pengguna
- Aksesibilitas ditingkatkan sesuai standar WCAG
- Tipe data TypeScript yang lebih lengkap
- Penanganan error yang lebih baik

## Lisensi
Proyek ini mengikuti lisensi pada repository asli Tepat Laser CRM Dashboard.
