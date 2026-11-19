import { type ReactNode, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Loader2, X } from 'lucide-react';
import { categoryImage } from '../lib/format';

export const Spinner = ({ className = 'h-5 w-5' }: { className?: string }) => <Loader2 className={`animate-spin text-brand-600 ${className}`} />;
export const PageLoader = () => <div className="grid min-h-[40vh] place-items-center"><Spinner className="h-8 w-8" /></div>;

export function Badge({ cls, children }: { cls: string; children: ReactNode }) { return <span className={`chip ${cls}`}>{children}</span>; }

export function Empty({ icon, title, body, action }: { icon: ReactNode; title: string; body?: string; action?: ReactNode }) {
  return (
    <div className="card flex flex-col items-center px-6 py-12 text-center">
      <div className="mb-3 grid h-14 w-14 place-items-center rounded-2xl bg-brand-50 text-brand-600">{icon}</div>
      <h3 className="font-semibold">{title}</h3>
      {body && <p className="mt-1 max-w-sm text-sm text-slate-500">{body}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function ErrorBox({ msg, retry }: { msg: string; retry?: () => void }) {
  return <div className="card flex items-center justify-between gap-3 border-red-200 bg-red-50/60 px-4 py-3 text-sm text-red-700">{msg}{retry && <button className="btn-outline !py-1.5" onClick={retry}>Retry</button>}</div>;
}

export function Stat({ icon, label, value, sub, tone = 'brand' }: { icon: ReactNode; label: string; value: ReactNode; sub?: string; tone?: 'brand' | 'sky' | 'amber' | 'violet' | 'rose' }) {
  const tones = { brand: 'bg-brand-50 text-brand-600', sky: 'bg-sky-50 text-sky-600', amber: 'bg-amber-50 text-amber-600', violet: 'bg-violet-50 text-violet-600', rose: 'bg-rose-50 text-rose-600' };
  return (
    <div className="card p-4 sm:p-5">
      <div className={`mb-3 grid h-10 w-10 place-items-center rounded-xl ${tones[tone]}`}>{icon}</div>
      <div className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-[1.7rem]">{value}</div>
      <div className="text-sm font-medium text-slate-500">{label}</div>
      {sub && <div className="mt-1 text-xs text-slate-400">{sub}</div>}
    </div>
  );
}

export function Img({ src, alt, className, category }: { src: string | null | undefined; alt: string; className?: string; category?: string | null }) {
  const fallback = categoryImage(category);
  return <img src={src || fallback} alt={alt} loading="lazy" className={className} onError={(e) => { if (e.currentTarget.src !== fallback) e.currentTarget.src = fallback; }} />;
}

export function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k);
  }, [open, onClose]);
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 p-0 backdrop-blur-sm sm:items-center sm:p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
          <motion.div role="dialog" aria-modal aria-label={title} className="w-full max-w-md rounded-t-3xl bg-white p-6 shadow-2xl sm:rounded-3xl"
            initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }} transition={{ type: 'spring', damping: 26, stiffness: 320 }} onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between"><h3 className="text-lg font-bold">{title}</h3><button className="btn-ghost !p-2" onClick={onClose} aria-label="Close"><X className="h-4 w-4" /></button></div>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function Tabs<T extends string>({ value, onChange, items }: { value: T; onChange: (v: T) => void; items: { value: T; label: string; count?: number }[] }) {
  return (
    <div className="flex gap-1 overflow-x-auto rounded-xl bg-slate-100 p-1">
      {items.map((i) => (
        <button key={i.value} onClick={() => onChange(i.value)}
          className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold transition ${value === i.value ? 'bg-white text-brand-700 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>
          {i.label}{i.count !== undefined && <span className={`rounded-full px-1.5 text-xs ${value === i.value ? 'bg-brand-100 text-brand-700' : 'bg-slate-200 text-slate-600'}`}>{i.count}</span>}
        </button>
      ))}
    </div>
  );
}
