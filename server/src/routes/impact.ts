import { Router } from 'express';
import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { CO2_PER_KG } from '../lib/impact.js';
import { optionalAuth } from '../middleware/auth.js';
import { forbidden } from '../lib/http.js';

const r = Router();
const round = (n: number, d = 1) => Math.round(n * 10 ** d) / 10 ** d;

function weekStart(d: Date) {
  const x = new Date(d); x.setHours(0, 0, 0, 0);
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); // Monday
  return x;
}

r.get('/', optionalAuth, async (req, res) => {
  const { scope, weeks } = z.object({ scope: z.enum(['global', 'me']).default('global'), weeks: z.coerce.number().int().min(4).max(26).default(8) }).parse(req.query);
  const where: Prisma.FoodRequestWhereInput = { status: 'COLLECTED' };
  if (scope === 'me') {
    if (!req.user) throw forbidden('Sign in to see your impact');
    if (req.user.role === 'PROVIDER') where.listing = { providerId: req.user.id };
    else where.requesterId = req.user.id;
  }
  const collected = await prisma.foodRequest.findMany({
    where, select: { quantity: true, collectedAt: true, requesterId: true, listing: { select: { kgPerUnit: true, category: true, providerId: true } } },
  });

  let meals = 0, kg = 0;
  const vendors = new Set<string>(), recipients = new Set<string>();
  const cat = new Map<string, { meals: number; kg: number }>();
  const start = weekStart(new Date(Date.now() - (weeks - 1) * 7 * 86400000));
  const buckets = Array.from({ length: weeks }, (_, i) => ({ start: new Date(start.getTime() + i * 7 * 86400000), meals: 0, kg: 0 }));
  for (const c of collected) {
    const k = c.quantity * c.listing.kgPerUnit;
    meals += c.quantity; kg += k;
    vendors.add(c.listing.providerId); recipients.add(c.requesterId);
    const e = cat.get(c.listing.category) ?? { meals: 0, kg: 0 };
    e.meals += c.quantity; e.kg += k; cat.set(c.listing.category, e);
    if (c.collectedAt && c.collectedAt >= start) {
      const idx = Math.floor((c.collectedAt.getTime() - start.getTime()) / (7 * 86400000));
      if (buckets[idx]) { buckets[idx].meals += c.quantity; buckets[idx].kg += k; }
    }
  }
  const listingWhere: Prisma.FoodListingWhereInput = scope === 'me' && req.user?.role === 'PROVIDER' ? { providerId: req.user.id } : {};
  const [activeListings, totalListings, expiredListings, providerCount] = await Promise.all([
    prisma.foodListing.count({ where: { ...listingWhere, status: 'ACTIVE' } }),
    prisma.foodListing.count({ where: listingWhere }),
    prisma.foodListing.count({ where: { ...listingWhere, status: 'EXPIRED' } }),
    prisma.user.count({ where: { role: 'PROVIDER', listings: { some: {} } } }),
  ]);

  res.json({
    totals: {
      meals, kg: round(kg), co2: round(kg * CO2_PER_KG), collections: collected.length,
      vendors: scope === 'global' ? providerCount : vendors.size, recipients: recipients.size,
      activeListings, totalListings, expiredListings,
      rescueRate: totalListings ? Math.round(((totalListings - expiredListings) / totalListings) * 100) : 0,
    },
    weekly: buckets.map((b) => ({
      week: b.start.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
      meals: b.meals, kg: round(b.kg), co2: round(b.kg * CO2_PER_KG),
    })),
    byCategory: [...cat.entries()].map(([category, v]) => ({ category, meals: v.meals, kg: round(v.kg) })).sort((a, b) => b.kg - a.kg),
    co2PerKg: CO2_PER_KG,
  });
});

export default r;
