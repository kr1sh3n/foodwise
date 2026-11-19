import { useNavigate } from 'react-router-dom';
import { Bell, CheckCheck, CheckCircle2, Clock, Inbox, PackageCheck, XCircle, Sparkles, Ban } from 'lucide-react';
import { useApi } from '../lib/hooks';
import { api } from '../lib/api';
import { ago } from '../lib/format';
import type { Notification } from '../lib/types';
import { Empty, ErrorBox, PageLoader } from '../components/ui';

const ICON: Record<string, { i: typeof Bell; c: string }> = {
  APPROVED: { i: CheckCircle2, c: 'bg-sky-50 text-sky-600' }, REJECTED: { i: XCircle, c: 'bg-rose-50 text-rose-600' },
  COLLECTED: { i: PackageCheck, c: 'bg-brand-50 text-brand-600' }, DEADLINE: { i: Clock, c: 'bg-amber-50 text-amber-600' },
  EXPIRED: { i: Clock, c: 'bg-slate-100 text-slate-500' }, LISTING_EXPIRED: { i: Clock, c: 'bg-slate-100 text-slate-500' },
  NEW_REQUEST: { i: Inbox, c: 'bg-violet-50 text-violet-600' }, CANCELLED: { i: Ban, c: 'bg-slate-100 text-slate-500' },
  WELCOME: { i: Sparkles, c: 'bg-brand-50 text-brand-600' },
};

export default function Notifications() {
  const nav = useNavigate();
  const { data, error, loading, reload } = useApi<{ notifications: Notification[]; unread: number }>('/notifications', 20_000);
  const open = async (n: Notification) => {
    if (!n.read) await api(`/notifications/${n.id}/read`, { method: 'POST' }).catch(() => {});
    if (n.link) nav(n.link); else reload(true);
  };
  const readAll = async () => { await api('/notifications/read-all', { method: 'POST' }); reload(true); };
  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
      <div className="flex items-end justify-between gap-4">
        <div><h1 className="text-3xl font-extrabold">Notifications</h1><p className="mt-1 text-slate-500">{data ? `${data.unread} unread` : ' '}</p></div>
        {!!data?.unread && <button className="btn-outline" onClick={readAll}><CheckCheck className="h-4 w-4" />Mark all read</button>}
      </div>
      <div className="mt-6">
        {error && <ErrorBox msg={error} retry={reload} />}
        {loading && !data ? <PageLoader /> : data && (data.notifications.length === 0
          ? <Empty icon={<Bell className="h-6 w-6" />} title="No notifications yet" body="Approvals, pickups and deadline reminders will show up here." />
          : <div className="card divide-y divide-slate-100 overflow-hidden">
            {data.notifications.map((n) => { const s = ICON[n.type] ?? { i: Bell, c: 'bg-slate-100 text-slate-500' }; return (
              <button key={n.id} onClick={() => open(n)} className={`flex w-full gap-4 p-4 text-left transition hover:bg-slate-50 ${n.read ? '' : 'bg-brand-50/40'}`}>
                <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${s.c}`}><s.i className="h-5 w-5" /></div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2"><span className="font-semibold">{n.title}</span><span className="shrink-0 text-xs text-slate-400">{ago(n.createdAt)}</span></div>
                  <p className="mt-0.5 text-sm text-slate-600">{n.body}</p>
                </div>
                {!n.read && <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-brand-500" />}
              </button>); })}
          </div>)}
      </div>
    </div>
  );
}
