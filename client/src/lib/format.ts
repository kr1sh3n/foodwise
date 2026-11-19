import type { Category, Dietary, RequestStatus, ListingStatus } from './types';

export const CATEGORY_LABEL: Record<Category, string> = {
  MEALS: 'Meals', BAKERY: 'Bakery', SNACKS: 'Snacks', FRUITS_VEG: 'Fruits & Veg', DAIRY: 'Dairy', BEVERAGES: 'Beverages', DESSERTS: 'Desserts',
};
export const CATEGORY_EMOJI: Record<Category, string> = { MEALS: '🍛', BAKERY: '🥐', SNACKS: '🥪', FRUITS_VEG: '🥗', DAIRY: '🥛', BEVERAGES: '🧃', DESSERTS: '🍰' };
export const DIETARY: Record<Dietary, { label: string; cls: string }> = {
  VEG: { label: 'Veg', cls: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200' },
  VEGAN: { label: 'Vegan', cls: 'bg-lime-50 text-lime-700 ring-1 ring-lime-200' },
  NON_VEG: { label: 'Non-veg', cls: 'bg-rose-50 text-rose-700 ring-1 ring-rose-200' },
};
export const REQ_STATUS: Record<RequestStatus, { label: string; cls: string }> = {
  PENDING: { label: 'Pending', cls: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200' },
  APPROVED: { label: 'Approved', cls: 'bg-sky-50 text-sky-700 ring-1 ring-sky-200' },
  COLLECTED: { label: 'Collected', cls: 'bg-brand-50 text-brand-700 ring-1 ring-brand-200' },
  REJECTED: { label: 'Declined', cls: 'bg-rose-50 text-rose-700 ring-1 ring-rose-200' },
  CANCELLED: { label: 'Cancelled', cls: 'bg-slate-100 text-slate-600 ring-1 ring-slate-200' },
  EXPIRED: { label: 'Expired', cls: 'bg-slate-100 text-slate-500 ring-1 ring-slate-200' },
};
export const LISTING_STATUS: Record<ListingStatus, { label: string; cls: string }> = {
  ACTIVE: { label: 'Active', cls: 'bg-brand-50 text-brand-700 ring-1 ring-brand-200' },
  COMPLETED: { label: 'Completed', cls: 'bg-sky-50 text-sky-700 ring-1 ring-sky-200' },
  EXPIRED: { label: 'Expired', cls: 'bg-slate-100 text-slate-500 ring-1 ring-slate-200' },
  CANCELLED: { label: 'Withdrawn', cls: 'bg-slate-100 text-slate-500 ring-1 ring-slate-200' },
};
export const ROLE_LABEL = { PROVIDER: 'Food Provider', STUDENT: 'Student', NGO: 'NGO' } as const;

const unsplash = (id: string) => `https://images.unsplash.com/photo-${id}?w=1000&q=70&auto=format&fit=crop`;
/** Generic placeholder: a vegetarian bowl, so a listing without a photo never shows meat by mistake. */
export const FALLBACK_IMG = unsplash('1512621776951-a57141f2eefd');
/** Vegetarian-safe placeholder per category, used when a provider doesn't upload a photo. */
const CATEGORY_IMG: Record<string, string> = {
  MEALS: unsplash('1512621776951-a57141f2eefd'),
  BAKERY: unsplash('1509440159596-0249088772ff'),
  SNACKS: unsplash('1601050690597-df0568f70950'),
  FRUITS_VEG: unsplash('1490474418585-ba9bad8fd0ea'),
  DAIRY: unsplash('1488477181946-6428a0291777'),
  BEVERAGES: unsplash('1495474472287-4d71bcdd2085'),
  DESSERTS: unsplash('1565958011703-44f9829ba187'),
};
export const categoryImage = (category?: string | null) => (category && CATEGORY_IMG[category]) || FALLBACK_IMG;
export const num = (n: number) => n.toLocaleString('en-IN', { maximumFractionDigits: 1 });

export function timeLeft(deadline: string | Date, now = Date.now()) {
  const ms = new Date(deadline).getTime() - now;
  if (ms <= 0) return { text: 'Expired', urgent: true, expired: true };
  const m = Math.floor(ms / 60000), h = Math.floor(m / 60), d = Math.floor(h / 24);
  const text = d >= 1 ? `${d}d ${h % 24}h left` : h >= 1 ? `${h}h ${m % 60}m left` : `${m}m left`;
  return { text, urgent: ms < 60 * 60 * 1000, expired: false };
}
export function ago(date: string | Date) {
  const s = Math.max(0, (Date.now() - new Date(date).getTime()) / 1000);
  if (s < 60) return 'just now';
  const m = s / 60; if (m < 60) return `${Math.floor(m)}m ago`;
  const h = m / 60; if (h < 24) return `${Math.floor(h)}h ago`;
  const d = h / 24; if (d < 7) return `${Math.floor(d)}d ago`;
  return new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}
export const clock = (d: string | Date) => new Date(d).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
export const dateTime = (d: string | Date) => new Date(d).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
/** Value for <input type="datetime-local"> in local time */
export const toLocalInput = (d: Date) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
