# Migration Part 5 – Halaman Insight Lengkap

## Ringkasan
- Menambahkan route `/detail` di workspace SvelteKit untuk menampung tampilan mendalam (charts, funnel, aktivitas, notifikasi, leaderboard) yang sebelumnya tersebar di dashboard vanilla.
- Mengintegrasikan store baru `escalationsStore` serta utilitas `insights.ts` agar ringkasan data (sparkline, funnel, CSAT, aktivitas, notifikasi) dapat diturunkan ulang secara reaktif dari sumber webhook n8n yang sama.
- Membuat komponen grafik berbasis Chart.js (`BaseChart`) sehingga sparkline, line chart response time, dan doughnut eskalasi dapat dirender ulang sesuai data terbaru tanpa bergantung pada DOM imperative lama.

## Poin Implementasi
1. **Store & Utilitas** – `escalationsStore` melengkapi customers/leads untuk kebutuhan detail; `insights.ts` merangkum seluruh fungsi derivasi (trend, funnel, csat, aktivitas) yang sebelumnya ada di bootstrap vanilla.
2. **Komponen Chart** – `BaseChart.svelte` memuat Chart.js secara dinamis, menjaga aksesibilitas (fallback kosong) dan pembersihan instans ketika data hilang.
3. **Halaman Detail** – `detail/+page.svelte` memuat ringkasan KPI + sparkline, grafik response time, breakdown eskalasi, funnel konversi, insight CSAT, aktivitas terbaru, notifikasi, dan leaderboard dengan tombol refresh manual.
4. **Navigasi** – Landing page kini menyertakan CTA “Lihat detail lengkap” pada hero untuk mengarahkan pengguna ke halaman insight baru tanpa menambah clutter.

## Langkah Berikutnya
- Pertimbangkan memecah komponen detail (activity list, notification panel, funnel table) menjadi file terpisah bila diperlukan reuse di halaman lain.
- Tambahkan pengujian Playwright untuk memastikan navigasi overview → detail bekerja dan grafik muncul ketika data mock tersedia.
- Evaluasi kebutuhan eskalasi dataset di landing page (tabel/aksi cepat) sebelum menggabungkan store eskalasi ke modul utama.
