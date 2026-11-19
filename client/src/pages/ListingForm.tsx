import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ImagePlus, Link2, Trash2, ArrowLeft } from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { CATEGORY_EMOJI, CATEGORY_LABEL, DIETARY, toLocalInput } from '../lib/format';
import type { Category, Dietary, Listing } from '../lib/types';
import { useToast } from '../components/Toast';
import { Img, PageLoader, Spinner } from '../components/ui';

const CATS = Object.keys(CATEGORY_LABEL) as Category[];
const UNITS = ['servings', 'plates', 'boxes', 'pieces', 'loaves', 'cups', 'bottles', 'kg'];
const KG_HINT: Record<string, number> = { servings: 0.4, plates: 0.4, boxes: 0.5, pieces: 0.12, loaves: 0.6, cups: 0.25, bottles: 0.3, kg: 1 };

export default function ListingForm() {
  const { id } = useParams();
  const editing = !!id;
  const nav = useNavigate();
  const toast = useToast();
  const { user } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(editing);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState('');
  const [showUrl, setShowUrl] = useState(false);
  const [f, setF] = useState({
    title: '', description: '', category: 'MEALS' as Category, dietary: 'VEG' as Dietary, imageUrl: '',
    quantity: 20, unit: 'servings', kgPerUnit: 0.4,
    preparedAt: toLocalInput(new Date()), deadline: toLocalInput(new Date(Date.now() + 3 * 3600_000)),
    pickupLocation: '',
  });

  useEffect(() => {
    if (!editing) { setF((x) => ({ ...x, pickupLocation: user?.organization ? `${user.organization}, main counter` : '' })); return; }
    api<{ listing: Listing; isOwner: boolean }>(`/listings/${id}`).then(({ listing: l, isOwner }) => {
      if (!isOwner) { toast('You can only edit your own listings', 'error'); nav('/dashboard'); return; }
      setF({ title: l.title, description: l.description, category: l.category, dietary: l.dietary, imageUrl: l.imageUrl ?? '', quantity: l.quantity, unit: l.unit, kgPerUnit: l.kgPerUnit,
        preparedAt: toLocalInput(new Date(l.preparedAt)), deadline: toLocalInput(new Date(l.deadline)), pickupLocation: l.pickupLocation });
    }).catch((e) => setErr(e.message)).finally(() => setLoading(false));
  }, [id, editing, user, nav, toast]);

  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((x) => ({ ...x, [k]: v }));

  const upload = async (file: File) => {
    if (file.size > 5 * 1024 * 1024) return toast('Image must be under 5 MB', 'error');
    setUploading(true);
    try { const fd = new FormData(); fd.append('image', file); const r = await api<{ url: string }>('/uploads', { form: fd }); set('imageUrl', r.url); toast('Photo uploaded'); }
    catch (e) { toast((e as Error).message, 'error'); } finally { setUploading(false); }
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault(); setBusy(true); setErr('');
    const body = { ...f, imageUrl: f.imageUrl || null, preparedAt: new Date(f.preparedAt).toISOString(), deadline: new Date(f.deadline).toISOString() };
    try {
      const r = await api<{ listing: Listing }>(editing ? `/listings/${id}` : '/listings', { method: editing ? 'PATCH' : 'POST', body });
      toast(editing ? 'Listing updated' : 'Listing is live! Students and NGOs can request it now 🎉');
      nav(`/food/${r.listing.id}`);
    } catch (x) { setErr((x as Error).message); window.scrollTo({ top: 0, behavior: 'smooth' }); } finally { setBusy(false); }
  };

  if (loading) return <PageLoader />;
  const quick = (h: number) => set('deadline', toLocalInput(new Date(Date.now() + h * 3600_000)));

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
      <Link to="/dashboard" className="btn-ghost -ml-3 mb-4"><ArrowLeft className="h-4 w-4" />Dashboard</Link>
      <h1 className="text-3xl font-extrabold">{editing ? 'Edit listing' : 'List surplus food'}</h1>
      <p className="mt-1 text-slate-500">{editing ? 'Changes are visible to students and NGOs immediately.' : 'Share what\'s left over — it\'ll appear on Discover right away.'}</p>
      {err && <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{err}</p>}

      <form onSubmit={submit} className="mt-8 space-y-6">
        <div className="card p-5 sm:p-6">
          <span className="label">Photo</span>
          {f.imageUrl ? (
            <div className="relative overflow-hidden rounded-2xl">
              <Img src={f.imageUrl} category={f.category} alt="Food preview" className="aspect-[16/9] w-full object-cover" />
              <div className="absolute right-3 top-3 flex gap-2">
                <button type="button" className="btn bg-white/90 !py-2 text-slate-700 backdrop-blur" onClick={() => fileRef.current?.click()}>Replace</button>
                <button type="button" className="btn bg-white/90 !p-2 text-red-600 backdrop-blur" onClick={() => set('imageUrl', '')} aria-label="Remove photo"><Trash2 className="h-4 w-4" /></button>
              </div>
            </div>
          ) : (
            <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading}
              onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); const file = e.dataTransfer.files[0]; if (file) upload(file); }}
              className="flex aspect-[16/7] w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 text-slate-500 transition hover:border-brand-300 hover:bg-brand-50/40">
              {uploading ? <Spinner className="h-7 w-7" /> : <ImagePlus className="h-8 w-8 text-brand-600" />}
              <span className="text-sm font-semibold">{uploading ? 'Uploading…' : 'Click or drop a photo'}</span>
              <span className="text-xs">JPG, PNG or WEBP · up to 5 MB</span>
            </button>
          )}
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) upload(file); e.target.value = ''; }} />
          <button type="button" className="mt-2 flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-brand-700" onClick={() => setShowUrl((s) => !s)}><Link2 className="h-3 w-3" />Use an image URL instead</button>
          {showUrl && <input className="input mt-2" placeholder="https://…" value={f.imageUrl} onChange={(e) => set('imageUrl', e.target.value)} />}
        </div>

        <div className="card space-y-4 p-5 sm:p-6">
          <div><label className="label" htmlFor="title">What's the food?</label><input id="title" className="input" required minLength={3} maxLength={100} value={f.title} onChange={(e) => set('title', e.target.value)} placeholder="Veg Biryani with Raita" /></div>
          <div><label className="label" htmlFor="desc">Description</label><textarea id="desc" className="input" rows={3} required minLength={5} maxLength={1000} value={f.description} onChange={(e) => set('description', e.target.value)} placeholder="How it's packed, allergens, anything collectors should know" /></div>
          <div>
            <span className="label">Category</span>
            <div className="flex flex-wrap gap-2">
              {CATS.map((c) => <button type="button" key={c} onClick={() => set('category', c)} className={`chip !px-3 !py-2 text-sm transition ${f.category === c ? 'bg-brand-600 text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:ring-brand-300'}`}>{CATEGORY_EMOJI[c]} {CATEGORY_LABEL[c]}</button>)}
            </div>
          </div>
          <div>
            <span className="label">Dietary</span>
            <div className="flex gap-2">
              {(Object.keys(DIETARY) as Dietary[]).map((d) => <button type="button" key={d} onClick={() => set('dietary', d)} className={`chip !px-3 !py-2 text-sm transition ${f.dietary === d ? 'bg-brand-600 text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:ring-brand-300'}`}>{DIETARY[d].label}</button>)}
            </div>
          </div>
        </div>

        <div className="card grid gap-4 p-5 sm:grid-cols-3 sm:p-6">
          <div><label className="label" htmlFor="qty">Quantity</label><input id="qty" type="number" min={1} max={5000} required className="input" value={f.quantity} onChange={(e) => set('quantity', Number(e.target.value))} /></div>
          <div><label className="label" htmlFor="unit">Unit</label>
            <select id="unit" className="input" value={f.unit} onChange={(e) => { set('unit', e.target.value); set('kgPerUnit', KG_HINT[e.target.value] ?? f.kgPerUnit); }}>{UNITS.map((u) => <option key={u}>{u}</option>)}</select></div>
          <div><label className="label" htmlFor="kg">Kg per {f.unit === 'kg' ? 'kg' : f.unit.replace(/s$/, '')}</label><input id="kg" type="number" step="0.01" min={0.01} max={50} required className="input" value={f.kgPerUnit} onChange={(e) => set('kgPerUnit', Number(e.target.value))} /></div>
          <p className="text-xs text-slate-500 sm:col-span-3">≈ {(f.quantity * f.kgPerUnit).toFixed(1)} kg total · used to calculate food saved and CO₂ avoided.</p>
        </div>

        <div className="card grid gap-4 p-5 sm:grid-cols-2 sm:p-6">
          <div className="sm:col-span-2"><label className="label" htmlFor="loc">Pickup location</label><input id="loc" className="input" required minLength={3} value={f.pickupLocation} onChange={(e) => set('pickupLocation', e.target.value)} placeholder="Central Cafeteria, Gate 2 counter" /></div>
          <div><label className="label" htmlFor="prep">Prepared at</label><input id="prep" type="datetime-local" required className="input" value={f.preparedAt} max={toLocalInput(new Date())} onChange={(e) => set('preparedAt', e.target.value)} /></div>
          <div><label className="label" htmlFor="dl">Collect by (deadline)</label><input id="dl" type="datetime-local" required className="input" value={f.deadline} min={toLocalInput(new Date())} onChange={(e) => set('deadline', e.target.value)} />
            <div className="mt-2 flex gap-1.5">{[1, 2, 4, 8].map((h) => <button type="button" key={h} onClick={() => quick(h)} className="chip bg-slate-100 text-slate-600 hover:bg-brand-50 hover:text-brand-700">+{h}h</button>)}</div></div>
          <p className="text-xs text-slate-500 sm:col-span-2">Listings close automatically at the deadline; anyone who hasn't collected yet is notified.</p>
        </div>

        <div className="flex justify-end gap-3">
          <Link to="/dashboard" className="btn-ghost">Cancel</Link>
          <button className="btn-primary !px-6 !py-3" disabled={busy || uploading}>{busy && <Spinner className="h-4 w-4 !text-white" />}{editing ? 'Save changes' : 'Publish listing'}</button>
        </div>
      </form>
    </div>
  );
}
