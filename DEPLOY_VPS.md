# 🚀 Panduan Deploy Backend ke VPS

Panduan ini untuk mengaktifkan **Backend Python** di VPS agar Dashboard bisa menampilkan data yang akurat (100% data, bukan 100 data).

## 1. Persiapan di VPS

Pastikan VPS sudah terinstall **Python** dan **Git**.

### Masuk ke VPS
Buka terminal/PuTTY dan login ke VPS.

### Upload Kode Backend
Anda bisa upload folder `backend` via FTP/SCP, atau git clone repository ini di VPS.
Misal folder project ada di: `/var/www/crm-backend`

## 2. Install Dependencies

Masuk ke folder backend dan install library yang dibutuhkan:

```bash
cd /var/www/crm-backend/backend
pip install -r requirements.txt
```

*(Saran: Gunakan virtual environment jika perlu, tapi langsung pip install juga oke untuk VPS dedicated)*

## 3. Setting Database & Port

Buat file `.env` di dalam folder `backend`:

```bash
nano .env
```

Isi dengan data database Anda dan **PORT 8888** yang diinginkan:

```ini
# Database Config (Sesuaikan dengan kredensial PostgreSQL Anda)
DB_HOST=localhost
DB_PORT=5432
DB_NAME=nama_database_anda
DB_USER=user_database_anda
DB_PASSWORD=password_database_anda

# Port Aplikasi (Gunakan 8888 sesuai request)
PORT=8888

# WhatsApp API (Jika ada)
WHATSAPP_API_URL=...
WHATSAPP_API_KEY=...
```

Simpan file (Ctrl+X, lalu Y, lalu Enter).

## 4. Jalankan Server

Jalankan server dengan perintah:

```bash
python server.py
```

Jika sukses, akan muncul:
`🚀 Server berjalan di port 8888`

### Agar Server Jalan Terus (Background)
Jangan jalankan pakai `python server.py` biasa, nanti mati kalau terminal ditutup. Gunakan `nohup` atau `pm2`.

**Cara Paling Gampang (Nohup):**
```bash
nohup python server.py > log.txt 2>&1 &
```

## 5. Setting Reverse Proxy (PENTING)

Karena Frontend ada di GitHub (HTTPS), backend di VPS juga harus bisa diakses via HTTPS domain.

1.  Buka panel Reverse Proxy Anda (Nginx Proxy Manager, Easypanel, Coolify, atau config Nginx manual).
2.  Buat **Proxy Host** baru.
3.  **Domain:** Isi subdomain, misal `api.crm-kamu.com`
4.  **Forward Host:** `127.0.0.1` (atau `localhost`)
5.  **Forward Port:** `8888` (Sesuai settingan di atas)
6.  **SSL/HTTPS:** Aktifkan (Force SSL / LetsEncrypt).

## 6. Langkah Terakhir: Sambungkan Frontend

Setelah Backend live di `https://api.crm-kamu.com`, update kode Frontend di Laptop Anda:

1.  Buka `frontend/src/api.js`.
2.  Ganti baris ini:
    ```javascript
    // Ganti localhost dengan domain VPS Anda
    const API_BASE_URL = 'https://api.crm-kamu.com/api';
    ```
3.  Commit dan Push ke GitHub.

Selesai! Dashboard Anda sekarang menggunakan data real-time dari VPS.
