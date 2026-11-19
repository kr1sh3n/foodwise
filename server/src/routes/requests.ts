import { Router } from 'express';
import { z } from 'zod';
import crypto from 'node:crypto';
import { prisma } from '../lib/prisma.js';
import { bad, forbidden, notFound, HttpError } from '../lib/http.js';
import { notify } from '../lib/notify.js';
import { REQUEST_LIMIT } from '../lib/impact.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { maybeSweep } from '../lib/sweep.js';

const r = Router();
r.use(requireAuth);

const listingSel = { select: { id: true, title: true, imageUrl: true, category: true, unit: true, pickupLocation: true, deadline: true, status: true, remaining: true, kgPerUnit: true, providerId: true,
  provider: { select: { name: true, organization: true } } } } as const;
const requesterSel = { select: { id: true, name: true, role: true, organization: true, campus: true } } as const;

r.post('/', requireRole('STUDENT', 'NGO'), async (req, res) => {
  await maybeSweep();
  const d = z.object({
    listingId: z.string(),
    quantity: z.coerce.number().int().min(1, 'Request at least 1'),
    message: z.string().trim().max(300).optional(),
  }).parse(req.body);
  const limit = REQUEST_LIMIT[req.user!.role];
  if (d.quantity > limit) throw bad(`Student accounts can request up to ${limit} servings at a time`);

  const created = await prisma.$transaction(async (tx) => {
    const l = await tx.foodListing.findUnique({ where: { id: d.listingId } });
    if (!l) throw notFound('Listing');
    if (l.status !== 'ACTIVE' || l.deadline <= new Date()) throw bad('This listing is no longer available');
    if (d.quantity > l.remaining) throw bad(`Only ${l.remaining} ${l.unit} left`);
    const open = await tx.foodRequest.findFirst({ where: { listingId: l.id, requesterId: req.user!.id, status: { in: ['PENDING', 'APPROVED'] } } });
    if (open) throw new HttpError(409, 'You already have an open request for this listing');
    const fr = await tx.foodRequest.create({
      data: { listingId: l.id, requesterId: req.user!.id, quantity: d.quantity, message: d.message || null, pickupCode: String(crypto.randomInt(1000, 10000)) },
    });
    await notify(tx, l.providerId, 'NEW_REQUEST', 'New food request',
      `${req.user!.name} requested ${d.quantity} ${l.unit} of "${l.title}".`, '/dashboard');
    return fr;
  });
  res.status(201).json({ request: created });
});

r.get('/mine', async (req, res) => {
  await maybeSweep();
  const requests = await prisma.foodRequest.findMany({ where: { requesterId: req.user!.id }, orderBy: { createdAt: 'desc' }, include: { listing: listingSel } });
  res.json({ requests });
});

r.get('/incoming', requireRole('PROVIDER'), async (req, res) => {
  await maybeSweep();
  const status = z.enum(['PENDING', 'APPROVED', 'REJECTED', 'COLLECTED', 'CANCELLED', 'EXPIRED']).optional().parse(req.query.status || undefined);
  const requests = await prisma.foodRequest.findMany({
    where: { listing: { providerId: req.user!.id }, ...(status ? { status } : {}) },
    orderBy: [{ createdAt: 'desc' }], include: { listing: listingSel, requester: requesterSel }, take: 200,
  });
  res.json({ requests });
});

async function loadOwned(id: string, providerId: string) {
  const fr = await prisma.foodRequest.findUnique({ where: { id }, include: { listing: true } });
  if (!fr) throw notFound('Request');
  if (fr.listing.providerId !== providerId) throw forbidden('This request is for another provider\'s listing');
  return fr;
}

r.post('/:id/approve', requireRole('PROVIDER'), async (req, res) => {
  const fr = await loadOwned(String(req.params.id), req.user!.id);
  if (fr.status !== 'PENDING') throw bad(`Request is already ${fr.status.toLowerCase()}`);
  if (fr.listing.status !== 'ACTIVE') throw bad('Listing is no longer active');
  await prisma.$transaction(async (tx) => {
    // Atomic reservation: only succeeds if enough is left
    const dec = await tx.foodListing.updateMany({ where: { id: fr.listingId, remaining: { gte: fr.quantity } }, data: { remaining: { decrement: fr.quantity } } });
    if (dec.count === 0) throw bad('Not enough quantity left to approve this request');
    await tx.foodRequest.update({ where: { id: fr.id }, data: { status: 'APPROVED', decidedAt: new Date() } });
    await notify(tx, fr.requesterId, 'APPROVED', 'Request approved 🎉',
      `Pick up ${fr.quantity} ${fr.listing.unit} of "${fr.listing.title}" at ${fr.listing.pickupLocation} before ${fr.listing.deadline.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' })}. Your pickup code is ${fr.pickupCode}.`,
      `/food/${fr.listingId}`);
    // If fully claimed, close out pending requests that can no longer be served
    const l = await tx.foodListing.findUniqueOrThrow({ where: { id: fr.listingId } });
    const stale = await tx.foodRequest.findMany({ where: { listingId: l.id, status: 'PENDING', quantity: { gt: l.remaining } } });
    for (const s of stale) {
      await tx.foodRequest.update({ where: { id: s.id }, data: { status: 'REJECTED', decidedAt: new Date() } });
      await notify(tx, s.requesterId, 'REJECTED', 'Not enough food left',
        l.remaining === 0 ? `"${l.title}" has been fully claimed.` : `Only ${l.remaining} ${l.unit} of "${l.title}" remain — try a smaller request.`, `/food/${l.id}`);
    }
  });
  res.json({ ok: true });
});

r.post('/:id/reject', requireRole('PROVIDER'), async (req, res) => {
  const { reason } = z.object({ reason: z.string().trim().max(200).optional() }).parse(req.body ?? {});
  const fr = await loadOwned(String(req.params.id), req.user!.id);
  if (!['PENDING', 'APPROVED'].includes(fr.status)) throw bad(`Request is already ${fr.status.toLowerCase()}`);
  await prisma.$transaction(async (tx) => {
    if (fr.status === 'APPROVED') await tx.foodListing.update({ where: { id: fr.listingId }, data: { remaining: { increment: fr.quantity } } });
    await tx.foodRequest.update({ where: { id: fr.id }, data: { status: 'REJECTED', decidedAt: new Date() } });
    await notify(tx, fr.requesterId, 'REJECTED', 'Request declined',
      `Your request for "${fr.listing.title}" was declined${reason ? `: ${reason}` : '.'}`, `/food/${fr.listingId}`);
  });
  res.json({ ok: true });
});

r.post('/:id/collect', requireRole('PROVIDER'), async (req, res) => {
  const { code } = z.object({ code: z.string().trim().optional() }).parse(req.body ?? {});
  const fr = await loadOwned(String(req.params.id), req.user!.id);
  if (fr.status !== 'APPROVED') throw bad('Only approved requests can be marked as collected');
  if (code && code !== fr.pickupCode) throw bad('Pickup code does not match');
  await prisma.$transaction(async (tx) => {
    await tx.foodRequest.update({ where: { id: fr.id }, data: { status: 'COLLECTED', collectedAt: new Date() } });
    const l = await tx.foodListing.findUniqueOrThrow({ where: { id: fr.listingId } });
    const outstanding = await tx.foodRequest.count({ where: { listingId: l.id, status: 'APPROVED' } });
    if (l.remaining === 0 && outstanding === 0 && l.status === 'ACTIVE')
      await tx.foodListing.update({ where: { id: l.id }, data: { status: 'COMPLETED' } });
    const kg = (fr.quantity * l.kgPerUnit).toFixed(1);
    await notify(tx, fr.requesterId, 'COLLECTED', 'Pickup confirmed ✅',
      `You rescued ${fr.quantity} ${l.unit} (~${kg} kg) of "${l.title}". Thank you for fighting food waste!`, '/impact');
  });
  res.json({ ok: true });
});

r.post('/:id/cancel', async (req, res) => {
  const fr = await prisma.foodRequest.findUnique({ where: { id: String(req.params.id) }, include: { listing: true } });
  if (!fr) throw notFound('Request');
  if (fr.requesterId !== req.user!.id) throw forbidden('You can only cancel your own requests');
  if (!['PENDING', 'APPROVED'].includes(fr.status)) throw bad(`Request is already ${fr.status.toLowerCase()}`);
  await prisma.$transaction(async (tx) => {
    if (fr.status === 'APPROVED') await tx.foodListing.update({ where: { id: fr.listingId }, data: { remaining: { increment: fr.quantity } } });
    await tx.foodRequest.update({ where: { id: fr.id }, data: { status: 'CANCELLED' } });
    await notify(tx, fr.listing.providerId, 'CANCELLED', 'Request cancelled',
      `${req.user!.name} cancelled their request for "${fr.listing.title}"${fr.status === 'APPROVED' ? ` — ${fr.quantity} ${fr.listing.unit} returned to stock` : ''}.`, '/dashboard');
  });
  res.json({ ok: true });
});

export default r;
