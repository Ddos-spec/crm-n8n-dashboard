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
- `docker-compose.yml` mengikat port host 4321 ke port app 3000.
- `env_file: .env` gunakan variabel: `DATABASE_URL`, `JWT_SECRET`, `CORS_ORIGIN`, `PORT=3000` (opsional; default 3000), `NODE_ENV=production`.

Health check:
```sh
curl http://localhost:4321/health
```

Catatan: jika port host ingin berbeda, ubah mapping pada `ports` di `docker-compose.yml`.
