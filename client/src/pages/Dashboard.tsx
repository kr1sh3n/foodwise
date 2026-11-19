import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Cloud, Inbox, ListChecks, Plus, Scale, Soup, Ticket, Utensils, PackageCheck, Pencil, Clock } from 'lucide-react';
import { useAuth } from '../lib/auth';
import { useApi, useNow } from '../lib/hooks';
import { api } from '../lib/api';
import { LISTING_STATUS, REQ_STATUS, clock, ago, num, timeLeft } from '../lib/format';
import type { FoodRequest, Impact, Listing, User } from '../lib/types';
import { Badge, Empty, ErrorBox, Img, PageLoader, Stat, Tabs } from '../components/ui';
import { useToast } from '../components/Toast';
import RequestRow from '../components/RequestRow';
import FoodCard from '../components/FoodCard';

export default function Dashboard() {
  const { user } = useAuth();
  if (!user) return null;
  return user.role === 'PROVIDER' ? <ProviderDashboard user={user} /> : <RecipientDashboard user={user} />;
}

function Header({ user, sub, action }: { user: User; sub: string; action?: React.ReactNode }) {
  const h = new Date().getHours();
  const greet = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="text-sm font-semibold text-brand-600">{user.organization ?? user.campus ?? 'FoodWise'}</p>
        <h1 className="text-3xl font-extrabold sm:text-4xl">{greet}, {user.name.split(' ')[0]} 👋</h1>
        <p className="mt-1 text-slate-500">{sub}</p>
      </div>
      {action}
    </div>
  );
}

function ImpactStats({ t, role }: { t?: Impact['totals']; role: string }) {
  return (
    <div className="mt-8 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
      <Stat icon={<Soup className="h-5 w-5" />} label={role === 'PROVIDER' ? 'Meals donated' : 'Meals rescued'} value={t ? num(t.meals) : '—'} />
      <Stat icon={<Scale className="h-5 w-5" />} label="Food saved" value={t ? `${num(t.kg)} kg` : '—'} tone="sky" />
      <Stat icon={<Cloud className="h-5 w-5" />} label="CO₂e avoided" value={t ? `${num(t.co2)} kg` : '—'} tone="violet" />
      <Stat icon={<PackageCheck className="h-5 w-5" />} label="Successful pickups" value={t ? num(t.collections) : '—'} tone="amber" />
    </div>
  );
}

function ProviderDashboard({ user }: { user: User }) {
  const now = useNow();
  const toast = useToast();
  const [tab, setTab] = useState<'PENDING' | 'APPROVED' | 'ALL'>('PENDING');
  const [ltab, setLtab] = useState<'ACTIVE' | 'PAST'>('ACTIVE');
  const reqs = useApi<{ requests: FoodRequest[] }>('/requests/incoming', 15_000);
  const lists = useApi<{ listings: Listing[] }>('/listings?mine=true&status=ALL&sort=newest&limit=100', 30_000);
  const impact = useApi<Impact>('/impact?scope=me');
  const refresh = () => { reqs.reload(true); lists.reload(true); impact.reload(true); };
  const all = reqs.data?.requests ?? [];
  const shown = tab === 'ALL' ? all : all.filter((r) => r.status === tab);
  const mine = lists.data?.listings ?? [];
  const active = mine.filter((l) => l.status === 'ACTIVE').sort((a, b) => +new Date(a.deadline) - +new Date(b.deadline));
  const past = mine.filter((l) => l.status !== 'ACTIVE');
  const cancel = async (l: Listing) => {
    if (!confirm(`Withdraw "${l.title}"? Open requests will be cancelled.`)) return;
    try { await api(`/listings/${l.id}/cancel`, { method: 'POST' }); toast('Listing withdrawn', 'info'); refresh(); } catch (e) { toast((e as Error).message, 'error'); }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10">
      <Header user={user} sub="Manage your surplus listings and incoming requests." action={<Link to="/listings/new" className="btn-primary !py-3"><Plus className="h-4 w-4" />List surplus food</Link>} />
      <ImpactStats t={impact.data?.totals} role="PROVIDER" />

      <div className="mt-10 grid gap-8 xl:grid-cols-[1.4fr_1fr]">
        <section>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-extrabold">Incoming requests</h2>
            <Tabs value={tab} onChange={setTab} items={[
              { value: 'PENDING', label: 'Pending', count: all.filter((r) => r.status === 'PENDING').length },
              { value: 'APPROVED', label: 'Awaiting pickup', count: all.filter((r) => r.status === 'APPROVED').length },
              { value: 'ALL', label: 'All' },
            ]} />
          </div>
          <div className="mt-4">
            {reqs.error && <ErrorBox msg={reqs.error} retry={reqs.reload} />}
            {reqs.loading && !reqs.data ? <PageLoader /> : shown.length === 0
              ? <Empty icon={<Inbox className="h-6 w-6" />} title={tab === 'PENDING' ? 'No pending requests' : tab === 'APPROVED' ? 'No pickups waiting' : 'No requests yet'} body="New requests appear here automatically." />
              : <div className="card divide-y divide-slate-100">{shown.slice(0, 40).map((r) => <RequestRow key={r.id} r={r} showListing onChange={refresh} />)}</div>}
          </div>
        </section>

        <section>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-extrabold">My listings</h2>
            <Tabs value={ltab} onChange={setLtab} items={[{ value: 'ACTIVE', label: 'Active', count: active.length }, { value: 'PAST', label: 'Past', count: past.length }]} />
          </div>
          <div className="mt-4 space-y-3">
            {(ltab === 'ACTIVE' ? active : past).length === 0 && (
              <Empty icon={<Utensils className="h-6 w-6" />} title={ltab === 'ACTIVE' ? 'Nothing listed right now' : 'No past listings'} body="Had a surplus batch today? List it in 30 seconds."
                action={<Link to="/listings/new" className="btn-primary"><Plus className="h-4 w-4" />New listing</Link>} />
            )}
            {(ltab === 'ACTIVE' ? active : past).slice(0, 30).map((l) => {
              const t = timeLeft(l.deadline, now);
              return (
                <motion.div layout key={l.id} className="card flex gap-3 p-3">
                  <Link to={`/food/${l.id}`} className="shrink-0"><Img src={l.imageUrl} category={l.category} alt={l.title} className="h-20 w-20 rounded-xl object-cover" /></Link>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <Link to={`/food/${l.id}`} className="line-clamp-1 font-bold hover:text-brand-700">{l.title}</Link>
                      <Badge cls={LISTING_STATUS[l.status].cls}>{LISTING_STATUS[l.status].label}</Badge>
                    </div>
                    <p className="text-sm text-slate-500">{l.remaining}/{l.quantity} {l.unit} left{l._count?.requests ? <> · <span className="font-semibold text-amber-600">{l._count.requests} pending</span></> : null}</p>
                    {l.status === 'ACTIVE'
                      ? <p className={`flex items-center gap-1 text-xs ${t.urgent ? 'text-red-600' : 'text-slate-400'}`}><Clock className="h-3 w-3" />{t.text} · by {clock(l.deadline)}</p>
                      : <p className="text-xs text-slate-400">Listed {ago(l.createdAt)}</p>}
                    {l.status === 'ACTIVE' && (
                      <div className="mt-2 flex gap-3 text-xs font-semibold">
                        <Link to={`/listings/${l.id}/edit`} className="flex items-center gap-1 text-slate-600 hover:text-brand-700"><Pencil className="h-3 w-3" />Edit</Link>
                        <Link to={`/food/${l.id}`} className="flex items-center gap-1 text-slate-600 hover:text-brand-700"><ListChecks className="h-3 w-3" />Requests</Link>
                        <button onClick={() => cancel(l)} className="text-red-600 hover:underline">Withdraw</button>
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}

function RecipientDashboard({ user }: { user: User }) {
  const now = useNow();
  const toast = useToast();
  const isNgo = user.role === 'NGO';
  const [tab, setTab] = useState<'ACTIVE' | 'HISTORY'>('ACTIVE');
  const reqs = useApi<{ requests: FoodRequest[] }>('/requests/mine', 15_000);
  const impact = useApi<Impact>('/impact?scope=me');
  const feed = useApi<{ listings: Listing[] }>(`/listings?sort=${isNgo ? 'quantity' : 'deadline'}&limit=6`, 30_000);
  const all = reqs.data?.requests ?? [];
  const activeReqs = all.filter((r) => r.status === 'PENDING' || r.status === 'APPROVED');
  const history = all.filter((r) => !['PENDING', 'APPROVED'].includes(r.status));
  const cancel = async (r: FoodRequest) => {
    try { await api(`/requests/${r.id}/cancel`, { method: 'POST' }); toast('Request cancelled', 'info'); reqs.reload(true); } catch (e) { toast((e as Error).message, 'error'); }
  };
  const list = tab === 'ACTIVE' ? activeReqs : history;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10">
      <Header user={user} sub={isNgo ? 'Claim bulk surplus for your community and track your collections.' : 'Grab free surplus food on campus and track your impact.'}
        action={<Link to="/discover" className="btn-primary !py-3">Find food <ArrowRight className="h-4 w-4" /></Link>} />
      <ImpactStats t={impact.data?.totals} role={user.role} />

      <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_1.1fr]">
        <section>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-extrabold">My requests</h2>
            <Tabs value={tab} onChange={setTab} items={[{ value: 'ACTIVE', label: 'Active', count: activeReqs.length }, { value: 'HISTORY', label: 'History', count: history.length }]} />
          </div>
          <div className="mt-4 space-y-3">
            {reqs.error && <ErrorBox msg={reqs.error} retry={reqs.reload} />}
            {reqs.loading && !reqs.data && <PageLoader />}
            {reqs.data && list.length === 0 && (
              <Empty icon={<Ticket className="h-6 w-6" />} title={tab === 'ACTIVE' ? 'No active requests' : 'No history yet'} body="Browse available food and send your first request." action={<Link to="/discover" className="btn-primary">Discover food</Link>} />
            )}
            {list.slice(0, 40).map((r) => {
              const t = r.listing ? timeLeft(r.listing.deadline, now) : null;
              return (
                <motion.div layout key={r.id} className={`card overflow-hidden ${r.status === 'APPROVED' ? 'ring-2 ring-sky-200' : ''}`}>
                  <div className="flex gap-3 p-3">
                    <Link to={`/food/${r.listingId}`} className="shrink-0"><Img src={r.listing?.imageUrl} category={r.listing?.category} alt={r.listing?.title ?? ''} className="h-20 w-20 rounded-xl object-cover" /></Link>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <Link to={`/food/${r.listingId}`} className="line-clamp-1 font-bold hover:text-brand-700">{r.listing?.title}</Link>
                        <Badge cls={REQ_STATUS[r.status].cls}>{REQ_STATUS[r.status].label}</Badge>
                      </div>
                      <p className="text-sm text-slate-500">{r.quantity} {r.listing?.unit} · {r.listing?.provider.organization}</p>
                      <p className="line-clamp-1 text-xs text-slate-400">{r.listing?.pickupLocation}</p>
                      {(r.status === 'PENDING' || r.status === 'APPROVED') && t && <p className={`mt-0.5 text-xs font-medium ${t.urgent ? 'text-red-600' : 'text-slate-500'}`}>Collect by {clock(r.listing!.deadline)} · {t.text}</p>}
                      {r.status === 'COLLECTED' && r.collectedAt && <p className="mt-0.5 text-xs text-brand-700">Collected {ago(r.collectedAt)} · ~{num(r.quantity * (r.listing?.kgPerUnit ?? 0))} kg saved</p>}
                    </div>
                  </div>
                  {(r.status === 'APPROVED' || r.status === 'PENDING') && (
                    <div className="flex items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/60 px-4 py-2.5">
                      {r.status === 'APPROVED'
                        ? <span className="flex items-center gap-2 text-sm"><Ticket className="h-4 w-4 text-sky-600" />Pickup code <b className="font-mono text-lg tracking-widest">{r.pickupCode}</b></span>
                        : <span className="text-sm text-slate-500">Waiting for provider…</span>}
                      <button className="text-sm font-semibold text-red-600 hover:underline" onClick={() => cancel(r)}>Cancel</button>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        </section>

        <section>
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-extrabold">{isNgo ? 'Largest batches available' : 'Ending soon'}</h2>
            <Link to="/discover" className="text-sm font-semibold text-brand-700 hover:underline">View all</Link>
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {feed.data?.listings.slice(0, 4).map((l, i) => <FoodCard key={l.id} l={l} now={now} i={i} />)}
          </div>
          {feed.data && feed.data.listings.length === 0 && <Empty icon={<Utensils className="h-6 w-6" />} title="Nothing available right now" body="Check back after the next meal service." />}
        </section>
      </div>
    </div>
  );
}
