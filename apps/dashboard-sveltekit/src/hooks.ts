import { redirect, type Handle } from '@sveltejs/kit';
import { sequence } from '@sveltejs/kit/hooks';

// Hook untuk proteksi rute
async function authHandle({ event, resolve }) {
  const protectedPaths = ['/', '/customer-service', '/marketing'];
  const { url, locals } = event;
  
  // Cek apakah path saat ini dilindungi
  if (protectedPaths.includes(url.pathname)) {
    // Cek apakah user sudah login dari localStorage (klien) atau session (server)
    // Dalam implementasi ini, kita hanya menggunakan localStorage di sisi klien
    // Tapi untuk server-side protection, kita bisa menambahkan token validasi di sini
  }
  
  const response = await resolve(event);
  return response;
}

export const handle: Handle = sequence(authHandle);