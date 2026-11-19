import { prisma } from './prisma.js';
import { notify } from './notify.js';

/** Expire listings past their deadline, close their open requests, and send pickup reminders. */
export async function runExpirySweep() {
  const now = new Date();
  const overdue = await prisma.foodListing.findMany({
    where: { status: 'ACTIVE', deadline: { lt: now } },
    include: { requests: { where: { status: { in: ['PENDING', 'APPROVED'] } } } },
  });
  for (const l of overdue) {
    await prisma.$transaction(async (tx) => {
      const collectedAny = await tx.foodRequest.count({ where: { listingId: l.id, status: 'COLLECTED' } });
      await tx.foodListing.update({
        where: { id: l.id },
        data: { status: collectedAny && l.remaining === 0 ? 'COMPLETED' : 'EXPIRED' },
      });
      for (const r of l.requests) {
        await tx.foodRequest.update({ where: { id: r.id }, data: { status: 'EXPIRED' } });
        await notify(tx, r.requesterId, 'EXPIRED', 'Pickup window closed',
          `"${l.title}" passed its collection deadline before pickup, so your request has expired.`, `/food/${l.id}`);
      }
      await notify(tx, l.providerId, 'LISTING_EXPIRED', 'Listing expired',
        `"${l.title}" reached its collection deadline and was closed automatically.`, `/food/${l.id}`);
    });
  }

  // Reminders: approved pickups whose deadline is within 60 minutes
  const soon = new Date(now.getTime() + 60 * 60 * 1000);
  const due = await prisma.foodRequest.findMany({
    where: { status: 'APPROVED', reminderSent: false, listing: { status: 'ACTIVE', deadline: { gt: now, lte: soon } } },
    include: { listing: true },
  });
  for (const r of due) {
    const mins = Math.max(1, Math.round((r.listing.deadline.getTime() - now.getTime()) / 60000));
    await prisma.$transaction([
      prisma.foodRequest.update({ where: { id: r.id }, data: { reminderSent: true } }),
      prisma.notification.create({ data: {
        userId: r.requesterId, type: 'DEADLINE', title: 'Pickup deadline approaching',
        body: `Collect ${r.quantity} ${r.listing.unit} of "${r.listing.title}" from ${r.listing.pickupLocation} within ${mins} min. Code: ${r.pickupCode}`,
        link: `/food/${r.listingId}`,
      } }),
    ]);
  }
  return { expired: overdue.length, reminders: due.length };
}
