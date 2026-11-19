import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, CalendarClock, ChefHat, Clock, MapPin, Minus, Pencil, Plus, Scale, Ban, Inbox, Ticket } from 'lucide-react';
import { useApi, useNow } from '../lib/hooks';
import { useAuth } from '../lib/auth';
import { api } from '../lib/api';
import { CATEGORY_EMOJI, CATEGORY_LABEL, DIETARY, LISTING_STATUS, REQ_STATUS, clock, dateTime, num, timeLeft } from '../lib/format';
import type { FoodRequest, Listing } from '../lib/types';
import { Badge, Empty, ErrorBox, Img, Modal, PageLoader, Spinner } from '../components/ui';
import { useToast } from '../components/Toast';
import RequestRow from '../components/RequestRow';

interface Detail { listing: Listing; requests: FoodRequest[]; isOwner: boolean; collected: { servings: number; pickups: number } }
const LIMIT = { STUDENT: 3, NGO: 500, PROVIDER: 0 };

export default function FoodDetails() {
  const { id } = useParams();
  const { user } = useAuth();
  const toast = useToast();
  const nav = useNavigate();
  const now = useNow(10_000);
  const { data, error, loading, reload } = useApi<Detail>(`/listings/${id}`, 20_000);
  const [qty, setQty] = useState(1);
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const [closeOpen, setCloseOpen] = useState(false);

  if (loading && !data) return <PageLoader />;
  if (error || !data) return <div className="mx-auto max-w-3xl px-4 py-12"><ErrorBox msg={error ?? 'Not found'} retry={reload} /></div>;
  const { listing: l, requests, isOwner, collected } = data;
  const t = timeLeft(l.deadline, now);
  const live = l.status === 'ACTIVE' && !t.expired;
  const open = !isOwner ? requests.find((r) => r.status === 'PENDING' || r.status === 'APPROVED') : undefined;
  const max = user ? Math.min(l.remaining, LIMIT[user.role]) : 0;
  const q = Math.min(Math.max(1, qty), Math.max(1, max));

  const submit = async (e: FormEvent) => {
    e.preventDefault(); setBusy(true);
    try { await api('/requests', { body: { listingId: l.id, quantity: q, message: msg || undefined } }); toast('Request sent! You\'ll be notified when the provider responds.'); setMsg(''); reload(true); }
    catch (x) { toast((x as Error).message, 'error'); reload(true); } finally { setBusy(false); }
  };
  const cancelReq = async (rid: string) => {
    setBusy(true);
    try { await api(`/requests/${rid}/cancel`, { method: 'POST' }); toast('Request cancelled', 'info'); reload(true); }
    catch (x) { toast((x as Error).message, 'error'); } finally { setBusy(false); }
  };
  const closeListing = async () => {
    setBusy(true);
    try { await api(`/listings/${l.id}/cancel`, { method: 'POST' }); toast('Listing withdrawn', 'info'); setCloseOpen(false); reload(true); }
    catch (x) { toast((x as Error).message, 'error'); } finally { setBusy(false); }
  };
  const pending = requests.filter((r) => r.status === 'PENDING');

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-10">
      <button onClick={() => (history.length > 1 ? nav(-1) : nav('/discover'))} className="btn-ghost -ml-3 mb-4"><ArrowLeft className="h-4 w-4" />Back</button>
      <div className="grid gap-8 lg:grid-cols-[1.15fr_1fr]">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <div className="relative overflow-hidden rounded-3xl">
            <Img src={l.imageUrl} category={l.category} alt={l.title} className="aspect-[4/3] w-full object-cover" />
            {!live && <div className="absolute inset-0 grid place-items-center bg-slate-900/50"><span className="rounded-full bg-white px-4 py-2 font-bold">{l.status === 'ACTIVE' ? 'Expired' : LISTING_STATUS[l.status].label}</span></div>}
          </div>
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { i: ChefHat, k: 'Prepared', v: dateTime(l.preparedAt) },
              { i: CalendarClock, k: 'Collect by', v: dateTime(l.deadline) },
              { i: Scale, k: 'Est. weight', v: `${num(l.quantity * l.kgPerUnit)} kg` },
              { i: Inbox, k: 'Rescued so far', v: `${collected.servings} ${l.unit}` },
            ].map((s) => (
              <div key={s.k} className="card p-3"><s.i className="h-4 w-4 text-brand-600" /><div className="mt-2 text-xs text-slate-500">{s.k}</div><div className="text-sm font-bold">{s.v}</div></div>
            ))}
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: .05 }}>
          <div className="flex flex-wrap gap-2">
            <Badge cls="bg-slate-100 text-slate-700">{CATEGORY_EMOJI[l.category]} {CATEGORY_LABEL[l.category]}</Badge>
            <Badge cls={DIETARY[l.dietary].cls}>{DIETARY[l.dietary].label}</Badge>
            <Badge cls={LISTING_STATUS[l.status].cls}>{LISTING_STATUS[l.status].label}</Badge>
          </div>
          <h1 className="mt-3 text-3xl font-extrabold sm:text-4xl">{l.title}</h1>
          <p className="mt-1 font-medium text-slate-500">{l.provider?.organization} · {l.provider?.name}</p>
          <p className="mt-4 leading-relaxed text-slate-600">{l.description}</p>

          <div className="card mt-6 divide-y divide-slate-100">
            <div className="flex items-center gap-3 p-4"><MapPin className="h-5 w-5 shrink-0 text-brand-600" /><div><div className="text-xs text-slate-500">Pickup location</div><div className="font-semibold">{l.pickupLocation}</div></div></div>
            <div className="flex items-center gap-3 p-4"><Clock className={`h-5 w-5 shrink-0 ${t.urgent ? 'text-red-500' : 'text-brand-600'}`} /><div><div className="text-xs text-slate-500">Collection deadline</div><div className={`font-semibold ${t.urgent ? 'text-red-600' : ''}`}>{clock(l.deadline)} · {t.text}</div></div></div>
            <div className="p-4">
              <div className="mb-2 flex justify-between text-sm"><span className="font-bold text-brand-700">{l.remaining} {l.unit} available</span><span className="text-slate-400">of {l.quantity}</span></div>
              <div className="h-2.5 overflow-hidden rounded-full bg-slate-100"><motion.div className="h-full rounded-full bg-gradient-to-r from-brand-500 to-brand-400" initial={{ width: 0 }} animate={{ width: `${(l.remaining / l.quantity) * 100}%` }} transition={{ duration: .8 }} /></div>
            </div>
          </div>

          {/* Action panel */}
          <div className="mt-6">
            {!user && live && (
              <div className="card p-5 text-center">
                <p className="font-semibold">Want this food?</p>
                <p className="mt-1 text-sm text-slate-500">Sign in as a student or NGO to request it.</p>
                <div className="mt-4 flex justify-center gap-2"><Link to={`/login?next=/food/${l.id}`} className="btn-primary">Sign in to request</Link><Link to="/register" className="btn-outline">Create account</Link></div>
              </div>
            )}

            {isOwner && (
              <div className="flex flex-wrap gap-2">
                {l.status === 'ACTIVE' && <Link to={`/listings/${l.id}/edit`} className="btn-outline"><Pencil className="h-4 w-4" />Edit listing</Link>}
                {l.status === 'ACTIVE' && <button className="btn-danger" onClick={() => setCloseOpen(true)}><Ban className="h-4 w-4" />Withdraw listing</button>}
              </div>
            )}

            {user && user.role === 'PROVIDER' && !isOwner && <p className="rounded-xl bg-slate-100 p-4 text-sm text-slate-600">Provider accounts can list food but not request it. Sign in with a student or NGO account to claim this batch.</p>}

            {user && user.role !== 'PROVIDER' && open && (
              <div className={`card p-5 ${open.status === 'APPROVED' ? 'border-sky-200 bg-sky-50/40' : ''}`}>
                <div className="flex items-center justify-between"><span className="font-bold">Your request</span><Badge cls={REQ_STATUS[open.status].cls}>{REQ_STATUS[open.status].label}</Badge></div>
                <p className="mt-1 text-sm text-slate-600">{open.quantity} {l.unit} {open.status === 'PENDING' ? '— waiting for the provider to respond.' : `— reserved for you. Collect before ${clock(l.deadline)}.`}</p>
                {open.status === 'APPROVED' && (
                  <div className="mt-4 flex items-center gap-4 rounded-2xl bg-white p-4 ring-1 ring-sky-200">
                    <Ticket className="h-8 w-8 text-sky-600" />
                    <div><div className="text-xs font-medium text-slate-500">Show this pickup code at the counter</div><div className="font-mono text-3xl font-extrabold tracking-[.3em] text-slate-900">{open.pickupCode}</div></div>
                  </div>
                )}
                <button className="btn-ghost mt-3 text-red-600" disabled={busy} onClick={() => cancelReq(open.id)}>Cancel request</button>
              </div>
            )}

            {user && user.role !== 'PROVIDER' && !open && live && l.remaining > 0 && (
              <form onSubmit={submit} className="card p-5">
                <p className="font-bold">Request this food</p>
                <p className="text-sm text-slate-500">{user.role === 'STUDENT' ? `Students can request up to ${LIMIT.STUDENT} ${l.unit} at a time.` : 'NGOs can request bulk quantities for distribution.'}</p>
                <div className="mt-4 flex items-center gap-3">
                  <button type="button" className="btn-outline !p-3" onClick={() => setQty(q - 1)} disabled={q <= 1} aria-label="Decrease"><Minus className="h-4 w-4" /></button>
                  <input type="number" min={1} max={max} value={q} onChange={(e) => setQty(Number(e.target.value) || 1)} className="input w-24 text-center text-lg font-bold" aria-label="Quantity" />
                  <button type="button" className="btn-outline !p-3" onClick={() => setQty(q + 1)} disabled={q >= max} aria-label="Increase"><Plus className="h-4 w-4" /></button>
                  <span className="text-sm text-slate-500">{l.unit} · ~{num(q * l.kgPerUnit)} kg</span>
                </div>
                {user.role === 'NGO' && max > 1 && <button type="button" className="mt-2 text-xs font-semibold text-brand-700 hover:underline" onClick={() => setQty(max)}>Request all {max}</button>}
                <textarea className="input mt-4" rows={2} maxLength={300} placeholder="Note for the provider (optional) — e.g. when you'll arrive" value={msg} onChange={(e) => setMsg(e.target.value)} />
                <button className="btn-primary mt-4 w-full !py-3" disabled={busy}>{busy && <Spinner className="h-4 w-4 !text-white" />}Send request</button>
              </form>
            )}

            {user && user.role !== 'PROVIDER' && !open && !live && <p className="rounded-xl bg-slate-100 p-4 text-sm text-slate-600">This listing is no longer accepting requests. <Link to="/discover" className="font-semibold text-brand-700">Find other food →</Link></p>}

            {user && user.role !== 'PROVIDER' && requests.filter((r) => r !== open).length > 0 && (
              <div className="mt-4 text-sm text-slate-500">Past requests here: {requests.filter((r) => r !== open).map((r) => `${r.quantity} ${l.unit} (${REQ_STATUS[r.status].label.toLowerCase()})`).join(', ')}</div>
            )}
          </div>
        </motion.div>
      </div>

      {isOwner && (
        <section className="mt-10">
          <h2 className="text-xl font-extrabold">Requests <span className="text-slate-400">({requests.length})</span></h2>
          {pending.length > 0 && <p className="text-sm text-amber-700">{pending.length} waiting for your response</p>}
          <div className="card mt-4 divide-y divide-slate-100">
            {requests.length === 0 ? <div className="p-2"><Empty icon={<Inbox className="h-6 w-6" />} title="No requests yet" body="Students and NGOs will see this listing on the Discover page." /></div>
              : requests.map((r) => <RequestRow key={r.id} r={r} unit={l.unit} onChange={() => reload(true)} />)}
          </div>
        </section>
      )}

      <Modal open={closeOpen} onClose={() => setCloseOpen(false)} title="Withdraw this listing?">
        <p className="text-sm text-slate-600">It will be removed from Discover. Anyone with a pending or approved request will be notified and their request cancelled.</p>
        <div className="mt-5 flex justify-end gap-2"><button className="btn-ghost" onClick={() => setCloseOpen(false)}>Keep listing</button><button className="btn bg-red-600 text-white hover:bg-red-700" disabled={busy} onClick={closeListing}>Withdraw</button></div>
      </Modal>
    </div>
  );
}
