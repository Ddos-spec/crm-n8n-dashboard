# Deploy backend dengan Docker

Jalankan di server (bukan lokal) untuk memastikan hanya satu instance hidup:

```sh
cd backend

# build image baru
docker compose build backend

# hentikan instance lama (container name tetap: crm-backend)
docker compose down backend || true

# jalankan instance baru
docker compose up -d backend

# cek log singkat
docker compose logs --tail=50 backend
```

Konfigurasi:
- `docker-compose.yml` mengikat port host 4444 ke port app 4444 (sesuaikan jika ganti PORT).
- `env_file: .env` gunakan variabel: `DATABASE_URL`, `JWT_SECRET`, `CORS_ORIGIN`, `PORT` (contoh 4444), `NODE_ENV=production`.

Health check:
```sh
curl http://localhost:4444/health
```

Catatan: jika port host ingin berbeda, ubah mapping pada `ports` di `docker-compose.yml` agar selaras dengan `PORT` aplikasi.
