import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Bell, Leaf, LogOut, Menu, Plus, X, CheckCheck } from 'lucide-react';
import { useAuth } from '../lib/auth';
import { useApi } from '../lib/hooks';
import { api } from '../lib/api';
import { ago, ROLE_LABEL } from '../lib/format';
import type { Notification } from '../lib/types';

export function Logo({ light = false }: { light?: boolean }) {
  return (
    <Link to="/" className="flex items-center gap-2 font-extrabold tracking-tight">
      <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-md shadow-brand-600/30"><Leaf className="h-5 w-5" /></span>
      <span className={`text-lg ${light ? 'text-white' : 'text-slate-900'}`}>Food<span className="text-brand-600">Wise</span></span>
    </Link>
  );
}

function NotificationBell() {
  const { data, reload } = useApi<{ notifications: Notification[]; unread: number }>('/notifications', 20_000);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const nav = useNavigate();
  const loc = useLocation();
  useEffect(() => { setOpen(false); reload(true); }, [loc.pathname, reload]);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', h); return () => document.removeEventListener('mousedown', h);
  }, []);
  const openItem = async (n: Notification) => {
    if (!n.read) await api(`/notifications/${n.id}/read`, { method: 'POST' }).catch(() => {});
    reload(true); setOpen(false);
    if (n.link) nav(n.link);
  };
  const readAll = async () => { await api('/notifications/read-all', { method: 'POST' }); reload(true); };
  const unread = data?.unread ?? 0;
  return (
    <div className="relative" ref={ref}>
      <button className="btn-ghost relative !p-2.5" onClick={() => setOpen((o) => !o)} aria-label={`Notifications (${unread} unread)`}>
        <Bell className="h-5 w-5" />
        {unread > 0 && <span className="absolute right-1 top-1 grid h-4 min-w-4 place-items-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">{unread > 9 ? '9+' : unread}</span>}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, y: -6, scale: .98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -6 }}
            className="card fixed inset-x-3 top-16 z-50 overflow-hidden sm:absolute sm:inset-x-auto sm:right-0 sm:top-12 sm:w-96">
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
              <span className="font-bold">Notifications</span>
              {unread > 0 && <button onClick={readAll} className="flex items-center gap-1 text-xs font-semibold text-brand-700 hover:underline"><CheckCheck className="h-3.5 w-3.5" />Mark all read</button>}
            </div>
            <div className="max-h-96 overflow-y-auto">
              {!data?.notifications.length && <p className="px-4 py-8 text-center text-sm text-slate-500">You're all caught up.</p>}
              {data?.notifications.slice(0, 8).map((n) => (
                <button key={n.id} onClick={() => openItem(n)} className={`flex w-full gap-3 border-b border-slate-50 px-4 py-3 text-left transition hover:bg-slate-50 ${n.read ? '' : 'bg-brand-50/50'}`}>
                  <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${n.read ? 'bg-transparent' : 'bg-brand-500'}`} />
                  <span className="min-w-0"><span className="block text-sm font-semibold">{n.title}</span><span className="block text-xs text-slate-500">{n.body}</span><span className="mt-1 block text-[11px] text-slate-400">{ago(n.createdAt)}</span></span>
                </button>
              ))}
            </div>
            <Link to="/notifications" className="block py-2.5 text-center text-sm font-semibold text-brand-700 hover:bg-slate-50">View all</Link>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function Layout() {
  const { user, logout } = useAuth();
  const [menu, setMenu] = useState(false);
  const loc = useLocation();
  const nav = useNavigate();
  useEffect(() => { setMenu(false); window.scrollTo(0, 0); }, [loc.pathname]);
  const links = [
    { to: '/discover', label: 'Discover' },
    ...(user ? [{ to: '/dashboard', label: 'Dashboard' }] : []),
    { to: '/impact', label: 'Impact' },
    { to: '/leaderboard', label: 'Leaderboard' },
  ];
  const linkCls = ({ isActive }: { isActive: boolean }) => `rounded-lg px-3 py-2 text-sm font-semibold transition ${isActive ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:text-slate-900'}`;
  const doLogout = () => { logout(); nav('/'); };
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b border-slate-200/60 bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6">
          <Logo />
          <nav className="ml-6 hidden items-center gap-1 md:flex">{links.map((l) => <NavLink key={l.to} to={l.to} className={linkCls}>{l.label}</NavLink>)}</nav>
          <div className="ml-auto flex items-center gap-1.5">
            {user ? (
              <>
                {user.role === 'PROVIDER' && <Link to="/listings/new" className="btn-primary hidden sm:inline-flex"><Plus className="h-4 w-4" />List food</Link>}
                <NotificationBell />
                <div className="hidden items-center gap-2 pl-2 lg:flex">
                  <div className="grid h-9 w-9 place-items-center rounded-full bg-brand-100 text-sm font-bold text-brand-700">{user.name[0]}</div>
                  <div className="leading-tight"><div className="text-sm font-semibold">{user.name}</div><div className="text-xs text-slate-500">{ROLE_LABEL[user.role]}</div></div>
                </div>
                <button className="btn-ghost hidden !p-2.5 md:inline-flex" onClick={doLogout} title="Sign out" aria-label="Sign out"><LogOut className="h-4 w-4" /></button>
              </>
            ) : (
              <div className="hidden gap-2 sm:flex"><Link to="/login" className="btn-ghost">Sign in</Link><Link to="/register" className="btn-primary">Join FoodWise</Link></div>
            )}
            <button className="btn-ghost !p-2.5 md:hidden" onClick={() => setMenu((m) => !m)} aria-label="Menu">{menu ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}</button>
          </div>
        </div>
        <AnimatePresence>
          {menu && (
            <motion.nav initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden border-t border-slate-100 md:hidden">
              <div className="flex flex-col gap-1 p-3">
                {links.map((l) => <NavLink key={l.to} to={l.to} className={linkCls}>{l.label}</NavLink>)}
                {user?.role === 'PROVIDER' && <Link to="/listings/new" className="btn-primary mt-2"><Plus className="h-4 w-4" />List surplus food</Link>}
                {user ? <button className="btn-outline mt-1" onClick={doLogout}><LogOut className="h-4 w-4" />Sign out ({user.name})</button>
                  : <div className="mt-2 grid grid-cols-2 gap-2"><Link to="/login" className="btn-outline">Sign in</Link><Link to="/register" className="btn-primary">Join</Link></div>}
              </div>
            </motion.nav>
          )}
        </AnimatePresence>
      </header>
      <main className="flex-1"><Outlet /></main>
      <footer className="border-t border-slate-200/70 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-4 py-8 text-sm text-slate-500 sm:flex-row sm:px-6">
          <Logo />
          <p>Rescuing surplus campus food, one plate at a time. 🌱</p>
          <div className="flex gap-4"><Link to="/discover" className="hover:text-brand-700">Discover</Link><Link to="/impact" className="hover:text-brand-700">Impact</Link><Link to="/leaderboard" className="hover:text-brand-700">Leaderboard</Link></div>
        </div>
      </footer>
    </div>
  );
}
