# Tepat Laser CRM Dashboard

Dashboard CRM terintegrasi untuk mengelola workflow customer service dan marketing automation PT Tepat Laser.

## 🚀 Fitur Utama

### 📊 Overview Dashboard
- **Real-time Monitoring**: Monitor chat customer service secara real-time
- **Quick Stats**: Statistik cepat pelanggan, leads, dan escalations
- **Analytics Charts**: Visualisasi data dengan Plotly.js
- **Recent Activities**: Aktivitas terbaru dari kedua workflow

### 🎧 Customer Service Management
- **Daftar Pelanggan**: Kelola data pelanggan lengkap dengan filter
- **Chat Monitor**: Pantau percakapan AI Agent dengan customer
- **Escalation Management**: Kelola dan tangani escalations dengan prioritas
- **Customer Details**: Informasi detail pelanggan dengan riwayat interaksi

### 📈 Marketing & Lead Management
- **Lead Database**: Database lengkap leads dari Google Places scraping
- **Campaign Tracking**: Monitor hasil campaign WhatsApp marketing
- **Segmentation**: Filter leads berdasarkan segment pasar
- **Bulk Actions**: Kontak massal dan export data leads

### 📊 Analytics & Reporting
- **AI Performance**: Akurasi dan performa AI Agent
- **Conversion Tracking**: Tracking konversi dari marketing ke sales
- **Response Time**: Analisis waktu respons customer service
- **Target vs Realisasi**: Pemantauan pencapaian target harian

## 🛠️ Teknologi yang Digunakan

- **Frontend**: HTML5, CSS3 (Tailwind CSS), JavaScript (ES6+)
- **Charts**: Plotly.js untuk visualisasi data
- **Icons**: Font Awesome 6
- **Fonts**: Google Fonts (Inter)
- **Database**: PostgreSQL
- **API Integration**: WhatsApp API, Google Sheets API, OpenRouter AI

## 📁 Struktur File

```
├── index.html              # Halaman utama dashboard
├── dashboard.js            # Logika utama dashboard
├── config.js               # Konfigurasi database dan API
├── README.md               # Dokumentasi
└── resources/              # Assets tambahan
```

## 🚀 Cara Menggunakan

### 1. Setup Environment

Pastikan database PostgreSQL sudah running dengan credential berikut:
```
Host: postgres_scrapdatan8n
Port: 5432
Database: postgres
Username: postgres
Password: a0bd3b3c1d54b7833014
```

### 2. Konfigurasi API Keys

Update file `config.js` dengan API keys yang sesuai:
- WhatsApp API Key
- Google Sheets Credentials
- OpenRouter AI API Key
- Google Places API Key

### 3. Jalankan Dashboard

Buka file `index.html` di browser atau serve melalui web server:
```bash
python -m http.server 8000
```

### 4. Navigasi Dashboard

#### Tab Overview
- Monitor real-time chat customer service
- Lihat statistik dan aktivitas terbaru
- Analisis klasifikasi pesan dan tren interaksi

#### Tab Customer Service
- Kelola daftar pelanggan dengan filter dan pencarian
- Tangani escalations dengan prioritas
- Lihat detail customer dan riwayat interaksi

#### Tab Marketing
- Filter leads berdasarkan segment dan status
- Monitor statistik campaign
- Export data leads dan kontak massal

#### Tab Analytics
- Analisis performa AI Agent
- Tracking konversi marketing
- Pemantauan target vs realisasi

## 📊 Database Schema

### Customer Service Tables
- `customers`: Data pelanggan
- `chat_history`: Riwayat chat
- `escalations`: Data escalations

### Marketing Tables
- `businesses`: Data leads dari scraping
- `campaign_logs`: Log campaign WhatsApp

## 🔧 Konfigurasi

### Customer Service Settings
```javascript
customerService: {
    cooldownDurations: {
        normal: 2,      // minutes
        price: 12,      // minutes
        urgent: 8,      // minutes
        buying: 20      // minutes
    },
    maxMessagesPerDay: 50,
    escalationThreshold: 0.8
}
```

### Marketing Settings
```javascript
marketing: {
    maxDailyLeads: 100,
    batchSize: 20,
    delayBetweenBatches: 10000, // 10 seconds
    retryAttempts: 3
}
```

## 🎯 Use Cases

### Untuk Customer Service Team
1. **Monitor Chat Real-time**: Pantau percakapan AI dengan customer
2. **Handle Escalations**: Tangani customer yang membutuhkan human intervention
3. **Customer Management**: Kelola data dan riwayat pelanggan

### Untuk Marketing Team
1. **Lead Management**: Kelola database leads dari scraping Google Places
2. **Campaign Tracking**: Monitor hasil campaign WhatsApp marketing
3. **Analytics**: Analisis performa dan ROI campaign

### Untuk Management
1. **Performance Dashboard**: Lihat overview performa tim
2. **Analytics**: Analisis data untuk pengambilan keputusan
3. **Target Monitoring**: Pantau pencapaian target harian/mingguan

## 🔒 Security & Best Practices

- API keys disimpan di file konfigurasi terpisah
- Implementasi rate limiting untuk API calls
- Validasi input dan sanitasi data
- Error handling yang proper
- Logging untuk monitoring

## 📈 Performance Optimization

- Lazy loading untuk tab content
- Pagination untuk large datasets
- Debounce untuk search/filter
- Caching untuk static data
- Optimized chart rendering

## 🎨 UI/UX Design

- **User-friendly**: Interface yang intuitif untuk non-technical users
- **Responsive**: Work di semua device sizes
- **Real-time**: Data diperbarui secara otomatis
- **Interactive**: Charts dan tables yang interaktif
- **Consistent**: Design system yang konsisten

## 🔧 Troubleshooting

### Database Connection Failed
- Pastikan PostgreSQL service running
- Check network connectivity
- Verify credentials di config.js

### API Integration Error
- Check API key validity
- Monitor rate limits
- Check network connectivity

### Charts Not Loading
- Verify Plotly.js library loaded
- Check browser console for errors
- Ensure data format correct

## 📞 Support

Untuk bantuan dan troubleshooting:
- Check browser console untuk error messages
- Pastikan semua dependencies terinstall
- Verify API credentials dan permissions
- Monitor database connection

## 🔄 Future Enhancements

- [ ] Real-time notifications
- [ ] Advanced analytics dashboard
- [ ] Mobile app companion
- [ ] Integration dengan CRM lain
- [ ] Automated reporting system
- [ ] Team collaboration features

## 📄 License

Dibuat khusus untuk PT Tepat Laser. All rights reserved.

---

**Dashboard ini mengintegrasikan kedua workflow n8n menjadi satu interface yang user-friendly untuk tim sales dan customer service.**