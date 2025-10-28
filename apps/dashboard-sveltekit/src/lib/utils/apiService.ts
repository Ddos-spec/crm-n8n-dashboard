import { browser } from '$app/environment';
import { config } from '$config';
import type { ApiClientOptions } from '$lib/types/api';

type Fetcher = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

const defaultHeaders = {
  'content-type': 'application/json'
};

/**
 * Fungsi untuk melakukan request ke API eksternal melalui proxy server-side
 */
export async function getJson<T>(endpoint: keyof typeof config.apiEndpoints, options: ApiClientOptions = {}): Promise<T> {
  const { fetcher = fetch, signal } = options;
  
  // Jika di browser, gunakan fetch biasa ke endpoint internal
  // Jika di server (SSR), kita perlu mengarahkan ke proxy internal
  let url: string;
  
  if (browser) {
    // Di sisi klien, gunakan endpoint yang didefinisikan di konfigurasi
    url = config.apiEndpoints[endpoint];
  } else {
    // Di sisi server, kita gunakan URL lengkap
    url = new URL(config.apiEndpoints[endpoint], config.n8n.baseUrl).href;
  }
  
  const response = await fetcher(url, { headers: defaultHeaders, signal });

  if (!response.ok) {
    const message = await safeParseError(response);
    throw new Error(`Request failed (${response.status}): ${message}`);
  }

  return (await response.json()) as T;
}

/**
 * Fungsi untuk melakukan request POST ke API eksternal melalui proxy server-side
 */
export async function postJson<TInput, TResponse>(endpoint: keyof typeof config.apiEndpoints, body: TInput, options: ApiClientOptions = {}): Promise<TResponse> {
  const { fetcher = fetch, signal } = options;
  
  let url: string;
  
  if (browser) {
    // Di sisi klien, gunakan endpoint yang didefinisikan di konfigurasi
    url = config.apiEndpoints[endpoint];
  } else {
    // Di sisi server, kita gunakan URL lengkap
    url = new URL(config.apiEndpoints[endpoint], config.n8n.baseUrl).href;
  }
  
  const response = await fetcher(url, {
    method: 'POST',
    headers: defaultHeaders,
    body: JSON.stringify(body),
    signal
  });

  if (!response.ok) {
    const message = await safeParseError(response);
    throw new Error(`Request failed (${response.status}): ${message}`);
  }

  return (await response.json()) as TResponse;
}

/**
 * Fungsi untuk membuat payload aksi
 */
export function buildActionPayload(action: string, data: Record<string, unknown> = {}) {
  return {
    action,
    request_id: `req_${Date.now()}`,
    data
  };
}

/**
 * Fungsi untuk POST aksi ke API
 */
export async function postActionJson<TResponse>(
  endpoint: keyof typeof config.apiEndpoints,
  action: string,
  data: Record<string, unknown> = {},
  options: ApiClientOptions = {}
): Promise<TResponse> {
  return postJson(endpoint, buildActionPayload(action, data), options);
}

/**
 * Fungsi untuk POST webhook aksi
 */
export async function postWebhookAction(
  action: string,
  data: Record<string, unknown> = {},
  options: ApiClientOptions = {}
): Promise<unknown> {
  const { fetcher = fetch, signal } = options;
  
  let url: string;
  
  if (browser) {
    url = config.n8n.webhookUrl;
  } else {
    url = config.n8n.webhookUrl; // Di server, kita gunakan URL yang sama
  }
  
  const response = await fetcher(url, {
    method: 'POST',
    headers: defaultHeaders,
    body: JSON.stringify(buildActionPayload(action, data)),
    signal
  });

  if (!response.ok) {
    const message = await safeParseError(response);
    throw new Error(`Webhook request failed (${response.status}): ${message}`);
  }

  try {
    return await response.json();
  } catch (error) {
    return null;
  }
}

/**
 * Fungsi untuk parsing error dengan aman
 */
async function safeParseError(response: Response): Promise<string> {
  try {
    const data = await response.json();
    if (typeof data === 'string') return data;
    if (data && typeof data.message === 'string') return data.message;
  } catch (error) {
    // ignore JSON parse errors and fall back to status text
  }
  return response.statusText || 'Unknown error';
}