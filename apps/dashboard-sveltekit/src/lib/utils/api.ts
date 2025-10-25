import { config } from '$config';

type Fetcher = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

const defaultHeaders = {
  'content-type': 'application/json'
};

export interface ApiClientOptions {
  fetcher?: Fetcher;
  signal?: AbortSignal;
}

export async function getJson<T>(endpoint: keyof typeof config.apiEndpoints, options: ApiClientOptions = {}): Promise<T> {
  const { fetcher = fetch, signal } = options;
  const url = new URL(config.apiEndpoints[endpoint], config.n8n.baseUrl);
  const response = await fetcher(url, { headers: defaultHeaders, signal });

  if (!response.ok) {
    const message = await safeParseError(response);
    throw new Error(`Request failed (${response.status}): ${message}`);
  }

  return (await response.json()) as T;
}

export async function postJson<TInput, TResponse>(endpoint: keyof typeof config.apiEndpoints, body: TInput, options: ApiClientOptions = {}): Promise<TResponse> {
  const { fetcher = fetch, signal } = options;
  const url = new URL(config.apiEndpoints[endpoint], config.n8n.baseUrl);
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
