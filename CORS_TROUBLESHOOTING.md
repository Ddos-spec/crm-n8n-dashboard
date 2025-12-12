# CORS Troubleshooting Guide

## Masalah: Frontend tidak bisa akses Backend karena CORS

### Error yang Muncul di Browser Console:
```
Access to XMLHttpRequest at 'https://filter-bot-crmcutting.qk6yxt.easypanel.host/api/stats'
from origin 'https://ddos-spec.github.io' has been blocked by CORS policy:
No 'Access-Control-Allow-Origin' header is present on the requested resource.
```

---

## Checklist Troubleshooting

### 1. ✅ Verifikasi Backend Sudah Di-Deploy dengan Kode Terbaru
```bash
# Di VPS, cek log backend untuk melihat request masuk
# Pastikan melihat log seperti:
# Origin: https://ddos-spec.github.io
```

### 2. ✅ Test CORS Menggunakan cURL

```bash
# Test dari command line
curl -i https://filter-bot-crmcutting.qk6yxt.easypanel.host/api/health \
  -H "Origin: https://ddos-spec.github.io"

# Yang HARUS ada di response headers:
# Access-Control-Allow-Origin: https://ddos-spec.github.io
# Access-Control-Allow-Credentials: true
```

### 3. ✅ Clear Browser Cache
- Tekan `Ctrl + Shift + R` (hard reload)
- Atau buka DevTools > Network > Disable cache
- Atau gunakan Incognito/Private mode

### 4. ⚠️ Cek Reverse Proxy Configuration di Easypanel

Jika Easypanel menggunakan Nginx/Caddy, mungkin ada override CORS headers.

**Solusi**: Tambahkan konfigurasi reverse proxy di Easypanel:

```nginx
# Jika menggunakan Nginx
add_header 'Access-Control-Allow-Origin' 'https://ddos-spec.github.io' always;
add_header 'Access-Control-Allow-Credentials' 'true' always;
add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, OPTIONS' always;
add_header 'Access-Control-Allow-Headers' 'Content-Type, Authorization, X-Requested-With' always;

if ($request_method = 'OPTIONS') {
    return 204;
}
```

### 5. ⚠️ Environment Variables

Pastikan `.env` ter-load dengan benar:

```bash
# Di VPS, cek environment
node -e "require('dotenv').config(); console.log(process.env)"
```

### 6. ⚠️ Port dan Binding

Pastikan server bind ke `0.0.0.0` bukan `localhost`:

```javascript
// server.js line 635
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server berjalan di http://localhost:${PORT}`);
});
```

---

## Solusi Alternatif: Allow All Origins (Temporary)

Jika troubleshooting di atas tidak berhasil, gunakan solusi sementara:

```javascript
// server.js - Ganti corsOptions dengan:
const corsOptions = {
  origin: '*', // ALLOW ALL - hanya untuk debugging!
  credentials: false, // Must be false when origin is *
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};
```

⚠️ **WARNING**: Ini membuka akses dari semua domain. Hanya gunakan untuk debugging, kembalikan ke whitelist setelah masalah teridentifikasi.

---

## Debug Logs yang Berguna

Dengan konfigurasi terbaru, backend akan log setiap request:

```
2025-12-12T04:16:21.000Z - GET /api/stats
Origin: https://ddos-spec.github.io
Headers: { host: 'filter-bot-crmcutting.qk6yxt.easypanel.host', ... }
```

Cek log ini di VPS untuk memastikan:
1. Request sampai ke backend
2. Origin header terdeteksi dengan benar
3. Response headers di-set dengan benar

---

## Test Preflight Request

Browser mengirim OPTIONS request sebelum request sebenarnya:

```bash
# Test OPTIONS (preflight)
curl -i -X OPTIONS https://filter-bot-crmcutting.qk6yxt.easypanel.host/api/stats \
  -H "Origin: https://ddos-spec.github.io" \
  -H "Access-Control-Request-Method: GET" \
  -H "Access-Control-Request-Headers: Content-Type"

# Response harus 204 atau 200 dengan CORS headers
```

---

## Kontak dan Bantuan

Jika masih error setelah semua langkah di atas:
1. Screenshot error di browser console
2. Copy log dari backend VPS
3. Share hasil curl test
4. Cek konfigurasi Easypanel reverse proxy
