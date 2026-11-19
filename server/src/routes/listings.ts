import { Router } from 'express';
import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { bad, forbidden, notFound } from '../lib/http.js';
import { notify } from '../lib/notify.js';
import { optionalAuth, requireAuth, requireRole } from '../middleware/auth.js';
import { maybeSweep } from '../lib/sweep.js';

const r = Router();
const CATEGORIES = ['MEALS', 'BAKERY', 'SNACKS', 'FRUITS_VEG', 'DAIRY', 'BEVERAGES', 'DESSERTS'] as const;
const providerSel = { select: { id: true, name: true, organization: true, campus: true } } as const;

const base = z.object({
  title: z.string().trim().min(3, 'Title is too short').max(100),
  description: z.string().trim().min(5, 'Add a short description').max(1000),
  category: z.enum(CATEGORIES),
  dietary: z.enum(['VEG', 'NON_VEG', 'VEGAN']).default('VEG'),
  imageUrl: z.string().trim().max(500).optional().nullable(),
  quantity: z.coerce.number().int().min(1, 'Quantity must be at least 1').max(5000),
  unit: z.string().trim().min(1).max(20).default('servings'),
  kgPerUnit: z.coerce.number().min(0.01).max(50).default(0.35),
  preparedAt: z.coerce.date(),
  pickupLocation: z.string().trim().min(3, 'Pickup location is required').max(200),
  deadline: z.coerce.date(),
});

r.get('/', optionalAuth, async (req, res) => {
  await maybeSweep();
  const q = z.object({
    q: z.string().optional(),
    category: z.enum(CATEGORIES).optional().or(z.literal('')),
    dietary: z.enum(['VEG', 'NON_VEG', 'VEGAN']).optional().or(z.literal('')),
    sort: z.enum(['deadline', 'newest', 'quantity']).default('deadline'),
    status: z.enum(['ACTIVE', 'COMPLETED', 'EXPIRED', 'CANCELLED', 'ALL']).default('ACTIVE'),
    mine: z.string().optional(),
    limit: z.coerce.number().int().min(1).max(100).default(60),
  }).parse(req.query);

  const where: Prisma.FoodListingWhereInput = {};
  if (q.status !== 'ALL') where.status = q.status;
  if (q.status === 'ACTIVE') where.remaining = { gt: 0 };
  if (q.category) where.category = q.category;
  if (q.dietary) where.dietary = q.dietary;
  if (q.mine === 'true') {
    if (!req.user) throw forbidden('Sign in to see your listings');
    where.providerId = req.user.id;
    delete where.remaining;
  }
  if (q.q?.trim()) {
    const s = q.q.trim();
    where.OR = [
      { title: { contains: s, mode: 'insensitive' } },
      { description: { contains: s, mode: 'insensitive' } },
      { pickupLocation: { contains: s, mode: 'insensitive' } },
      { provider: { organization: { contains: s, mode: 'insensitive' } } },
    ];
  }
  // `id` is a tie-breaker so listings with equal timestamps don't reshuffle between refreshes
  const orderBy: Prisma.FoodListingOrderByWithRelationInput[] = [
    q.sort === 'newest' ? { createdAt: 'desc' } : q.sort === 'quantity' ? { remaining: 'desc' } : { deadline: 'asc' },
    { id: 'asc' },
  ];

  const listings = await prisma.foodListing.findMany({
    where, orderBy, take: q.limit,
    include: { provider: providerSel, _count: { select: { requests: { where: { status: 'PENDING' } } } } },
  });
  res.json({ listings });
});

r.get('/:id', optionalAuth, async (req, res) => {
  await maybeSweep();
  const listing = await prisma.foodListing.findUnique({ where: { id: String(req.params.id) }, include: { provider: providerSel } });
  if (!listing) throw notFound('Listing');
  const isOwner = req.user?.id === listing.providerId;
  const requests = isOwner
    ? await prisma.foodRequest.findMany({ where: { listingId: listing.id }, orderBy: { createdAt: 'desc' },
        include: { requester: { select: { id: true, name: true, role: true, organization: true, campus: true } } } })
    : req.user
      ? await prisma.foodRequest.findMany({ where: { listingId: listing.id, requesterId: req.user.id }, orderBy: { createdAt: 'desc' } })
      : [];
  const stats = await prisma.foodRequest.aggregate({ where: { listingId: listing.id, status: 'COLLECTED' }, _sum: { quantity: true }, _count: true });
  res.json({ listing, requests, isOwner, collected: { servings: stats._sum.quantity ?? 0, pickups: stats._count } });
});

r.post('/', requireAuth, requireRole('PROVIDER'), async (req, res) => {
  const d = base.parse(req.body);
  if (d.deadline <= new Date()) throw bad('Collection deadline must be in the future');
  if (d.preparedAt > new Date(Date.now() + 5 * 60_000)) throw bad('Preparation time cannot be in the future');
  if (d.deadline <= d.preparedAt) throw bad('Deadline must be after preparation time');
  const listing = await prisma.foodListing.create({ data: { ...d, remaining: d.quantity, providerId: req.user!.id } });
  res.status(201).json({ listing });
});

r.patch('/:id', requireAuth, requireRole('PROVIDER'), async (req, res) => {
  const d = base.partial().parse(req.body);
  const existing = await prisma.foodListing.findUnique({ where: { id: String(req.params.id) } });
  if (!existing) throw notFound('Listing');
  if (existing.providerId !== req.user!.id) throw forbidden('You can only edit your own listings');
  if (existing.status !== 'ACTIVE') throw bad(`This listing is ${existing.status.toLowerCase()} and can no longer be edited`);
  const deadline = d.deadline ?? existing.deadline;
  if (deadline <= new Date()) throw bad('Collection deadline must be in the future');
  let remaining = existing.remaining;
  if (d.quantity !== undefined) {
    const claimed = existing.quantity - existing.remaining; // approved + collected
    if (d.quantity < claimed) throw bad(`${claimed} ${existing.unit} are already claimed — quantity can't go below that`);
    remaining = d.quantity - claimed;
  }
  const listing = await prisma.foodListing.update({ where: { id: existing.id }, data: { ...d, remaining } });
  res.json({ listing });
});

r.post('/:id/cancel', requireAuth, requireRole('PROVIDER'), async (req, res) => {
  const l = await prisma.foodListing.findUnique({ where: { id: String(req.params.id) } });
  if (!l) throw notFound('Listing');
  if (l.providerId !== req.user!.id) throw forbidden('You can only close your own listings');
  if (l.status !== 'ACTIVE') throw bad('Listing is already closed');
  await prisma.$transaction(async (tx) => {
    const open = await tx.foodRequest.findMany({ where: { listingId: l.id, status: { in: ['PENDING', 'APPROVED'] } } });
    await tx.foodRequest.updateMany({ where: { id: { in: open.map((o) => o.id) } }, data: { status: 'CANCELLED' } });
    await tx.foodListing.update({ where: { id: l.id }, data: { status: 'CANCELLED' } });
    for (const o of open) await notify(tx, o.requesterId, 'CANCELLED', 'Listing withdrawn', `The provider withdrew "${l.title}". Your request was cancelled.`, '/discover');
  });
  res.json({ ok: true });
});

export default r;
