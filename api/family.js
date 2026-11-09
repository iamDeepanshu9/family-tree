import fs from 'node:fs';
import path from 'node:path';
import { setCorsHeaders } from './_utils.js';

/**
 * Validates whether a photo path or URL is valid.
 * - Cloud URLs (https://...) are preserved.
 * - Local relative paths (img/members/...) are checked against disk:
 *   if the file exists, it is kept; if missing, normalized to null.
 */
export function verifyPhotoExists(photo) {
  if (!photo || typeof photo !== 'string') return null;
  const trimmed = photo.trim();
  if (!trimmed || trimmed === 'null' || trimmed === 'undefined') return null;

  // Cloud URLs (Vercel Blob, CDN) are kept as-is
  if (trimmed.startsWith('https://') || trimmed.startsWith('http://')) {
    return trimmed;
  }

  // Local relative file paths: verify file exists on server filesystem
  try {
    const fullPath = path.join(process.cwd(), trimmed.replace(/^\//, ''));
    if (fs.existsSync(fullPath)) {
      return trimmed;
    }
  } catch {
    // If invalid path, fall through to null
  }

  return null;
}

function sanitizeFamilyData(data) {
  if (!data || !Array.isArray(data.members)) return data;
  data.members.forEach(m => {
    m.photo = verifyPhotoExists(m.photo);
    if (Array.isArray(m.spouses)) {
      m.spouses.forEach(s => {
        s.photo = verifyPhotoExists(s.photo);
      });
    }
  });
  return data;
}

export default async function handler(req, res) {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // 1. Try reading from Vercel Blob if configured
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    try {
      const { list } = await import('@vercel/blob');
      const { blobs } = await list({ prefix: 'family.json' });
      const targetBlob = blobs.find(b => b.pathname === 'family.json');

      if (targetBlob && targetBlob.url) {
        const blobRes = await fetch(targetBlob.url, { cache: 'no-store' });
        if (blobRes.ok) {
          const rawData = await blobRes.json();
          const data = sanitizeFamilyData(rawData);
          res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
          return res.status(200).json(data);
        }
      }
    } catch (blobErr) {
      console.warn('Could not read from Vercel Blob, falling back to local file:', blobErr.message);
    }
  }

  // 2. Fallback to local data/family.json
  try {
    const localPath = path.join(process.cwd(), 'data', 'family.json');
    const content = await fs.promises.readFile(localPath, 'utf8');
    const rawData = JSON.parse(content);
    const data = sanitizeFamilyData(rawData);
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    return res.status(200).json(data);
  } catch (fsErr) {
    return res.status(500).json({ error: 'Failed to load family data', details: fsErr.message });
  }
}

