import 'dotenv/config';
import express, { type NextFunction, type Request, type Response } from 'express';
import cors from 'cors';
import { ZodError } from 'zod';
import multer from 'multer';
import { HttpError } from './lib/http.js';
import { UPLOAD_DIR, storageMode } from './lib/upload.js';
import { runExpirySweep } from './lib/expiry.js';
import auth from './routes/auth.js';
import listings from './routes/listings.js';
import requests from './routes/requests.js';
import notifications from './routes/notifications.js';
import impact from './routes/impact.js';
import leaderboard from './routes/leaderboard.js';
import uploads from './routes/uploads.js';

const app = express();
app.use(cors({ origin: process.env.CLIENT_ORIGIN?.split(',') ?? true }));
app.use(express.json({ limit: '1mb' }));
app.use('/uploads', express.static(UPLOAD_DIR, { maxAge: '7d' }));

app.get('/api/health', (_req, res) => res.json({ ok: true, storage: storageMode }));
app.use('/api/auth', auth);
app.use('/api/listings', listings);
app.use('/api/requests', requests);
app.use('/api/notifications', notifications);
app.use('/api/impact', impact);
app.use('/api/leaderboard', leaderboard);
app.use('/api/uploads', uploads);
app.use('/api', (_req, res) => res.status(404).json({ error: 'Not found' }));

app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof ZodError) return res.status(400).json({ error: err.issues[0]?.message ?? 'Invalid input', issues: err.issues });
  if (err instanceof HttpError) return res.status(err.status).json({ error: err.message });
  if (err instanceof multer.MulterError) return res.status(400).json({ error: err.code === 'LIMIT_FILE_SIZE' ? 'Image must be under 5 MB' : err.message });
  console.error(err);
  res.status(500).json({ error: 'Something went wrong on our side' });
});

const port = Number(process.env.PORT) || 4000;
app.listen(port, () => {
  console.log(`FoodWise API on http://localhost:${port} (image storage: ${storageMode})`);
  // Background job: expire overdue listings and send deadline reminders every minute
  const tick = () => runExpirySweep().then((r) => (r.expired || r.reminders) && console.log('sweep', r)).catch((e) => console.error('sweep failed', e));
  tick();
  setInterval(tick, 60_000);
});
