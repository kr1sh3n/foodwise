import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Building2, Clock, Cloud, GraduationCap, HandHeart, Scale, Soup, Store, Upload, Search, PackageCheck } from 'lucide-react';
import { useApi, useNow } from '../lib/hooks';
import { useAuth } from '../lib/auth';
import { num } from '../lib/format';
import type { Impact, Listing } from '../lib/types';
import FoodCard from '../components/FoodCard';

const u = (id: string, w = 800) => `https://images.unsplash.com/photo-${id}?w=${w}&q=75&auto=format&fit=crop`;
const fade = { initial: { opacity: 0, y: 20 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true, margin: '-60px' }, transition: { duration: .5 } };

export default function Landing() {
  const { user } = useAuth();
  const { data: impact } = useApi<Impact>('/impact');
  const { data: feed } = useApi<{ listings: Listing[] }>('/listings?sort=deadline&limit=6');
  const now = useNow();
  const t = impact?.totals;

  return (
    <div className="overflow-x-hidden">
      <section className="relative">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(60%_60%_at_80%_10%,var(--color-brand-100),transparent),radial-gradient(40%_50%_at_0%_100%,var(--color-brand-50),transparent)]" />
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 pb-16 pt-10 sm:px-6 lg:grid-cols-2 lg:pb-24 lg:pt-16">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .6 }}>
            <span className="chip bg-brand-100 text-brand-800"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-brand-500" />{t ? `${t.activeListings} batches available right now` : 'Live on campus'}</span>
            <h1 className="mt-5 text-4xl font-extrabold leading-[1.05] sm:text-5xl lg:text-6xl">
              Stop wasting food<br />in <span className="bg-gradient-to-r from-brand-600 to-emerald-400 bg-clip-text text-transparent">college.</span>
            </h1>
            <p className="mt-5 max-w-lg text-lg text-slate-600">FoodWise connects cafeterias, hostel messes and restaurants with students and NGOs — so tonight's surplus becomes someone's dinner, not landfill.</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/discover" className="btn-primary !px-6 !py-3.5 text-base">Find free food <ArrowRight className="h-4 w-4" /></Link>
              {user?.role === 'PROVIDER'
                ? <Link to="/listings/new" className="btn-outline !px-6 !py-3.5 text-base">List surplus food</Link>
                : !user && <Link to="/register?role=provider" className="btn-outline !px-6 !py-3.5 text-base">I have surplus food</Link>}
            </div>
            <div className="mt-10 flex gap-8">
              {[[t ? num(t.meals) : '—', 'meals rescued'], [t ? `${num(t.kg)} kg` : '—', 'food saved'], [t ? `${num(t.co2)} kg` : '—', 'CO₂e avoided']].map(([v, l]) => (
                <div key={l}><div className="text-2xl font-extrabold text-slate-900">{v}</div><div className="text-sm text-slate-500">{l}</div></div>
              ))}
            </div>
          </motion.div>
          <motion.div initial={{ opacity: 0, scale: .96 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: .7, delay: .1 }} className="relative">
            <div className="grid grid-cols-5 grid-rows-6 gap-3 sm:gap-4" style={{ height: 'min(520px, 90vw)' }}>
              <img src={u('1589302168068-964664d93dc0')} alt="Biryani" className="col-span-3 row-span-4 h-full w-full rounded-3xl object-cover shadow-xl" />
              <img src={u('1512621776951-a57141f2eefd', 500)} alt="Buddha bowl" className="col-span-2 row-span-3 h-full w-full rounded-3xl object-cover shadow-xl" />
              <img src={u('1509440159596-0249088772ff', 500)} alt="Bread" className="col-span-2 row-span-3 h-full w-full rounded-3xl object-cover shadow-xl" />
              <img src={u('1601050690597-df0568f70950', 500)} alt="Samosas" className="col-span-3 row-span-2 h-full w-full rounded-3xl object-cover shadow-xl" />
            </div>
            <motion.div animate={{ y: [0, -8, 0] }} transition={{ repeat: Infinity, duration: 4 }} className="card absolute -left-2 bottom-10 flex items-center gap-3 p-3 pr-5 sm:-left-8">
              <div className="grid h-11 w-11 place-items-center rounded-xl bg-brand-500 text-white"><PackageCheck className="h-5 w-5" /></div>
              <div><div className="text-sm font-bold">Pickup confirmed</div><div className="text-xs text-slate-500">20 servings → Annapurna Food Bank</div></div>
            </motion.div>
            <motion.div animate={{ y: [0, 8, 0] }} transition={{ repeat: Infinity, duration: 5 }} className="card absolute -right-2 top-6 hidden items-center gap-2 p-3 sm:flex">
              <Clock className="h-4 w-4 text-red-500" /><span className="text-sm font-semibold">45m left · Chicken Biryani</span>
            </motion.div>
          </motion.div>
        </div>
      </section>

      <section className="bg-white py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <motion.div {...fade} className="mx-auto max-w-2xl text-center">
            <p className="font-semibold text-brand-600">How it works</p>
            <h2 className="mt-2 text-3xl font-extrabold sm:text-4xl">From kitchen to plate in three steps</h2>
          </motion.div>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {[
              { icon: Upload, t: 'List surplus', d: 'Providers snap a photo, add quantity, pickup spot and a collection deadline. Takes 30 seconds.' },
              { icon: Search, t: 'Request & approve', d: 'Students and NGOs browse nearby food and request it. Providers approve with one tap — stock updates instantly.' },
              { icon: PackageCheck, t: 'Collect & track', d: 'Show your pickup code, collect, and watch meals rescued, kilograms saved and CO₂ avoided add up.' },
            ].map((s, i) => (
              <motion.div key={s.t} {...fade} transition={{ delay: i * .1, duration: .5 }} className="card relative p-7">
                <span className="absolute right-6 top-5 text-5xl font-extrabold text-brand-100">0{i + 1}</span>
                <div className="grid h-12 w-12 place-items-center rounded-2xl bg-brand-600 text-white shadow-lg shadow-brand-600/30"><s.icon className="h-6 w-6" /></div>
                <h3 className="mt-5 text-lg font-bold">{s.t}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{s.d}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <motion.div {...fade} className="flex flex-wrap items-end justify-between gap-4">
            <div><p className="font-semibold text-brand-600">Available now</p><h2 className="mt-2 text-3xl font-extrabold sm:text-4xl">Ending soon near you</h2></div>
            <Link to="/discover" className="btn-outline">See all food <ArrowRight className="h-4 w-4" /></Link>
          </motion.div>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {feed?.listings.map((l, i) => <FoodCard key={l.id} l={l} now={now} i={i} />)}
            {!feed && Array.from({ length: 3 }).map((_, i) => <div key={i} className="card h-80 animate-pulse bg-slate-100" />)}
          </div>
        </div>
      </section>

      <section className="bg-white py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <motion.h2 {...fade} className="text-center text-3xl font-extrabold sm:text-4xl">Built for everyone on campus</motion.h2>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {[
              { icon: Store, role: 'provider', t: 'Food providers', cta: 'Join as a provider', d: 'Cafeterias, hostel messes, cafés and restaurants list surplus, approve requests and verify pickups with a code.', img: u('1414235077428-338989a2e8c0', 600) },
              { icon: GraduationCap, role: 'student', t: 'Students', cta: 'Join as a student', d: 'Find free, fresh meals between classes. Request up to 3 servings at a time and track your personal impact.', img: u('1528735602780-2552fd46c7af', 600) },
              { icon: HandHeart, role: 'ngo', t: 'NGOs', cta: 'Join as an NGO', d: 'Claim bulk quantities for shelters and community kitchens, with deadline reminders so nothing spoils.', img: u('1488459716781-31db52582fe9', 600) },
            ].map((r, i) => (
              <motion.div key={r.t} {...fade} transition={{ delay: i * .1, duration: .5 }} className="card group overflow-hidden">
                <div className="h-44 overflow-hidden"><img src={r.img} alt="" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" /></div>
                <div className="p-6">
                  <r.icon className="h-6 w-6 text-brand-600" />
                  <h3 className="mt-3 text-lg font-bold">{r.t}</h3>
                  <p className="mt-2 text-sm text-slate-600">{r.d}</p>
                  {!user && <Link to={`/register?role=${r.role}`} className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-brand-700 transition-all hover:gap-2">{r.cta} <ArrowRight className="h-4 w-4" /></Link>}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <motion.div {...fade} className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-brand-700 via-brand-800 to-brand-950 px-6 py-14 text-white sm:px-12">
            <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-brand-500/30 blur-3xl" />
            <h2 className="relative max-w-xl text-3xl font-extrabold !text-white sm:text-4xl">Every plate counts. Here's ours so far.</h2>
            <div className="relative mt-10 grid grid-cols-2 gap-6 lg:grid-cols-5">
              {[
                { i: Soup, v: t ? num(t.meals) : '—', l: 'Meals rescued' },
                { i: Scale, v: t ? `${num(t.kg)} kg` : '—', l: 'Food saved' },
                { i: Cloud, v: t ? `${num(t.co2)} kg` : '—', l: 'CO₂e avoided' },
                { i: PackageCheck, v: t ? num(t.collections) : '—', l: 'Successful pickups' },
                { i: Building2, v: t ? num(t.vendors) : '—', l: 'Partner vendors' },
              ].map((s) => (
                <div key={s.l}><s.i className="h-6 w-6 text-brand-300" /><div className="mt-3 text-3xl font-extrabold">{s.v}</div><div className="text-sm text-brand-100">{s.l}</div></div>
              ))}
            </div>
            <div className="relative mt-10 flex flex-wrap gap-3">
              <Link to="/impact" className="btn bg-white text-brand-800 hover:bg-brand-50">Explore impact analytics</Link>
              <Link to="/leaderboard" className="btn border border-white/30 text-white hover:bg-white/10">See the leaderboard</Link>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
