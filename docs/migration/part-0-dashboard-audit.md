# Part 0 – Dashboard Audit & Inventory

## 1. Data Flow Overview
- **Configuration** — `CONFIG` menyimpan base URL n8n serta daftar endpoint webhook yang dipakai seluruh modul frontend, lengkap dengan preferensi UI seperti interval refresh dan lokal bahasa.【F:src/frontend/shared/config.js†L1-L29】
- **API Wrapper** — `ApiConnector` mengkapsulasi pemanggilan webhook (GET/POST), menyematkan payload standar, dan memetakan fungsi khusus (quick stats, customers, leads, escalations, chat, resolve, dsb.). Seluruh refresh dashboard bergantung pada kelas ini.【F:src/frontend/services/apiConnector.js†L3-L142】
- **Bootstrap Refresh Loop** — `refreshData` melakukan fetch paralel (stats, customers, leads, escalations), menormalkan struktur data, lalu memutakhirkan state global dan renderer UI sebelum menjadwalkan ulang countdown refresh.【F:src/frontend/scripts/bootstrap/main.js†L21-L200】
- **State Container** — `DashboardState` menyimpan snapshot data (stats, tabel, countdown, modal helpers) dan menyediakan utilitas untuk auto-refresh, countdown timer, dan cap waktu update terakhir.【F:src/frontend/scripts/state/dashboardState.js†L1-L68】

## 2. UI Initialization & Global Behaviors
- **`initializeDashboard`** melakukan setup ikon, tab, quick actions, modal handler, auto refresh, binding filter tanggal, dan memicu refresh awal. Fungsi ini adalah titik masuk utama yang wajib direplikasi saat migrasi.【F:src/frontend/scripts/bootstrap/main.js†L21-L33】
- **Tab Controller** memetakan tombol `.tab-button` ke panel konten, termasuk teks deskriptif aktif, sehingga struktur DOM tab harus dipertahankan atau direfaktor menjadi komponen Svelte terpisah.【F:src/frontend/scripts/bootstrap/main.js†L90-L113】
- **Quick Actions** membuka modal dinamis (assign lead, resolve escalation, send message) melalui `openQuickActionModal`, jadi event handler berbasis `data-action` perlu dikonversi ke handler komponen dengan logika serupa.【F:src/frontend/scripts/bootstrap/main.js†L115-L146】【F:src/frontend/scripts/ui/modal.js†L5-L119】
- **Countdown & Refresh Controls** menggunakan elemen `#refresh-interval`, `#refresh-countdown`, dan `#refresh-data` untuk mengatur interval polling; dependensi DOM ini harus dipetakan ulang ketika mengganti UI.【F:src/frontend/scripts/state/dashboardState.js†L21-L60】

## 3. Table Rendering Stack
- **TableManager** menangani pencarian, filter, sort, paginasi, ekspor CSV, serta render ulang HTML dengan memanfaatkan konfigurasi kolom (renderer, accessor, flag export). Semua tabel utama (customers, escalations, leads) dibuat via instansiasi kelas ini di `initializeTables`. Migrasi perlu memecah kapabilitas ini menjadi kombinasi komponen tabel + store reaktif.【F:src/frontend/scripts/tables/tableManager.js†L3-L200】【F:src/frontend/scripts/bootstrap/main.js†L200-L314】
- **Konfigurasi Kolom** menyuntikkan renderer HTML untuk badge status/priority, tombol aksi (`data-action`), dan format tanggal. Saat porting, mapping ini dapat dijadikan komponen sel atau slot Svelte namun harus mempertahankan logika badge dan CTA yang ada.【F:src/frontend/scripts/bootstrap/main.js†L214-L314】

## 4. Modal, Detail, dan Chat Flows
- **Modal Template** menggunakan overlay tunggal `#modal-overlay` dengan konten dinamis. Fungsi `openCustomerDetail`, `openLeadDetail`, dan `openEscalationDetail` (lanjutan file) mengisi HTML kaya dari data API. Migrasi harus menyalin struktur informasi (profil, riwayat kontak, dsb.) ke komponen detail/modal Svelte.【F:src/frontend/scripts/ui/modal.js†L76-L119】【F:src/frontend/scripts/bootstrap/main.js†L314-L455】
- **Form Quick Action** memanfaatkan data di `DashboardState` (list leads, eskalasi, customer high-priority) untuk prefill dropdown. Store dan derived values wajib tersedia agar UX tetap sama.【F:src/frontend/scripts/ui/modal.js†L5-L74】
- **Chat & Escalation Actions** (di lanjutan file bootstrap) memakai `apiConnector` untuk load riwayat chat, mengirim pesan WA, dan resolve escalations; event listener global pada tombol aksi tabel memicu fungsi-fungsi ini. Pada Svelte, setiap tombol row harus memanggil handler setara agar alur kerja tidak berubah.【F:src/frontend/scripts/bootstrap/main.js†L314-L455】

## 5. Layout & Styling Dependencies
- **`index.html`** mendefinisikan struktur hero, KPI grid, tab panels (`#tab-overview`, `#tab-customer-service`, `#tab-marketing`), tabel dengan ID spesifik (`customer-table`, `escalation-table`, `leads-table`), serta modal container. Variabel CSS dan tema glassmorphism (gradient, blur, shadow) diinline di file ini; ketika menyederhanakan tema, semua referensi `glass-card`, `stat-card`, dan `.badge` harus dialihakan ke sistem styling baru.【F:src/frontend/index.html†L1-L200】
- **Ikon & Library** — Mengandalkan Lucide (defer), Moment (dengan locale `id`), dan Chart.js UMD global. Migrasi ke Svelte harus mengganti inisialisasi global ini dengan import modular atau fallback script tag yang sesuai dengan bundler baru.【F:src/frontend/index.html†L10-L24】

## 6. Observasi untuk Migrasi
- Seluruh interaksi UI bergantung pada query selector langsung terhadap ID/kelas yang tersebar di `index.html`, sehingga strategi migrasi ideal adalah memecah halaman menjadi komponen Svelte berdasarkan blok DOM (hero, KPI, tabel, modal) sambil mengganti event handler imperatif dengan binding reaktif.【F:src/frontend/scripts/bootstrap/main.js†L21-L455】【F:src/frontend/index.html†L1-L200】
- State tunggal `DashboardState` saat ini mutable dan diakses lintas modul; di Svelte sebaiknya diterjemahkan menjadi store terpisah (stats, tables, modal) agar tetap sejalan dengan flow auto-refresh dan quick action yang bergantung pada data bersama.【F:src/frontend/scripts/state/dashboardState.js†L1-L68】
- Seluruh data datang dari webhook n8n melalui `ApiConnector`; tidak ada backend Node di repo. Migrasi harus tetap menggunakan sumber data yang sama atau menyediakan adaptor fetch yang kompatibel dengan environment baru.【F:src/frontend/services/apiConnector.js†L3-L142】【F:src/frontend/shared/config.js†L1-L29】

