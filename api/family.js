import { promises as fs } from 'node:fs';
import path from 'node:path';
import { setCorsHeaders } from './_utils.js';

function sanitizeFamilyData(data) {
  if (!data || !Array.isArray(data.members)) return data;
  data.members.forEach(m => {
    // Clear any reference to the non-existent g5-01.jpg
    if (m.photo && (m.photo.includes('g5-01.jpg') || m.photo.includes('g5-01.png'))) {
      m.photo = null;
    }
    (m.spouses || []).forEach(s => {
      if (s.photo && (s.photo.includes('g5-01.jpg') || s.photo.includes('g5-01.png'))) {
        s.photo = null;
      }
    });
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
    const content = await fs.readFile(localPath, 'utf8');
    const rawData = JSON.parse(content);
    const data = sanitizeFamilyData(rawData);
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    return res.status(200).json(data);
  } catch (fsErr) {
    return res.status(500).json({ error: 'Failed to load family data', details: fsErr.message });
  }
}

