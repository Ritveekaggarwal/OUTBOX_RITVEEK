import type { ApiErrorBody } from '../types/api';

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export const UNAUTHORIZED_EVENT = 'auth:unauthorized';

type Query = Record<string, string | number | boolean | undefined | null>;

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  query?: Query;
  signal?: AbortSignal;
}

const buildUrl = (path: string, query?: Query): string => {
  const params = new URLSearchParams();
  Object.entries(query ?? {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') params.set(key, String(value));
  });
  const search = params.toString();
  return `/api${path}${search ? `?${search}` : ''}`;
};

/** Thin fetch wrapper: same-origin cookies, JSON in/out, typed errors. */
export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const response = await fetch(buildUrl(path, options.query), {
    method: options.method ?? 'GET',
    credentials: 'include',
    headers: options.body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    signal: options.signal,
  });

  if (response.status === 204) return undefined as T;

  const payload = (await response.json().catch(() => null)) as unknown;

  if (!response.ok) {
    const error = (payload as ApiErrorBody | null)?.error;
    if (response.status === 401) window.dispatchEvent(new Event(UNAUTHORIZED_EVENT));
    throw new ApiError(response.status, error?.code ?? 'UNKNOWN', error?.message ?? 'Something went wrong');
  }
  return payload as T;
}
