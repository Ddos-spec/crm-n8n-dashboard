# EasyPanel Deployment Guide – CRM Frontend

Dokumen ini menjelaskan langkah detail untuk men-deploy dashboard React (`frontend/`) ke EasyPanel dengan backend yang sudah berjalan di `https://projek-n8n-crm-backend.qk6yxt.easypanel.host/`.

## Prasyarat
- Akun EasyPanel dengan akses ke proyek `projek_n8n`.
- Repository GitHub `https://github.com/Ddos-spec/crm-n8n-dashboard` sudah memiliki branch dengan perubahan terbaru.
- Backend & database telah beroperasi (sesuai status saat ini).

## Langkah Deploy
1. **Buat Layanan App**
   - Buka `http://163.61.44.41:3000/projects/projek_n8n`.
   - Klik **Create Service** → pilih **App** dan beri nama `crm-frontend`.

2. **Konfigurasi Git**
   - Pilih sumber **Git Repository**.
   - Masukkan URL repository: `https://github.com/Ddos-spec/crm-n8n-dashboard`.
   - Atur branch sesuai kebutuhan (mis. `main`).
   - Set *build path* ke `frontend`.

3. **Metode Build**
   - Pilih **Dockerfile**.
   - Pastikan Dockerfile yang digunakan adalah `frontend/Dockerfile` (sudah menyiapkan Nginx + runtime env injection).

4. **Environment Variable**
   Tambahkan variabel berikut:
   - `REACT_APP_API_URL=https://projek-n8n-crm-backend.qk6yxt.easypanel.host`
   - `REACT_APP_SOCKET_URL=https://projek-n8n-crm-backend.qk6yxt.easypanel.host`
   - `NODE_ENV=production`

   > Variabel ini akan ditulis ke `public/env-config.js` oleh `docker-entrypoint.sh` sehingga aplikasi bisa diubah tanpa rebuild.

5. **Port & Proksi**
   - Set **Internal Port** ke `80`.
   - Biarkan EasyPanel mengalokasikan port publik otomatis atau tambahkan domain `projek-n8n-crm-frontend.qk6yxt.easypanel.host`.

6. **Deploy**
   - Klik **Deploy** dan tunggu proses build selesai.
   - Jika build gagal, cek log untuk memastikan dependensi ter-install (perintah `npm ci` sudah di-handle Dockerfile).

7. **Verifikasi**
   - Akses URL publik (contoh: `https://projek-n8n-crm-frontend.qk6yxt.easypanel.host/`).
   - Login menggunakan `admin/admin123`.
   - Pantau `Network` tab browser untuk memastikan request API menuju domain backend yang benar.
   - Pastikan Socket.IO tersambung (muncul koneksi `socket.io/?EIO=4&transport=polling` → `websocket`).
   - Uji tampilan mobile via DevTools.

## Troubleshooting
- **Tidak bisa login**: cek table `dashboard_users` di database CRM untuk user `admin` dan pastikan password hash valid.
- **Socket.IO gagal tersambung**: pastikan backend mengizinkan origin dari URL frontend dan variabel `REACT_APP_SOCKET_URL` benar.
- **API 401/403**: pastikan JWT secret backend sama dengan yang digunakan untuk menghasilkan token.
- **UI pakai bahasa Inggris**: rebuild backend & frontend setelah memastikan locale default di store frontend adalah Indonesia.

## Rollback / Update
- Untuk update konfigurasi runtime (URL backend baru) cukup ubah environment variable di EasyPanel dan restart layanan.
- Untuk update kode, merge perubahan ke branch, kemudian trigger redeploy di EasyPanel.

