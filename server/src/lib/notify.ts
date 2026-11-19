import type { Prisma } from '@prisma/client';
import { prisma } from './prisma.js';

type Tx = Prisma.TransactionClient | typeof prisma;
export function notify(db: Tx, userId: string, type: string, title: string, body: string, link?: string) {
  return db.notification.create({ data: { userId, type, title, body, link } });
}
