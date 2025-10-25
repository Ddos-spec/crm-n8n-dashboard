# Migration Part 2 — Hero Panel & KPI Grid

## Goals
- Rebuild the landing hero so status koneksi, countdown refresh, dan kontrol auto refresh tersaji rapi tanpa ketergantungan DOM imperative.
- Bawa ulang empat KPI utama (customers, leads, eskalasi, response rate) lengkap dengan delta dan periode supaya prioritas data langsung terlihat.
- Sinkronkan perilaku refresh (manual & auto) dengan store baru sehingga countdown, status koneksi, dan cap waktu update berjalan konsisten di UI sederhana.

## Deliverables
1. **Komponen `HeroPanel`** — Merangkum judul, status koneksi, last updated, opsi interval, tombol refresh, dan highlight singkat (update baru, status realtime, periode). Semua props tersambung ke state reaktif di halaman.
2. **Komponen `KpiCard`** — Kartu KPI dengan warna aksen, delta badge (ikut aturan inverted untuk eskalasi), serta period label; dipakai oleh grid ringkasan.
3. **`statsStore` diperluas** — Mengubah summary agar memasok angka terformat, delta, periode, dan metadata aksen + inverse. Tambahan derived `updatedAt` memudahkan hero membaca cap waktu API.
4. **Orkestrasi refresh di `+page.svelte`** — Timer countdown & auto-refresh baru, perhitungan status koneksi (online/offline/checking), serta format teks yang menggantikan binding manual dari versi vanilla JS.
5. **UI grid KPI** — Section ringkasan dengan skeleton loading dan error state yang senada dengan tema minimal.
6. **Favicon vector minimalis** — Mengganti aset PNG bawaan dengan ikon SVG ringan agar repositori tetap bebas binary dan aksesibilitas favicon terjaga.

## Next Steps
- Part 3 akan memecah tabel toggle menjadi komponen tersendiri sekaligus menambahkan aksi baris (Detail, Chat, Resolve) serta store eskalasi/chat.
- Integrasikan hitung update baru & status realtime dari sumber webhook ketika store eskalasi sudah tersedia.
- Tambahkan pengujian unit untuk helper `parseDelta`/`normalizeResponseRate` jika diperlukan sebelum melangkah ke modul tabel.
