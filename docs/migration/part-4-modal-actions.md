# Migration Part 4 – Modal Detail & Action Handling

## Ringkasan
- Menambahkan infrastruktur modal reusable di workspace SvelteKit untuk menampilkan detail pipeline, riwayat chat, dan form aksi.
- Menghubungkan aksi baris (detail, chat, WhatsApp, resolve) ke webhook n8n menggunakan helper `postActionJson` dengan fallback `postWebhookAction` agar perilaku lama tetap berjalan.
- Memperluas landing page dengan feedback banner, modal detail pelanggan/lead, modal riwayat chat, form pengiriman WhatsApp, dan form penyelesaian eskalasi.

## Poin Implementasi
1. **Modal Komponen** – `Modal.svelte` memberikan dialog aksesibel dengan header, konten scrollable, dan slot footer.
2. **Helper API** – `buildActionPayload`, `postActionJson`, dan `postWebhookAction` memastikan payload aksi konsisten dengan integrasi n8n.
3. **State Handling** – `+page.svelte` kini menjaga state untuk setiap modal (detail/chat/message/resolve) serta menampilkan notifikasi keberhasilan.
4. **Fallback** – Bila request utama gagal, fallback webhook dikirim (`send_whatsapp_message`, `resolve_escalation`) sehingga arsitektur lama tetap kompatibel.

## Langkah Berikutnya
- Integrasikan modal detail dengan halaman lanjutan (Part 5) agar tombol “Lihat versi lengkap” dapat mengarah ke route khusus.
- Kaitkan aksi resolve dengan data eskalasi ketika dataset eskalasi ditambahkan ke store baru.
- Tambahkan pengujian vitest/playwright untuk memastikan modal dan aksi bekerja pada dataset mock.
