# 🚀 Setup CRM Dashboard - Quick Instructions

## 🔥 Step 1: Import N8N Workflow

1. **Buka N8N** di https://projek-n8n-n8n.qk6yxt.easypanel.host
2. **Import workflow** dari file `n8n-crm-workflow.json`
3. **Activate workflow** yang baru diimport
4. **Set PostgreSQL credentials** ke `postgres_scrapdatan8n`

## 📊 Step 2: Test CRM Dashboard

1. **Clone repo:**
   ```bash
   git clone https://github.com/Ddos-spec/crm-n8n-dashboard.git
   cd crm-n8n-dashboard
   ```

2. **Start web server:**
   ```bash
   php -S localhost:8000
   # atau
   python -m http.server 8000
   ```

3. **Buka dashboard:** http://localhost:8000

4. **Klik "Refresh Data"** - Seharusnya data muncul!

## 🎯 Expected Results:

- ✅ **Connection Status**: "N8N Connected" (hijau)
- ✅ **Stats Cards**: Menampilkan angka real dari database
- ✅ **Chat Monitor**: Chat history dari database
- ✅ **Activities**: Recent activities real-time
- ✅ **Charts**: Classification dan interaction trends

## 🛠️ Troubleshooting:

### Jika Status "N8N Disconnected":
1. Check N8N workflow active
2. Check webhook URL: `https://projek-n8n-n8n.qk6yxt.easypanel.host/webhook/crm`
3. Test dengan cURL:
   ```bash
   curl -X POST https://projek-n8n-n8n.qk6yxt.easypanel.host/webhook/crm \
     -H "Content-Type: application/json" \
     -d '{"action":"health_check","source":"crm_dashboard","timestamp":"2024-10-22T10:30:00.000Z","data":{}}'
   ```

### Jika Data Tidak Muncul:
- Check PostgreSQL connection di N8N
- Verify credentials: `postgres_scrapdatan8n`
- Check browser console untuk errors

## 🚀 Features yang Siap:

- 📊 **Real-time Stats** dari PostgreSQL
- 📞 **WhatsApp Integration** langsung dari dashboard
- 🔄 **Auto-refresh** setiap 30 detik
- 📈 **Live Analytics** dengan charts
- 📱 **Marketing Actions** (contact leads, bulk messaging)
- ⚡ **Escalation Management**

**Sekarang tombol Refresh Data akan berfungsi dan menampilkan data real!** 🎉

---

**📞 Butuh bantuan?** Check browser console atau N8N execution logs untuk debug.