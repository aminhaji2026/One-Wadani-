const BASE = import.meta.env.VITE_API_URL || (typeof window !== 'undefined' ? '/api' : 'http://localhost:4000/api');

export type PortalKind = 'staff' | 'member' | 'supporter' | 'volunteer';

export type StoredUser = {
  id?: string;
  name?: string;
  email?: string | null;
  portal?: PortalKind;
  mustChangePassword?: boolean;
  officeId?: string | null;
};

export const getToken = () => localStorage.getItem('waddani_token');

export function clearSession() {
  localStorage.removeItem('waddani_token');
  localStorage.removeItem('waddani_user');
}

export function getStoredUser(): StoredUser | null {
  try {
    const raw = localStorage.getItem('waddani_user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export async function api(path: string, options: RequestInit = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
      ...(options.headers || {}),
    },
  });

  const data = await res.json().catch(() => ({}));
  if (res.status === 401) {
    clearSession();
    if (!path.includes('/auth/login')) {
      window.location.assign('/');
    }
  }
  if (!res.ok) {
    const message =
      typeof data.error === 'string'
        ? data.error
        : data.error
          ? JSON.stringify(data.error)
          : 'Request failed';
    throw new Error(message);
  }
  return data;
}

export async function login(email: string, password: string, portal: PortalKind = 'staff') {
  const data = await api('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password, portal }),
  });
  localStorage.setItem('waddani_token', data.token);
  localStorage.setItem('waddani_user', JSON.stringify(data.user));
  return data;
}

export async function changePassword(currentPassword: string, newPassword: string) {
  const data = await api('/auth/change-password', {
    method: 'POST',
    body: JSON.stringify({
      currentPassword: currentPassword.trim(),
      newPassword: newPassword.trim(),
    }),
  });
  if (data.token) localStorage.setItem('waddani_token', data.token);
  if (data.user) localStorage.setItem('waddani_user', JSON.stringify(data.user));
  return data;
}
