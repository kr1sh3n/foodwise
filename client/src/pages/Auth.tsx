import { useState, type FormEvent, type ReactNode } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Building2, GraduationCap, HandHeart, Leaf } from 'lucide-react';
import { afterAuth, useAuth } from '../lib/auth';
import { useToast } from '../components/Toast';
import { Spinner } from '../components/ui';
import type { Role } from '../lib/types';

function Shell({ title, sub, children }: { title: string; sub: string; children: ReactNode }) {
  return (
    <div className="mx-auto grid max-w-6xl gap-10 px-4 py-10 sm:px-6 lg:grid-cols-2 lg:py-16">
      <div className="relative hidden min-h-[560px] overflow-hidden rounded-3xl lg:block">
        <img src="https://images.unsplash.com/photo-1498837167922-ddd27525d352?w=1200&q=75&auto=format&fit=crop" alt="Fresh food spread" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-brand-950/90 via-brand-900/40 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-10 text-white">
          <Leaf className="mb-4 h-8 w-8 text-brand-300" />
          <p className="text-2xl font-bold leading-snug">"Our mess used to throw out 30 plates a night. Now the hostel next door eats them."</p>
          <p className="mt-3 text-sm text-brand-100">— Anita Sharma, Hostel 7 Mess</p>
        </div>
      </div>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mx-auto w-full max-w-md self-center">
        <h1 className="text-3xl font-extrabold">{title}</h1>
        <p className="mt-2 text-slate-500">{sub}</p>
        <div className="mt-8">{children}</div>
      </motion.div>
    </div>
  );
}

const DEMOS = [
  { label: 'Provider', email: 'cafeteria@foodwise.demo', icon: Building2 },
  { label: 'Student', email: 'student@foodwise.demo', icon: GraduationCap },
  { label: 'NGO', email: 'ngo@foodwise.demo', icon: HandHeart },
];

export function Login() {
  const { login } = useAuth();
  const toast = useToast();
  const nav = useNavigate();
  const [sp] = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const go = async (e?: string, p?: string) => {
    setBusy(true); setErr('');
    afterAuth.path = sp.get('next') || '/dashboard';
    try {
      const u = await login(e ?? email, p ?? password);
      toast(`Welcome back, ${u.name.split(' ')[0]}!`);
      nav(sp.get('next') || '/dashboard', { replace: true });
    } catch (x) { setErr((x as Error).message); } finally { setBusy(false); }
  };
  const submit = (e: FormEvent) => { e.preventDefault(); go(); };
  return (
    <Shell title="Welcome back" sub="Sign in to rescue, share and track surplus food.">
      <form onSubmit={submit} className="space-y-4">
        <div><label className="label" htmlFor="email">Email</label><input id="email" className="input" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@college.edu" /></div>
        <div><label className="label" htmlFor="pw">Password</label><input id="pw" className="input" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" /></div>
        {err && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{err}</p>}
        <button className="btn-primary w-full !py-3" disabled={busy}>{busy && <Spinner className="h-4 w-4 !text-white" />}Sign in</button>
      </form>
      <div className="mt-8 rounded-2xl border border-dashed border-brand-200 bg-brand-50/50 p-4">
        <p className="text-sm font-semibold text-brand-800">Try a demo account</p>
        <p className="mb-3 text-xs text-brand-700/80">Seeded sample accounts — password <code className="font-mono">password123</code></p>
        <div className="grid grid-cols-3 gap-2">
          {DEMOS.map((d) => (
            <button key={d.email} type="button" disabled={busy} onClick={() => { setEmail(d.email); setPassword('password123'); go(d.email, 'password123'); }} className="btn-outline flex-col !gap-1 !py-3 text-xs">
              <d.icon className="h-5 w-5 text-brand-600" />{d.label}
            </button>
          ))}
        </div>
      </div>
      <p className="mt-6 text-center text-sm text-slate-500">New to FoodWise? <Link to="/register" className="font-semibold text-brand-700 hover:underline">Create an account</Link></p>
    </Shell>
  );
}

const ROLES: { role: Role; title: string; desc: string; icon: typeof Building2 }[] = [
  { role: 'STUDENT', title: 'Student', desc: 'Grab free surplus meals on campus', icon: GraduationCap },
  { role: 'PROVIDER', title: 'Food Provider', desc: 'Cafeteria, hostel mess or restaurant', icon: Building2 },
  { role: 'NGO', title: 'NGO', desc: 'Collect in bulk for communities', icon: HandHeart },
];

export function Register() {
  const { register } = useAuth();
  const toast = useToast();
  const nav = useNavigate();
  const [sp] = useSearchParams();
  const initial = (sp.get('role')?.toUpperCase() ?? 'STUDENT') as Role;
  const [f, setF] = useState({ name: '', email: '', password: '', role: (ROLES.some((r) => r.role === initial) ? initial : 'STUDENT') as Role, organization: '', campus: '' });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });
  const submit = async (e: FormEvent) => {
    e.preventDefault(); setBusy(true); setErr('');
    afterAuth.path = f.role === 'PROVIDER' ? '/listings/new' : '/discover';
    try { const u = await register(f); toast(`Welcome to FoodWise, ${u.name.split(' ')[0]}! 🌱`); nav(u.role === 'PROVIDER' ? '/listings/new' : '/discover', { replace: true }); }
    catch (x) { setErr((x as Error).message); } finally { setBusy(false); }
  };
  const orgLabel = f.role === 'PROVIDER' ? 'Cafeteria / restaurant name' : f.role === 'NGO' ? 'NGO name' : null;
  return (
    <Shell title="Join FoodWise" sub="Create an account in under a minute.">
      <form onSubmit={submit} className="space-y-4">
        <div>
          <span className="label">I am a…</span>
          <div className="grid grid-cols-3 gap-2">
            {ROLES.map((r) => (
              <button type="button" key={r.role} onClick={() => setF({ ...f, role: r.role })} aria-pressed={f.role === r.role} aria-label={`${r.title} – ${r.desc}`}
                className={`rounded-2xl border-2 p-3 text-left transition ${f.role === r.role ? 'border-brand-500 bg-brand-50' : 'border-slate-200 bg-white hover:border-brand-200'}`}>
                <r.icon className={`h-5 w-5 ${f.role === r.role ? 'text-brand-600' : 'text-slate-400'}`} />
                <div className="mt-2 text-sm font-bold">{r.title}</div>
                <div className="hidden text-xs text-slate-500 sm:block">{r.desc}</div>
              </button>
            ))}
          </div>
        </div>
        <div><label className="label" htmlFor="name">Full name</label><input id="name" className="input" required minLength={2} value={f.name} onChange={set('name')} placeholder="Priya Patel" /></div>
        {orgLabel && <div><label className="label" htmlFor="org">{orgLabel}</label><input id="org" className="input" required value={f.organization} onChange={set('organization')} placeholder={f.role === 'NGO' ? 'Annapurna Food Bank' : 'Central Cafeteria'} /></div>}
        <div><label className="label" htmlFor="campus">{f.role === 'NGO' ? 'Service area' : 'Campus / area'} <span className="font-normal text-slate-400">(optional)</span></label><input id="campus" className="input" value={f.campus} onChange={set('campus')} placeholder="North Campus" /></div>
        <div><label className="label" htmlFor="remail">Email</label><input id="remail" className="input" type="email" autoComplete="email" required value={f.email} onChange={set('email')} placeholder="you@college.edu" /></div>
        <div><label className="label" htmlFor="rpw">Password</label><input id="rpw" className="input" type="password" autoComplete="new-password" required minLength={8} value={f.password} onChange={set('password')} placeholder="At least 8 characters" /></div>
        {err && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{err}</p>}
        <button className="btn-primary w-full !py-3" disabled={busy}>{busy && <Spinner className="h-4 w-4 !text-white" />}Create account</button>
      </form>
      <p className="mt-6 text-center text-sm text-slate-500">Already have an account? <Link to="/login" className="font-semibold text-brand-700 hover:underline">Sign in</Link></p>
    </Shell>
  );
}
