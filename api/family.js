import fs from 'node:fs';
import path from 'node:path';
import { setCorsHeaders } from './_utils.js';

/**
 * Known committed local member portraits deployed on Vercel CDN.
 * In Vercel Serverless Functions, static files in img/ are served from CDN edge
 * rather than mounted to process.cwd(), so we explicitly whitelist committed assets.
 */
export const COMMITTED_LOCAL_PHOTOS = new Set([
  'img/members/g1-01.png',
  'img/members/g2-01.png',
  'img/members/g2-01-s1.jpeg',
  'img/members/g3-01.png',
  'img/members/portrait.svg'
]);

/**
 * Validates whether a photo path or URL is valid.
 * - Cloud URLs (https://...) are preserved.
 * - Committed static portraits in img/members/ are preserved.
 * - Local relative paths checked against disk (dev server fallback).
 * - Non-existent ghost paths are normalized to null.
 */
export function verifyPhotoExists(photo) {
  if (!photo || typeof photo !== 'string') return null;
  const trimmed = photo.trim();
  if (!trimmed || trimmed === 'null' || trimmed === 'undefined') return null;

  // Cloud URLs (Vercel Blob, CDN) are kept as-is
  if (trimmed.startsWith('https://') || trimmed.startsWith('http://')) {
    return trimmed;
  }

  const normalized = trimmed.replace(/^\//, '');

  // 1. Committed repository portraits (always present on Vercel CDN)
  if (COMMITTED_LOCAL_PHOTOS.has(normalized)) {
    return normalized;
  }

  // 2. Local relative file paths: verify file exists on server filesystem (local dev / bundled)
  try {
    const fullPath = path.join(process.cwd(), normalized);
    if (fs.existsSync(fullPath)) {
      return normalized;
    }
  } catch {
    // If invalid path, fall through to null
  }

  return null;
}

export function sanitizeFamilyData(data) {
  if (!data || !Array.isArray(data.members)) return data;
  data.members.forEach(m => {
    // Strip private / runtime properties like _index before serving
    for (const key of Object.keys(m)) {
      if (key.startsWith('_')) delete m[key];
    }

    // Default root patriarch photo if missing or previously stripped
    if (m.id === 'G1-01' && (!m.photo || m.photo === 'null')) {
      m.photo = 'img/members/g1-01.png';
    }

    m.photo = verifyPhotoExists(m.photo);
    if (Array.isArray(m.spouses)) {
      m.spouses.forEach(s => {
        for (const key of Object.keys(s)) {
          if (key.startsWith('_')) delete s[key];
        }
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

