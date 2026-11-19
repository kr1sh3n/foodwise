import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { HttpError } from '../lib/http.js';
import { requireAuth, signToken } from '../middleware/auth.js';

const r = Router();
const publicUser = { id: true, name: true, email: true, role: true, organization: true, phone: true, campus: true, createdAt: true } as const;

const registerSchema = z.object({
  name: z.string().trim().min(2, 'Name is too short').max(80),
  email: z.string().trim().toLowerCase().email('Enter a valid email'),
  password: z.string().min(8, 'Password must be at least 8 characters').max(100),
  role: z.enum(['PROVIDER', 'STUDENT', 'NGO']),
  organization: z.string().trim().max(120).optional().or(z.literal('')),
  campus: z.string().trim().max(120).optional().or(z.literal('')),
  phone: z.string().trim().max(30).optional().or(z.literal('')),
});

r.post('/register', async (req, res) => {
  const d = registerSchema.parse(req.body);
  if ((d.role === 'PROVIDER' || d.role === 'NGO') && !d.organization)
    throw new HttpError(400, d.role === 'NGO' ? 'NGO name is required' : 'Cafeteria / restaurant name is required');
  if (await prisma.user.findUnique({ where: { email: d.email } })) throw new HttpError(409, 'An account with this email already exists');
  const { password, ...rest } = d;
  const user = await prisma.user.create({
    data: { ...rest, organization: d.organization || null, campus: d.campus || null, phone: d.phone || null, passwordHash: await bcrypt.hash(password, 10) },
    select: publicUser,
  });
  await prisma.notification.create({ data: { userId: user.id, type: 'WELCOME', title: 'Welcome to FoodWise 🌱',
    body: user.role === 'PROVIDER' ? 'List your first surplus batch so students and NGOs can rescue it.' : 'Browse available food near you and send your first request.',
    link: user.role === 'PROVIDER' ? '/listings/new' : '/discover' } });
  res.status(201).json({ token: signToken({ id: user.id, role: user.role, name: user.name }), user });
});

r.post('/login', async (req, res) => {
  const { email, password } = z.object({ email: z.string().trim().toLowerCase(), password: z.string() }).parse(req.body);
  const u = await prisma.user.findUnique({ where: { email } });
  if (!u || !(await bcrypt.compare(password, u.passwordHash))) throw new HttpError(401, 'Incorrect email or password');
  const { passwordHash: _ph, ...user } = u;
  res.json({ token: signToken({ id: u.id, role: u.role, name: u.name }), user });
});

r.get('/me', requireAuth, async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.user!.id }, select: publicUser });
  if (!user) throw new HttpError(401, 'Account no longer exists');
  res.json({ user });
});

r.patch('/me', requireAuth, async (req, res) => {
  const d = z.object({
    name: z.string().trim().min(2).max(80).optional(),
    organization: z.string().trim().max(120).optional(),
    campus: z.string().trim().max(120).optional(),
    phone: z.string().trim().max(30).optional(),
  }).parse(req.body);
  const user = await prisma.user.update({ where: { id: req.user!.id }, data: d, select: publicUser });
  res.json({ user });
});

export default r;
