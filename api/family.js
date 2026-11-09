import { promises as fs } from 'node:fs';
import path from 'node:path';
import { setCorsHeaders } from './_utils.js';

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
          const data = await blobRes.json();
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
    const data = JSON.parse(content);
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    return res.status(200).json(data);
  } catch (fsErr) {
    return res.status(500).json({ error: 'Failed to load family data', details: fsErr.message });
  }
}

