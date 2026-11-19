import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Clock, MapPin } from 'lucide-react';
import type { Listing } from '../lib/types';
import { CATEGORY_EMOJI, CATEGORY_LABEL, DIETARY, LISTING_STATUS, timeLeft } from '../lib/format';
import { Badge, Img } from './ui';

export default function FoodCard({ l, now, i = 0 }: { l: Listing; now: number; i?: number }) {
  const t = timeLeft(l.deadline, now);
  const pct = Math.round((l.remaining / l.quantity) * 100);
  return (
    <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i, 8) * 0.04 }}>
      <Link to={`/food/${l.id}`} className="card group block overflow-hidden transition hover:-translate-y-1 hover:shadow-xl hover:shadow-brand-900/5">
        <div className="relative aspect-[4/3] overflow-hidden">
          <Img src={l.imageUrl} category={l.category} alt={l.title} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
          <div className="absolute inset-x-0 top-0 flex justify-between p-3">
            <Badge cls="bg-white/90 text-slate-700 backdrop-blur">{CATEGORY_EMOJI[l.category]} {CATEGORY_LABEL[l.category]}</Badge>
            {l.status === 'ACTIVE'
              ? <Badge cls={`backdrop-blur ${t.urgent ? 'bg-red-500/90 text-white' : 'bg-white/90 text-slate-700'}`}><Clock className="h-3 w-3" />{t.text}</Badge>
              : <Badge cls={LISTING_STATUS[l.status].cls}>{LISTING_STATUS[l.status].label}</Badge>}
          </div>
        </div>
        <div className="p-4">
          <div className="flex items-start justify-between gap-2">
            <h3 className="line-clamp-1 font-bold">{l.title}</h3>
            <Badge cls={DIETARY[l.dietary].cls}>{DIETARY[l.dietary].label}</Badge>
          </div>
          <p className="mt-0.5 line-clamp-1 text-sm text-slate-500">{l.provider?.organization ?? l.provider?.name}</p>
          <p className="mt-2 flex items-center gap-1 text-xs text-slate-500"><MapPin className="h-3.5 w-3.5 shrink-0 text-brand-600" /><span className="line-clamp-1">{l.pickupLocation}</span></p>
          <div className="mt-3">
            <div className="mb-1 flex justify-between text-xs font-semibold"><span className="text-brand-700">{l.remaining} {l.unit} left</span><span className="text-slate-400">of {l.quantity}</span></div>
            <div className="h-1.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-gradient-to-r from-brand-500 to-brand-400" style={{ width: `${pct}%` }} /></div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
