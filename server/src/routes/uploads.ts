import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { uploader, storeImage } from '../lib/upload.js';
import { bad } from '../lib/http.js';

const r = Router();
r.post('/', requireAuth, requireRole('PROVIDER'), uploader.single('image'), async (req, res) => {
  if (!req.file) throw bad('Choose an image to upload');
  res.status(201).json({ url: await storeImage(req.file) });
});
export default r;
