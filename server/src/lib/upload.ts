import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { bad } from './http.js';

export const UPLOAD_DIR = path.resolve('uploads');
mkdirSync(UPLOAD_DIR, { recursive: true });

const useCloudinary = !!(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET);
if (useCloudinary) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
}
export const storageMode = useCloudinary ? 'cloudinary' : 'local';

export const uploader = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (/^image\/(jpeg|png|webp|gif|avif)$/.test(file.mimetype)) cb(null, true);
    else cb(bad('Only JPG, PNG, WEBP, GIF or AVIF images are allowed'));
  },
});

export async function storeImage(file: Express.Multer.File): Promise<string> {
  if (useCloudinary) {
    return new Promise((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        { folder: 'foodwise', transformation: [{ width: 1200, height: 900, crop: 'limit', quality: 'auto' }] },
        (err, res) => (err || !res ? reject(err ?? new Error('Upload failed')) : resolve(res.secure_url)),
      ).end(file.buffer);
    });
  }
  const ext = file.mimetype.split('/')[1].replace('jpeg', 'jpg');
  const name = `${crypto.randomUUID()}.${ext}`;
  writeFileSync(path.join(UPLOAD_DIR, name), file.buffer);
  return `/uploads/${name}`;
}
