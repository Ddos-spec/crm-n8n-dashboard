/**
 * Fungsi untuk mendapatkan interval refresh default berdasarkan peran pengguna
 */
export function getDefaultRefreshInterval(userRole?: string): number {
  // Admin: 60 detik
  if (userRole === 'admin') {
    return 60000;
  }
  // Customer service: 30 detik (data lebih dinamis)
  if (userRole === 'customer_service') {
    return 30000;
  }
  // Marketing: 120 detik (data lebih stabil)
  if (userRole === 'marketing') {
    return 120000;
  }
  // Default: 60 detik
  return 60000;
}

/**
 * Fungsi untuk mendapatkan opsi interval refresh yang tersedia
 */
export function getRefreshIntervalOptions(): Array<{value: number, label: string}> {
  return [
    { value: 0, label: 'Mati' },
    { value: 15000, label: '15 detik' },
    { value: 30000, label: '30 detik' },
    { value: 60000, label: '1 menit' },
    { value: 120000, label: '2 menit' },
    { value: 300000, label: '5 menit' }
  ];
}

/**
 * Fungsi untuk format label interval
 */
export function formatIntervalLabel(ms: number): string {
  if (ms === 0) return 'Mati';
  const totalSeconds = Math.round(ms / 1000);
  if (totalSeconds < 60) return `${totalSeconds} detik`;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (seconds === 0) return `${minutes} menit`;
  return `${minutes}m ${seconds}s`;
}