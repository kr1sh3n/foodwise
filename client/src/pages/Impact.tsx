import { useState } from 'react';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Building2, Cloud, Leaf, PackageCheck, Scale, Soup, Users, Car, TreePine } from 'lucide-react';
import { useAuth } from '../lib/auth';
import { useApi } from '../lib/hooks';
import { CATEGORY_LABEL, num } from '../lib/format';
import type { Impact as ImpactT } from '../lib/types';
import { ErrorBox, PageLoader, Stat, Tabs } from '../components/ui';

const PIE = ['#0b9a45', '#16bd57', '#3dd679', '#7ceaa6', '#0f4e2b', '#105f32', '#b4f5cb'];
const tip = { contentStyle: { borderRadius: 12, border: '1px solid #e2e8f0', boxShadow: '0 8px 24px -8px rgba(0,0,0,.15)', fontSize: 13 } };

export default function Impact() {
  const { user } = useAuth();
  const [scope, setScope] = useState<'global' | 'me'>('global');
  const [weeks, setWeeks] = useState<'8' | '12'>('8');
  const { data, error, loading, reload } = useApi<ImpactT>(`/impact?scope=${scope}&weeks=${weeks}`);
  const t = data?.totals;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="flex items-center gap-1.5 text-sm font-semibold text-brand-600"><Leaf className="h-4 w-4" />Impact analytics</p>
          <h1 className="text-3xl font-extrabold sm:text-4xl">{scope === 'me' ? 'Your impact' : 'Campus-wide impact'}</h1>
          <p className="mt-1 text-slate-500">Every collection is tracked — here's what it adds up to.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {user && <Tabs value={scope} onChange={setScope} items={[{ value: 'global', label: 'Everyone' }, { value: 'me', label: 'Just me' }]} />}
          <Tabs value={weeks} onChange={setWeeks} items={[{ value: '8', label: '8 weeks' }, { value: '12', label: '12 weeks' }]} />
        </div>
      </div>

      {error && <div className="mt-6"><ErrorBox msg={error} retry={reload} /></div>}
      {loading && !data ? <PageLoader /> : t && data && (
        <>
          <div className="mt-8 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-5">
            <Stat icon={<Soup className="h-5 w-5" />} label="Meals rescued" value={num(t.meals)} />
            <Stat icon={<Scale className="h-5 w-5" />} label="Food saved" value={`${num(t.kg)} kg`} tone="sky" />
            <Stat icon={<Cloud className="h-5 w-5" />} label="CO₂e avoided" value={`${num(t.co2)} kg`} tone="violet" sub={`${data.co2PerKg} kg CO₂e per kg food`} />
            <Stat icon={<PackageCheck className="h-5 w-5" />} label="Successful pickups" value={num(t.collections)} tone="amber" />
            <Stat icon={scope === 'me' && user?.role !== 'PROVIDER' ? <Building2 className="h-5 w-5" /> : <Users className="h-5 w-5" />}
              label={scope === 'global' ? 'Participating vendors' : user?.role === 'PROVIDER' ? 'People fed' : 'Vendors supported'}
              value={num(scope === 'me' && user?.role === 'PROVIDER' ? t.recipients : t.vendors)} tone="rose" />
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-3">
            <div className="card p-5 lg:col-span-2">
              <h2 className="font-bold">Meals rescued per week</h2>
              <p className="text-sm text-slate-500">Servings collected from surplus listings</p>
              <div className="mt-4 h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data.weekly} margin={{ left: -16, right: 8, top: 8 }}>
                    <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#16bd57" stopOpacity={.35} /><stop offset="100%" stopColor="#16bd57" stopOpacity={0} /></linearGradient></defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#eef2f0" vertical={false} />
                    <XAxis dataKey="week" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip {...tip} formatter={(v) => [`${v} meals`, 'Rescued']} labelFormatter={(l) => `Week of ${l}`} />
                    <Area type="monotone" dataKey="meals" stroke="#0b9a45" strokeWidth={2.5} fill="url(#g)" animationDuration={900} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="card p-5">
              <h2 className="font-bold">By category</h2>
              <p className="text-sm text-slate-500">Share of kilograms saved</p>
              {data.byCategory.length === 0 ? <p className="py-20 text-center text-sm text-slate-400">No collections yet</p> : (
                <>
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={data.byCategory} dataKey="kg" nameKey="category" innerRadius={50} outerRadius={80} paddingAngle={2} stroke="none">
                          {data.byCategory.map((_, i) => <Cell key={i} fill={PIE[i % PIE.length]} />)}
                        </Pie>
                        <Tooltip {...tip} formatter={(v, n) => [`${v} kg`, CATEGORY_LABEL[n as keyof typeof CATEGORY_LABEL]]} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <ul className="mt-2 space-y-1.5 text-sm">
                    {data.byCategory.map((c, i) => (
                      <li key={c.category} className="flex items-center justify-between"><span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full" style={{ background: PIE[i % PIE.length] }} />{CATEGORY_LABEL[c.category]}</span><span className="font-semibold">{num(c.kg)} kg</span></li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-3">
            <div className="card p-5 lg:col-span-2">
              <h2 className="font-bold">Food saved & emissions avoided</h2>
              <p className="text-sm text-slate-500">Kilograms per week</p>
              <div className="mt-4 h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.weekly} margin={{ left: -16, right: 8, top: 8 }} barGap={4}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#eef2f0" vertical={false} />
                    <XAxis dataKey="week" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <Tooltip {...tip} cursor={{ fill: '#f1f5f9' }} formatter={(v, n) => [`${v} kg`, n === 'kg' ? 'Food saved' : 'CO₂e avoided']} />
                    <Bar dataKey="kg" fill="#16bd57" radius={[6, 6, 0, 0]} animationDuration={900} />
                    <Bar dataKey="co2" fill="#105f32" radius={[6, 6, 0, 0]} animationDuration={900} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-2 flex gap-4 text-xs text-slate-500"><span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded bg-brand-500" />Food saved (kg)</span><span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded bg-brand-800" />CO₂e avoided (kg)</span></div>
            </div>
            <div className="card flex flex-col gap-4 bg-gradient-to-br from-brand-700 to-brand-950 p-6 text-white">
              <h2 className="font-bold !text-white">That's equivalent to…</h2>
              <div className="flex items-center gap-3"><Car className="h-8 w-8 text-brand-300" /><div><div className="text-2xl font-extrabold">{num(Math.round(t.co2 / 0.17))} km</div><div className="text-sm text-brand-100">not driven in a petrol car</div></div></div>
              <div className="flex items-center gap-3"><TreePine className="h-8 w-8 text-brand-300" /><div><div className="text-2xl font-extrabold">{num(Math.round(t.co2 / 21))} trees</div><div className="text-sm text-brand-100">absorbing CO₂ for a year</div></div></div>
              <div className="flex items-center gap-3"><PackageCheck className="h-8 w-8 text-brand-300" /><div><div className="text-2xl font-extrabold">{t.rescueRate}%</div><div className="text-sm text-brand-100">of listings rescued before expiry</div></div></div>
              <p className="mt-auto text-xs text-brand-200">Estimates: {data.co2PerKg} kg CO₂e per kg of food waste avoided, 0.17 kg CO₂/km, ~21 kg CO₂ per tree per year.</p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
