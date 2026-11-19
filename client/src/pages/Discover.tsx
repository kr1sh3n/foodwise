import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, SlidersHorizontal, UtensilsCrossed, X } from 'lucide-react';
import { useApi, useDebounced, useNow } from '../lib/hooks';
import { CATEGORY_EMOJI, CATEGORY_LABEL, DIETARY } from '../lib/format';
import type { Category, Dietary, Listing } from '../lib/types';
import FoodCard from '../components/FoodCard';
import { Empty, ErrorBox } from '../components/ui';

const CATS = Object.keys(CATEGORY_LABEL) as Category[];

export default function Discover() {
  const [sp, setSp] = useSearchParams();
  const [q, setQ] = useState(sp.get('q') ?? '');
  const dq = useDebounced(q, 300);
  const category = (sp.get('category') ?? '') as Category | '';
  const dietary = (sp.get('dietary') ?? '') as Dietary | '';
  const sort = sp.get('sort') ?? 'deadline';
  const now = useNow(15_000);
  const set = (k: string, v: string) => { const n = new URLSearchParams(sp); if (v) n.set(k, v); else n.delete(k); setSp(n, { replace: true }); };
  const path = useMemo(() => {
    const p = new URLSearchParams({ sort });
    if (dq.trim()) p.set('q', dq.trim());
    if (category) p.set('category', category);
    if (dietary) p.set('dietary', dietary);
    return `/listings?${p}`;
  }, [dq, category, dietary, sort]);
  const { data, error, loading, reload } = useApi<{ listings: Listing[] }>(path, 30_000);
  const listings = (data?.listings ?? []).filter((l) => new Date(l.deadline).getTime() > now);
  const filtersOn = !!(q || category || dietary);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold sm:text-4xl">Discover food</h1>
          <p className="mt-1 text-slate-500">Fresh surplus from campus kitchens, free to collect before the deadline.</p>
        </div>
      </div>

      <div className="sticky top-16 z-30 -mx-4 mt-6 border-b border-slate-200/60 bg-cream/90 px-4 py-3 backdrop-blur sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:p-0">
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input className="input !pl-10" placeholder="Search biryani, bakery, Hostel 7…" value={q} onChange={(e) => { setQ(e.target.value); set('q', e.target.value); }} aria-label="Search food" />
            {q && <button className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700" onClick={() => { setQ(''); set('q', ''); }} aria-label="Clear search"><X className="h-4 w-4" /></button>}
          </div>
          <div className="flex gap-2">
            <select className="input !w-auto" value={dietary} onChange={(e) => set('dietary', e.target.value)} aria-label="Dietary filter">
              <option value="">All diets</option>
              {(Object.keys(DIETARY) as Dietary[]).map((d) => <option key={d} value={d}>{DIETARY[d].label}</option>)}
            </select>
            <select className="input !w-auto" value={sort} onChange={(e) => set('sort', e.target.value)} aria-label="Sort">
              <option value="deadline">Ending soonest</option>
              <option value="newest">Newest</option>
              <option value="quantity">Most available</option>
            </select>
          </div>
        </div>
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
          <button onClick={() => set('category', '')} className={`chip shrink-0 !px-3.5 !py-2 text-sm transition ${!category ? 'bg-brand-600 text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:ring-brand-300'}`}>All</button>
          {CATS.map((c) => (
            <button key={c} onClick={() => set('category', category === c ? '' : c)} className={`chip shrink-0 !px-3.5 !py-2 text-sm transition ${category === c ? 'bg-brand-600 text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:ring-brand-300'}`}>
              {CATEGORY_EMOJI[c]} {CATEGORY_LABEL[c]}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6 flex items-center justify-between text-sm text-slate-500">
        <span className="flex items-center gap-1.5"><SlidersHorizontal className="h-4 w-4" />{loading && !data ? 'Loading…' : `${listings.length} listing${listings.length === 1 ? '' : 's'} available`}</span>
        {filtersOn && <button className="font-semibold text-brand-700 hover:underline" onClick={() => { setQ(''); setSp({}, { replace: true }); }}>Clear filters</button>}
      </div>

      <div className="mt-4">
        {error && <ErrorBox msg={error} retry={reload} />}
        {!error && data && listings.length === 0 && (
          <Empty icon={<UtensilsCrossed className="h-6 w-6" />} title="No food matches right now" body={filtersOn ? 'Try a different search or clear your filters.' : 'Nothing is listed at the moment — check back after lunch or dinner service.'}
            action={filtersOn ? <button className="btn-outline" onClick={() => { setQ(''); setSp({}, { replace: true }); }}>Clear filters</button> : undefined} />
        )}
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {listings.map((l, i) => <FoodCard key={l.id} l={l} now={now} i={i} />)}
          {loading && !data && Array.from({ length: 8 }).map((_, i) => <div key={i} className="card h-80 animate-pulse bg-slate-100" />)}
        </div>
      </div>
    </div>
  );
}
