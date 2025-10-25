# Part 3 – Pipeline Table & Row Actions

## Ringkasan
- Membuat komponen `DataTable` reaktif dengan dukungan sortir, paginasi, ekspor CSV, dan kolom aksi untuk menggantikan `TableManager` vanilla.
- Menambahkan komponen status pelanggan/leads dan utilitas tone supaya badge status konsisten dengan tema baru.
- Mengintegrasikan tabel baru ke landing page dengan toggle dataset, pencarian terpadu, serta pencatatan aksi baris untuk persiapan modal detail/chat di part selanjutnya.

## Catatan Implementasi
- `DataTable.svelte` menjaga internal state (sortir, halaman, ukuran halaman) dan mengekspor event `select` untuk menangani aksi `detail`, `chat`, `resolve`, dan `whatsapp`.
- Kolom yang membutuhkan tampilan khusus memanfaatkan komponen sel (`CustomerStatusCell`, `LeadStatusCell`) sehingga ekspor CSV tetap memakai accessor yang sama.
- Toggle Customers/Leads kini mengatur ulang paginasi via `tableResetSignal`, sedangkan pencarian memanfaatkan store filter yang sudah ada.

## Langkah Lanjutan
- Part 4 akan mengaitkan event aksi baris ke modal detail & riwayat chat menggunakan state `pendingAction` yang sudah disiapkan.
- Evaluasi kebutuhan kolom tambahan (assigned_to, priority, dsb.) ketika integrasi detail dimulai.
