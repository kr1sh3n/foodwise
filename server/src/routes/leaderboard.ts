import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { CO2_PER_KG } from '../lib/impact.js';

const r = Router();
r.get('/', async (req, res) => {
  const { period } = z.object({ period: z.enum(['all', 'month', 'week']).default('all') }).parse(req.query);
  const since = period === 'week' ? new Date(Date.now() - 7 * 86400000) : period === 'month' ? new Date(Date.now() - 30 * 86400000) : undefined;
  const rows = await prisma.foodRequest.findMany({
    where: { status: 'COLLECTED', ...(since ? { collectedAt: { gte: since } } : {}) },
    select: { quantity: true, listingId: true,
      requester: { select: { id: true, name: true, role: true, organization: true, campus: true } },
      listing: { select: { kgPerUnit: true, provider: { select: { id: true, name: true, organization: true, campus: true } } } } },
  });
  type Agg = { id: string; name: string; organization: string | null; campus: string | null; role?: string; meals: number; kg: number; pickups: number; listings: Set<string> };
  const prov = new Map<string, Agg>(), contrib = new Map<string, Agg>();
  for (const row of rows) {
    const kg = row.quantity * row.listing.kgPerUnit;
    const p = row.listing.provider;
    const a = prov.get(p.id) ?? { ...p, meals: 0, kg: 0, pickups: 0, listings: new Set() };
    a.meals += row.quantity; a.kg += kg; a.pickups++; a.listings.add(row.listingId); prov.set(p.id, a);
    const u = row.requester;
    const b = contrib.get(u.id) ?? { ...u, meals: 0, kg: 0, pickups: 0, listings: new Set() };
    b.meals += row.quantity; b.kg += kg; b.pickups++; contrib.set(u.id, b);
  }
  const fmt = (m: Map<string, Agg>) => [...m.values()].sort((a, b) => b.kg - a.kg).slice(0, 20).map(({ listings, ...a }, i) => ({
    ...a, rank: i + 1, kg: Math.round(a.kg * 10) / 10, co2: Math.round(a.kg * CO2_PER_KG * 10) / 10, listings: listings.size,
    points: Math.round(a.kg * 10 + a.pickups * 5),
  }));
  res.json({ providers: fmt(prov), contributors: fmt(contrib), period });
});
export default r;
