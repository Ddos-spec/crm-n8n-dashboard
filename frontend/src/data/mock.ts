export const customers = [
  { name: 'Siti Rahma', phone: '+62 812-9000-1234', status: 'active', lastContact: '13 Des 2025' },
  { name: 'Budi Santoso', phone: '+62 813-4555-2211', status: 'pending', lastContact: '12 Des 2025' },
  { name: 'Andi Pratama', phone: '+62 851-7777-0987', status: 'active', lastContact: '10 Des 2025' },
  { name: 'Mega Lestari', phone: '+62 822-6666-1221', status: 'churn', lastContact: '01 Des 2025' },
] as const;

export const escalations = [
  { name: 'Mega Lestari', issue: 'Komplain retur', owner: 'Tim CS 2', sla: '2h', priority: 'high' },
  { name: 'Budi Santoso', issue: 'Cek stok & janji kirim', owner: 'Tim CS 1', sla: '4h', priority: 'medium' },
] as const;

export const chats = [
  {
    customer: 'Siti Rahma',
    channel: 'WhatsApp',
    snippet: 'Kak, pesanan saya sudah dikirim?',
    time: '2m lalu',
    align: 'left',
  },
  {
    customer: 'Agent',
    channel: 'Agent',
    snippet: 'Sudah dikirim hari ini, resi: JNE123',
    time: '1m lalu',
    align: 'right',
  },
  {
    customer: 'Budi Santoso',
    channel: 'Chatbot',
    snippet: 'Ada ukuran L?',
    time: '8m lalu',
    align: 'left',
  },
] as const;

export const campaigns = [
  { name: 'Flash Sale 12.12', channel: 'WhatsApp', sent: 1800, openRate: 0.78, ctr: 0.31, revenue: 42000000 },
  { name: 'Re-activate churn', channel: 'Email', sent: 1200, openRate: 0.42, ctr: 0.12, revenue: 9000000 },
  { name: 'COD Reminder', channel: 'SMS', sent: 800, openRate: 0.55, ctr: 0.09, revenue: 5000000 },
] as const;
