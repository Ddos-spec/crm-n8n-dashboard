# Migration Part 1 — SvelteKit Scaffold & Data Stores

## Goals
- Spin up an isolated SvelteKit workspace inside the repo so we can port features secara bertahap tanpa mengganggu dashboard vanilla yang masih jalan.
- Salin fondasi Tailwind + tema netral (surface/ink/accent) yang akan dipakai sepanjang redesign landing page.
- Siapkan store dasar (stats, customers, leads) yang sudah memanggil webhook n8n existing supaya fitur inti bisa diuji cepat di UI baru.

## Deliverables
1. **`apps/dashboard-sveltekit/`** — Project skeleton dengan adapter-static, alias `$stores` & `$config`, serta konfigurasi Vite/Tailwind/PostCSS yang seragam.
2. **Global styling** — `src/app.postcss` mengaktifkan Tailwind dan font dasar; layout `+layout.svelte` menginjek style global.
3. **API wrapper** — `src/lib/utils/api.ts` menyederhanakan akses ke endpoint n8n dengan error handling seragam.
4. **Reactive stores** — `statsStore`, `customersStore`, `leadsStore` berbasis `createQueryStore` agar setiap modul punya state `status/data/error` yang konsisten.
5. **Landing draft** — `+page.svelte` menampilkan hero, KPI grid, serta tabel toggle Customers/Leads sebagai baseline UX minimalis dengan filter instan.

## Next Steps
- Tambah store & komponen untuk eskalasi + modal chat (Part 2/3 sesuai roadmap).
- Sambungkan interval refresh dari konfigurasi UI ke store (auto refresh) dan siapkan fallback offline state.
- Mulai pecah tabel ke komponen atomik (header, body, row actions) begitu requirement interaksi lengkap sudah ditetapkan.
