import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, PackageCheck, X, Building2, GraduationCap, HandHeart } from 'lucide-react';
import { api } from '../lib/api';
import { ago, REQ_STATUS } from '../lib/format';
import type { FoodRequest } from '../lib/types';
import { useToast } from './Toast';
import { Badge, Img, Modal, Spinner } from './ui';

/** Provider-side row for an incoming request, with approve / reject / confirm-pickup actions. */
export default function RequestRow({ r, unit, showListing = false, onChange }: { r: FoodRequest; unit?: string; showListing?: boolean; onChange: () => void }) {
  const toast = useToast();
  const [busy, setBusy] = useState<string | null>(null);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [collectOpen, setCollectOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [code, setCode] = useState('');
  const [err, setErr] = useState('');
  const u = unit ?? r.listing?.unit ?? 'servings';
  const RoleIcon = r.requester?.role === 'NGO' ? HandHeart : r.requester?.role === 'PROVIDER' ? Building2 : GraduationCap;

  const act = async (kind: 'approve' | 'reject' | 'collect', body?: object) => {
    setBusy(kind); setErr('');
    try {
      await api(`/requests/${r.id}/${kind}`, { method: 'POST', body: body ?? {} });
      toast(kind === 'approve' ? `Approved — ${r.quantity} ${u} reserved for ${r.requester?.name}` : kind === 'reject' ? 'Request declined' : `Pickup confirmed — ${r.quantity} ${u} rescued 🌱`);
      setRejectOpen(false); setCollectOpen(false); onChange();
    } catch (e) { const m = (e as Error).message; if (kind === 'collect') setErr(m); else toast(m, 'error'); }
    finally { setBusy(null); }
  };

  return (
    <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
      {showListing && r.listing && (
        <Link to={`/food/${r.listingId}`} className="shrink-0"><Img src={r.listing.imageUrl} category={r.listing.category} alt={r.listing.title} className="h-14 w-14 rounded-xl object-cover" /></Link>
      )}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <RoleIcon className="h-4 w-4 text-slate-400" />
          <span className="font-semibold">{r.requester?.name}</span>
          {r.requester?.organization && <span className="text-sm text-slate-500">· {r.requester.organization}</span>}
          <Badge cls={REQ_STATUS[r.status].cls}>{REQ_STATUS[r.status].label}</Badge>
        </div>
        <p className="mt-0.5 text-sm text-slate-600">
          Wants <b>{r.quantity} {u}</b>{showListing && r.listing && <> of <Link className="font-medium text-brand-700 hover:underline" to={`/food/${r.listingId}`}>{r.listing.title}</Link></>} · {ago(r.createdAt)}
        </p>
        {r.message && <p className="mt-1 text-sm italic text-slate-500">"{r.message}"</p>}
      </div>
      <div className="flex shrink-0 gap-2">
        {r.status === 'PENDING' && <>
          <button className="btn-danger !py-2" disabled={!!busy} onClick={() => setRejectOpen(true)}><X className="h-4 w-4" />Decline</button>
          <button className="btn-primary !py-2" disabled={!!busy} onClick={() => act('approve')}>{busy === 'approve' ? <Spinner className="h-4 w-4 !text-white" /> : <Check className="h-4 w-4" />}Approve</button>
        </>}
        {r.status === 'APPROVED' && <>
          <button className="btn-ghost !py-2 text-red-600" disabled={!!busy} onClick={() => setRejectOpen(true)}>Revoke</button>
          <button className="btn-primary !py-2" disabled={!!busy} onClick={() => { setCode(''); setErr(''); setCollectOpen(true); }}><PackageCheck className="h-4 w-4" />Confirm pickup</button>
        </>}
      </div>

      <Modal open={rejectOpen} onClose={() => setRejectOpen(false)} title={r.status === 'APPROVED' ? 'Revoke approval?' : 'Decline request?'}>
        <p className="text-sm text-slate-600">{r.requester?.name} will be notified{r.status === 'APPROVED' && <> and {r.quantity} {u} will return to available stock</>}.</p>
        <label className="label mt-4" htmlFor={`reason-${r.id}`}>Reason <span className="font-normal text-slate-400">(optional)</span></label>
        <input id={`reason-${r.id}`} className="input" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Reserved for hostel residents first" maxLength={200} />
        <div className="mt-5 flex justify-end gap-2">
          <button className="btn-ghost" onClick={() => setRejectOpen(false)}>Keep</button>
          <button className="btn bg-red-600 text-white hover:bg-red-700" disabled={!!busy} onClick={() => act('reject', { reason: reason || undefined })}>{busy === 'reject' && <Spinner className="h-4 w-4 !text-white" />}{r.status === 'APPROVED' ? 'Revoke' : 'Decline'}</button>
        </div>
      </Modal>

      <Modal open={collectOpen} onClose={() => setCollectOpen(false)} title="Confirm pickup">
        <p className="text-sm text-slate-600">Ask {r.requester?.name} for the 4-digit pickup code shown in their FoodWise dashboard.</p>
        <form onSubmit={(e) => { e.preventDefault(); act('collect', { code }); }}>
          <input autoFocus inputMode="numeric" pattern="[0-9]{4}" maxLength={4} required aria-label="Pickup code" className="input mt-4 text-center font-mono text-3xl tracking-[.6em]" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} placeholder="0000" />
          {err && <p className="mt-2 text-sm text-red-600">{err}</p>}
          <button className="btn-primary mt-5 w-full !py-3" disabled={code.length !== 4 || !!busy}>{busy === 'collect' && <Spinner className="h-4 w-4 !text-white" />}Mark {r.quantity} {u} as collected</button>
        </form>
      </Modal>
    </div>
  );
}
