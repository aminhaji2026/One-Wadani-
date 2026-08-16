const BASE = import.meta.env.VITE_API_URL || '/api';

export async function publicApi<T = any>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE}/public${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as any).error || 'Request failed');
  return data as T;
}

export type CampaignSummary = {
  id: string;
  slug: string;
  title: string;
  description?: string | null;
  story?: string | null;
  shareText?: string | null;
  targetAmount: number;
  raisedAmount: number;
  currency: string;
  imageUrl?: string | null;
  videoUrl?: string | null;
  endsAt?: string | null;
  office?: { name: string; country: string } | null;
  donorCount: number;
  progress: number;
};

export type CampaignDetail = CampaignSummary & {
  recentDonations: Array<{
    name: string;
    country: string;
    amount: number;
    currency: string;
    recurring: boolean;
    at: string;
  }>;
};

export type PublicEvent = {
  id: string;
  title: string;
  description?: string | null;
  venue?: string | null;
  startsAt: string;
  endsAt?: string | null;
  capacity?: number | null;
  status: string;
  imageUrl?: string | null;
  office?: { name: string; country: string; city?: string } | null;
  attendees: number;
  openShifts?: number;
  upcoming?: boolean;
  completed?: boolean;
  shifts: Array<{
    id: string;
    title: string;
    role?: string | null;
    description?: string | null;
    startsAt: string;
    endsAt?: string | null;
    capacity: number;
    signedUp: number;
    seatsLeft: number;
    status?: string;
  }>;
};

export type VolunteerShift = {
  id: string;
  title: string;
  role?: string | null;
  description?: string | null;
  startsAt: string;
  endsAt?: string | null;
  capacity: number;
  signedUp: number;
  seatsLeft: number;
  event: {
    id: string;
    title: string;
    venue?: string | null;
    office?: { name: string; country: string } | null;
  };
};

export function money(n: number, currency = 'USD') {
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).format(n);
  } catch {
    return `$${Math.round(n)}`;
  }
}

export function whenLabel(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}
