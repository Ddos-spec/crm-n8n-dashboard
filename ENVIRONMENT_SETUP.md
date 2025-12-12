# Environment Setup Guide

## GitHub Secrets Configuration

### Frontend (GitHub Pages)

Di repository settings → Secrets and variables → Actions, tambahkan:

**REACT_APP_API_BASE_URL**
```
https://filter-bot-crmcutting.qk6yxt.easypanel.host
```

⚠️ **PENTING**:
- ❌ JANGAN tambahkan trailing slash: `https://filter-bot-crmcutting.qk6yxt.easypanel.host/`
- ❌ JANGAN tambahkan `/api` di akhir
- ✅ Gunakan format: `https://your-domain.com` (tanpa trailing slash)

### Kenapa?

File `frontend/src/api.js` sudah handle secara otomatis:
```javascript
const baseUrl = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8001';
const API_BASE_URL = baseUrl.replace(/\/$/, '') + '/api';
```

Jadi:
- Input: `https://filter-bot-crmcutting.qk6yxt.easypanel.host`
- Output: `https://filter-bot-crmcutting.qk6yxt.easypanel.host/api` ✅

- Input: `https://filter-bot-crmcutting.qk6yxt.easypanel.host/` (dengan slash)
- Output: `https://filter-bot-crmcutting.qk6yxt.easypanel.host/api` ✅ (auto remove trailing slash)

---

## Backend (Easypanel/VPS)

### Environment Variables (.env)

```env
# Server Configuration
PORT=8888

# PostgreSQL Database Configuration
DB_HOST=163.61.44.41        # atau postgres_scrapdatan8n jika di Docker network
DB_PORT=5432
DB_NAME=CRM
DB_USER=postgres
DB_PASSWORD=your_password

# WhatsApp API Configuration
WHATSAPP_API_URL=https://app.notif.my.id/api/v2/send-message
WHATSAPP_API_KEY=your_api_key
```

### Easypanel Configuration

**Domain Routing**:
```
External: https://filter-bot-crmcutting.qk6yxt.easypanel.host
Internal: filter_bot_crmcutting:8888
```

**SSL/HTTPS**:
- Pastikan SSL certificate sudah aktif di Easypanel
- Easypanel otomatis handle HTTPS jika domain sudah terdaftar

**Port Mapping**:
- Container expose port: 8888 (sesuai Dockerfile)
- Easypanel routing otomatis dari HTTPS:443 → Container:8888

---

## Verifikasi Setup

### 1. Test Backend Endpoint
```bash
# Harus return JSON dengan status 200
curl https://filter-bot-crmcutting.qk6yxt.easypanel.host/api/health
```

Expected response:
```json
{"status":"ok","database":true}
```

### 2. Test CORS
```bash
curl -i https://filter-bot-crmcutting.qk6yxt.easypanel.host/api/health \
  -H "Origin: https://ddos-spec.github.io"
```

Expected headers:
```
Access-Control-Allow-Origin: https://ddos-spec.github.io
Access-Control-Allow-Credentials: true
```

### 3. Test dari Browser Console
Buka frontend → DevTools → Console:
```javascript
fetch('https://filter-bot-crmcutting.qk6yxt.easypanel.host/api/health')
  .then(r => r.json())
  .then(console.log)
```

Tidak boleh ada CORS error!

---

## Troubleshooting

### Error: "Failed to load resource: net::ERR_FAILED"

**Penyebab**: Backend tidak responding atau SSL issue

**Solusi**:
1. Cek backend di VPS masih running: `docker ps` atau cek logs
2. Cek SSL certificate valid di Easypanel
3. Test langsung ke backend URL di browser

### Error: "CORS policy blocking"

**Penyebab**: CORS configuration belum benar atau cache

**Solusi**:
1. Hard reload browser: `Ctrl + Shift + R`
2. Cek backend logs untuk lihat request masuk
3. Verifikasi backend sudah di-deploy dengan kode CORS terbaru
4. Lihat `CORS_TROUBLESHOOTING.md` untuk detail

### Error: "404 Not Found" untuk `/api/stats`

**Penyebab**:
- Routing salah
- REACT_APP_API_BASE_URL tidak ter-set dengan benar

**Solusi**:
1. Cek GitHub Secrets value
2. Re-deploy frontend di GitHub Pages
3. Clear browser cache

---

## Deployment Checklist

### Backend Deployment (Easypanel)
- [ ] Environment variables sudah di-set di Easypanel
- [ ] Domain routing configured: external → internal:8888
- [ ] SSL certificate aktif
- [ ] Container running dan healthy
- [ ] Database accessible dari container
- [ ] Logs tidak ada error CORS

### Frontend Deployment (GitHub Pages)
- [ ] REACT_APP_API_BASE_URL di GitHub Secrets
- [ ] GitHub Actions build sukses
- [ ] Deploy ke GitHub Pages sukses
- [ ] Browser console tidak ada CORS error
- [ ] API calls berhasil fetch data
