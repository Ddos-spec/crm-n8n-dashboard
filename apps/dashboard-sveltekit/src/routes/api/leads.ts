import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

// Fungsi untuk membuat request ke n8n melalui proxy
async function proxyToN8n(action: string, data: any = {}) {
  // Gunakan environment variable untuk base URL n8n
  const n8nBaseUrl = process.env.N8N_BASE_URL || 'https://n8n-cors-proxy.setgraph69.workers.dev';
  
  // Buat payload sesuai kebutuhan n8n
  const payload = {
    action,
    data,
    request_id: `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  };

  try {
    const response = await fetch(n8nBaseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Dalam implementasi production, tambahkan header autentikasi di sini
        // 'Authorization': `Bearer ${process.env.N8N_API_KEY}`
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`n8n API error: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Proxy error:', error);
    throw error;
  }
}

// Endpoint untuk mendapatkan daftar leads
export const GET: RequestHandler = async () => {
  try {
    const result = await proxyToN8n('get_leads');
    return json(result);
  } catch (error) {
    console.error('Get leads error:', error);
    return json({ error: 'Failed to get leads' }, { status: 500 });
  }
};

export const POST: RequestHandler = async ({ request }) => {
  try {
    const body = await request.json();
    const { action, data = {} } = body;

    // Validasi action
    if (!action) {
      return json({ error: 'Action is required' }, { status: 400 });
    }

    // Proksi ke n8n
    const result = await proxyToN8n(action, data);
    
    return json(result);
  } catch (error) {
    console.error('API Proxy Error:', error);
    return json({ error: 'Internal server error' }, { status: 500 });
  }
};