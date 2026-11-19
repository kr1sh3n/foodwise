import { useState } from 'react';
import { motion } from 'framer-motion';
import { Building2, Crown, GraduationCap, HandHeart, Medal, Trophy } from 'lucide-react';
import { useApi } from '../lib/hooks';
import { useAuth } from '../lib/auth';
import { num } from '../lib/format';
import type { LeaderRow } from '../lib/types';
import { Empty, ErrorBox, PageLoader, Tabs } from '../components/ui';

const MEDAL = ['from-amber-300 to-amber-500', 'from-slate-200 to-slate-400', 'from-orange-300 to-orange-500'];

function Board({ rows, kind, meId }: { rows: LeaderRow[]; kind: 'providers' | 'contributors'; meId?: string }) {
  if (!rows.length) return <Empty icon={<Trophy className="h-6 w-6" />} title="No collections in this period" body="Rankings appear once food gets collected." />;
  const top = rows.slice(0, 3);
  const order = top.length === 3 ? [top[1], top[0], top[2]] : top;
  return (
    <>
      <div className="grid grid-cols-3 items-end gap-2 sm:gap-4">
        {order.map((r) => {
          const h = r.rank === 1 ? 'pt-10' : r.rank === 2 ? 'pt-6' : 'pt-3';
          return (
            <motion.div key={r.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: r.rank * .08 }} className={`card relative flex flex-col items-center px-2 pb-5 text-center sm:px-4 ${h} ${r.id === meId ? 'ring-2 ring-brand-400' : ''}`}>
              {r.rank === 1 && <Crown className="absolute -top-4 h-8 w-8 text-amber-400" />}
              <div className={`grid h-14 w-14 place-items-center rounded-full bg-gradient-to-br text-xl font-extrabold text-white shadow-lg sm:h-16 sm:w-16 ${MEDAL[r.rank - 1]}`}>{(r.organization ?? r.name)[0]}</div>
              <div className="mt-3 line-clamp-2 text-sm font-bold sm:text-base">{kind === 'providers' ? r.organization ?? r.name : r.role === 'NGO' ? r.organization ?? r.name : r.name}</div>
              <div className="text-xs text-slate-500">#{r.rank}</div>
              <div className="mt-2 text-lg font-extrabold text-brand-700 sm:text-2xl">{num(r.kg)} kg</div>
              <div className="text-xs text-slate-500">{num(r.meals)} meals</div>
            </motion.div>
          );
        })}
      </div>
      <div className="card mt-6 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-400">
            <tr><th className="px-4 py-3">Rank</th><th className="px-4 py-3">{kind === 'providers' ? 'Provider' : 'Contributor'}</th><th className="px-4 py-3 text-right">Meals</th><th className="px-4 py-3 text-right">Food saved</th><th className="hidden px-4 py-3 text-right sm:table-cell">CO₂e</th><th className="hidden px-4 py-3 text-right sm:table-cell">{kind === 'providers' ? 'Listings' : 'Pickups'}</th><th className="px-4 py-3 text-right">Points</th></tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const Icon = kind === 'providers' ? Building2 : r.role === 'NGO' ? HandHeart : GraduationCap;
              return (
                <tr key={r.id} className={`border-b border-slate-50 last:border-0 ${r.id === meId ? 'bg-brand-50/60' : 'hover:bg-slate-50'}`}>
                  <td className="px-4 py-3 font-bold">{r.rank <= 3 ? <Medal className={`h-5 w-5 ${['text-amber-500', 'text-slate-400', 'text-orange-500'][r.rank - 1]}`} /> : r.rank}</td>
                  <td className="px-4 py-3"><div className="flex items-center gap-2"><Icon className="h-4 w-4 shrink-0 text-slate-400" /><div><div className="font-semibold">{kind === 'providers' || r.role === 'NGO' ? r.organization ?? r.name : r.name}{r.id === meId && <span className="ml-1.5 text-xs text-brand-700">(you)</span>}</div><div className="text-xs text-slate-500">{kind === 'providers' ? r.name : r.role === 'NGO' ? 'NGO' : r.campus ?? 'Student'}</div></div></div></td>
                  <td className="px-4 py-3 text-right">{num(r.meals)}</td>
                  <td className="px-4 py-3 text-right font-semibold">{num(r.kg)} kg</td>
                  <td className="hidden px-4 py-3 text-right sm:table-cell">{num(r.co2)} kg</td>
                  <td className="hidden px-4 py-3 text-right sm:table-cell">{kind === 'providers' ? r.listings : r.pickups}</td>
                  <td className="px-4 py-3 text-right font-bold text-brand-700">{num(r.points)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}

export default function Leaderboard() {
  const { user } = useAuth();
  const [period, setPeriod] = useState<'all' | 'month' | 'week'>('month');
  const [kind, setKind] = useState<'providers' | 'contributors'>('providers');
  const { data, error, loading, reload } = useApi<{ providers: LeaderRow[]; contributors: LeaderRow[] }>(`/leaderboard?period=${period}`);
  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
      <p className="flex items-center gap-1.5 text-sm font-semibold text-brand-600"><Trophy className="h-4 w-4" />Leaderboard</p>
      <h1 className="text-3xl font-extrabold sm:text-4xl">Food-waste heroes</h1>
      <p className="mt-1 text-slate-500">Ranked by kilograms of food rescued. Points = 10 per kg + 5 per pickup.</p>
      <div className="mt-6 flex flex-wrap justify-between gap-3">
        <Tabs value={kind} onChange={setKind} items={[{ value: 'providers', label: 'Top providers' }, { value: 'contributors', label: 'Top rescuers' }]} />
        <Tabs value={period} onChange={setPeriod} items={[{ value: 'week', label: 'This week' }, { value: 'month', label: '30 days' }, { value: 'all', label: 'All time' }]} />
      </div>
      <div className="mt-10">
        {error && <ErrorBox msg={error} retry={reload} />}
        {loading && !data ? <PageLoader /> : data && <Board rows={data[kind]} kind={kind} meId={user?.id} />}
      </div>
    </div>
  );
}
