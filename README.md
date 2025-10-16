# CRM N8N Dashboard

Dashboard CRM full-stack untuk otomasi layanan pelanggan dan pemasaran yang terhubung dengan workflow N8N. Proyek ini terdiri dari backend Express.js dan frontend React + Tailwind yang siap di-deploy melalui Docker/EasyPanel.

## Fitur Utama
- Autentikasi JWT dengan peran admin, manager, dan operator.
- Integrasi multi-database PostgreSQL (`cswa_v2` dan `marketerv2`).
- Event real-time melalui Socket.IO untuk pesan baru, prospek, dan notifikasi.
- Endpoint webhook untuk menerima event dari workflow N8N (WhatsApp & lead scraping).
- Modul kampanye, tindak lanjut, basis pengetahuan, dan aktivitas pengguna.
- Dashboard responsif dalam Bahasa Indonesia dengan metrik operasional.

## Struktur Proyek
```
backend/   → API Express, Socket.IO, dan integrasi database
frontend/  → Aplikasi React + Tailwind
database/  → Skrip peningkatan skema untuk kedua database
```

## Konfigurasi Lingkungan
Salin berkas `.env.example` pada backend dan frontend lalu sesuaikan jika diperlukan.

Backend (`backend/.env`):
```
DATABASE_URL=postgres://postgres:a0bd3b3c1d54b7833014@postgres_scrapdatan8n:5432/cswa_v2
MARKETER_DATABASE_URL=postgres://postgres:a0bd3b3c1d54b7833014@postgres_scrapdatan8n:5432/marketerv2
JWT_SECRET=yDPkw#ZIhMNG70u1Gl#1npCpCBUUUIv!9WBZ0rA5JCB@kTBwd5bKR1yNrwmJPl0g
NODE_ENV=production
N8N_WEBHOOK_URL=https://projek-n8n-n8n.qk6yxt.easypanel.host
PORT=3001
FRONTEND_URL=http://163.61.44.41:3000
CORS_ORIGIN=http://163.61.44.41:3000,https://projek-n8n-n8n.qk6yxt.easypanel.host
```

Frontend (`frontend/.env`):
```
VITE_API_URL=http://localhost:3001
```

## Menjalankan Secara Lokal
```bash
# Terminal 1
cd backend
npm install
npm run dev

# Terminal 2
cd frontend
npm install
npm run dev
```
Frontend tersedia di `http://localhost:3000` dan backend di `http://localhost:3001`.

## Menjalankan dengan Docker Compose
```bash
docker compose up --build
```
Layanan backend tersedia pada port 3001 dan frontend pada port 3000.

## Deploy di EasyPanel
Gunakan langkah berikut untuk meluncurkan frontend di EasyPanel agar terhubung dengan backend yang sudah berjalan:

1. Masuk ke proyek EasyPanel Anda lalu buat layanan baru bertipe **App** dengan nama `crm-frontend`.
2. Hubungkan repositori GitHub `https://github.com/Ddos-spec/crm-n8n-dashboard` dan set *build path* ke folder `frontend/`.
3. Pilih metode build **Dockerfile** dan pastikan container diekspos pada port internal 80 (default Nginx image).
4. Tambahkan environment variable berikut agar frontend membaca URL runtime yang benar:
   - `REACT_APP_API_URL=https://projek-n8n-crm-backend.qk6yxt.easypanel.host`
   - `REACT_APP_SOCKET_URL=https://projek-n8n-crm-backend.qk6yxt.easypanel.host`
   - `NODE_ENV=production`
5. Setelah build & deploy selesai, EasyPanel akan memberikan URL publik (misal `https://projek-n8n-crm-frontend.qk6yxt.easypanel.host`).
6. Verifikasi login (`admin/admin123`), data dashboard, dan koneksi real-time melalui Socket.IO.

> **Catatan:** Frontend mendukung injeksi konfigurasi runtime melalui `public/env-config.js`. Jika URL backend berubah, cukup perbarui environment variable di EasyPanel dan restart layanan tanpa rebuild image.

## Peningkatan Database
Jalankan skrip pada folder `database/` terhadap database terkait:
```bash
psql "$DATABASE_URL" -f database/schema-enhancement.sql
psql "$MARKETER_DATABASE_URL" -f database/marketer-enhancement.sql
```

## Catatan Keamanan
- Gunakan password hash `bcrypt` untuk `dashboard_users.password_hash`.
- Perbarui `JWT_SECRET` pada lingkungan produksi.
- Terapkan HTTPS pada proxy/reverse-proxy di EasyPanel.

## Lisensi
MIT
