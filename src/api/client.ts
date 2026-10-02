/** Error with the backend's user-facing (German) message. */
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

function readCookie(name: string): string | null {
  const match = document.cookie.split('; ').find((c) => c.startsWith(name + '='));
  return match ? decodeURIComponent(match.split('=')[1]) : null;
}

let csrfReady: Promise<void> | null = null;

/** Spring sets the XSRF-TOKEN cookie lazily; make sure it exists before the first mutation. */
async function ensureCsrf(): Promise<string | null> {
  if (!readCookie('XSRF-TOKEN')) {
    csrfReady ??= fetch('/api/auth/csrf', { credentials: 'same-origin' }).then(() => undefined);
    await csrfReady;
    csrfReady = null;
  }
  return readCookie('XSRF-TOKEN');
}

async function request<T>(method: string, url: string, body?: unknown): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  let payload: BodyInit | undefined;
  if (method !== 'GET') {
    const token = await ensureCsrf();
    if (token) headers['X-XSRF-TOKEN'] = token;
  }
  if (body instanceof FormData) {
    payload = body;
  } else if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    payload = JSON.stringify(body);
  }
  const res = await fetch(url, { method, headers, body: payload, credentials: 'same-origin' });
  if (!res.ok) {
    let message = `Fehler ${res.status}`;
    try {
      const data = await res.json();
      if (data?.message) message = data.message;
    } catch {
      // keep generic message
    }
    if (res.status === 403 && method !== 'GET') {
      // Most likely an expired CSRF token: drop it so the next try fetches a fresh one.
      document.cookie = 'XSRF-TOKEN=; Max-Age=0; path=/';
    }
    throw new ApiError(res.status, message);
  }
  if (res.status === 204) return undefined as T;
  const text = await res.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

export const api = {
  get: <T>(url: string) => request<T>('GET', url),
  post: <T>(url: string, body?: unknown) => request<T>('POST', url, body ?? {}),
  put: <T>(url: string, body: unknown) => request<T>('PUT', url, body),
  del: <T = void>(url: string) => request<T>('DELETE', url),
};

export function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return 'Unbekannter Fehler';
}
