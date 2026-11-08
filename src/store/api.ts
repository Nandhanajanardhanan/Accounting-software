// How the app talks to the local server that keeps your books in data/books.db.
import type { CompanyData } from '../core/types';

export interface RemoteState {
  companies: { id: string; name: string; updatedAt: string }[];
  activeId: string | null;
  storage: { path: string; sizeKb: number };
}

export interface RestorePoint { day: string; takenAt: string; size: number }

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api/books/${path}`, init);
  // Logged out or the login expired: start again at the login screen.
  if (res.status === 401) {
    window.location.reload();
    throw new Error('Please log in again.');
  }
  if (!res.ok) {
    let message = `The local server answered ${res.status}.`;
    try { message = (await res.json()).error ?? message; } catch { /* keep the status message */ }
    throw new Error(message);
  }
  return res.json() as Promise<T>;
}

const json = (body: unknown): RequestInit => ({ method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

export const api = {
  state: () => call<RemoteState>('state'),
  company: (id: string) => call<CompanyData>(`company/${encodeURIComponent(id)}`),
  save: (d: CompanyData) => call<{ ok: boolean; updatedAt: string }>(`company/${encodeURIComponent(d.company.id)}`, json(d)),
  remove: (id: string) => call<{ ok: boolean }>(`company/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  setActive: (id: string) => call<{ ok: boolean }>('active', json({ id })),
  restorePoints: (id: string) => call<RestorePoint[]>(`restore-points/${encodeURIComponent(id)}`),
  restorePoint: (id: string, day: string) => call<CompanyData>(`restore-points/${encodeURIComponent(id)}/${encodeURIComponent(day)}`),
};

async function authCall<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api/auth/${path}`, init);
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error ?? `The server answered ${res.status}.`);
  return body as T;
}

const post = (body?: unknown): RequestInit => ({ method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body ?? {}) });

export const authApi = {
  me: () => authCall<{ required: boolean; user: string | null }>('me'),
  login: (username: string, password: string) => authCall<{ ok: boolean }>('login', post({ username, password })),
  logout: () => authCall<{ ok: boolean }>('logout', post()),
};
