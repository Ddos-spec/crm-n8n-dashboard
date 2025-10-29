# 🚀 CARA DEPLOY KE GITHUB PAGES

## ✅ Setup Repository GitHub

1. **Buat/Update Repository** di GitHub dengan nama: `crm-n8n-dashboard`

2. **Enable GitHub Pages**:
   - Pergi ke repository Settings
   - Scroll ke "Pages" section  
   - Source: **GitHub Actions** (pilih ini!)
   - Save

## 🔄 Cara Deploy dengan GitHub Actions (OTOMATIS)

1. **Push code ke GitHub**:
```bash
cd /app
git add .
git commit -m "Deploy React CRM with n8n integration"
git push origin main
```

2. **GitHub Actions akan otomatis**:
   - Build aplikasi React
   - Deploy ke GitHub Pages
   - Aplikasi akan live di: https://ddos-spec.github.io/crm-n8n-dashboard/

3. **Monitor progress**:
   - Pergi ke repository → Actions tab
   - Lihat workflow "Deploy React App to GitHub Pages"
   - Tunggu hingga selesai (✅ hijau)

## 🔧 Cara Deploy Manual (Jika GitHub Actions Tidak Jalan)

1. **Build lokal**:
```bash
cd /app/frontend
yarn build
```

2. **Deploy dengan gh-pages**:
```bash
cd /app/frontend
yarn deploy
```

## ⚙️ Konfigurasi Penting

### GitHub Repository Settings:
- **Repository Name**: `crm-n8n-dashboard`
- **Pages Source**: GitHub Actions
- **Branch**: main

### File Konfigurasi:
- `.github/workflows/deploy.yml` - GitHub Actions workflow
- `frontend/package.json` - Homepage URL sudah diset
- `frontend/src/api.js` - n8n webhook URL

## 🧪 Test Setelah Deploy

1. Buka: https://ddos-spec.github.io/crm-n8n-dashboard/
2. Pastikan:
   - Dashboard load dengan data real (76 customers, 268 leads)
   - Customer Service page bisa dibuka
   - Marketing page bisa dibuka
   - Data dari n8n webhooks masuk
   - Tidak ada error 405

## 🐛 Troubleshooting

### Jika masih muncul app lama:
1. Clear browser cache (Ctrl+Shift+Del)
2. Hard refresh (Ctrl+Shift+R)
3. Cek GitHub Actions - pastikan workflow sukses
4. Tunggu 2-3 menit untuk propagation

### Jika error 405:
- Cek n8n webhooks masih aktif
- Verify base URL di `frontend/src/api.js`

### Jika GitHub Actions fail:
1. Check workflow file syntax
2. Ensure repository has proper permissions
3. Check Actions tab for error details

## 📞 Support

Jika masih ada masalah, cek:
- GitHub Actions logs
- Browser console (F12)
- n8n webhook status
