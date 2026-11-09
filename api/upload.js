import { verifyAuth, setCorsHeaders, parseJsonBody } from './_utils.js';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb'
    }
  }
};

export default async function handler(req, res) {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // 1. Verify admin authentication
  if (!verifyAuth(req)) {
    return res.status(401).json({ error: 'Unauthorized: Invalid or expired admin session' });
  }

  // 2. Parse request body
  const body = await parseJsonBody(req);
  if (!body || !body.base64) {
    return res.status(400).json({ error: 'No image data provided. Expected base64 string.' });
  }

  // Clean base64 data (strip data:image/...;base64, prefix if present)
  let base64Data = body.base64;
  let contentType = body.contentType || 'image/jpeg';
  if (base64Data.includes(',')) {
    const match = base64Data.match(/^data:([^;]+);base64,/);
    if (match) contentType = match[1];
    base64Data = base64Data.split(',')[1];
  }

  const buffer = Buffer.from(base64Data, 'base64');

  // Clean filename
  const originalName = body.filename || 'member.jpg';
  const ext = originalName.split('.').pop().toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
  const baseName = originalName.replace(/\.[^/.]+$/, '').toLowerCase().replace(/[^a-z0-9-_]/g, '-');
  const safePath = `members/${baseName || 'member'}.${ext}`;

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    // Local dev fallback: save to local img/members/ if running locally
    if (process.env.NODE_ENV !== 'production') {
      try {
        const fs = await import('node:fs/promises');
        const path = await import('node:path');
        const dir = path.join(process.cwd(), 'img', 'members');
        await fs.mkdir(dir, { recursive: true });
        const filePath = path.join(dir, `${baseName}.${ext}`);
        await fs.writeFile(filePath, buffer);
        return res.status(200).json({
          success: true,
          url: `img/members/${baseName}.${ext}`,
          pathname: `img/members/${baseName}.${ext}`
        });
      } catch (devErr) {
        return res.status(500).json({ error: 'Local file save failed: ' + devErr.message });
      }
    }

    return res.status(500).json({
      error: 'Vercel Blob is not configured. Please add BLOB_READ_WRITE_TOKEN to your environment variables.'
    });
  }

  try {
    const { put } = await import('@vercel/blob');

    const blob = await put(safePath, buffer, {
      access: 'public',
      contentType,
      addRandomSuffix: true
    });

    return res.status(200).json({
      success: true,
      url: blob.url,
      pathname: blob.pathname
    });
  } catch (err) {
    console.error('Upload to Vercel Blob failed:', err);
    return res.status(500).json({
      error: 'Failed to upload photo to Vercel Blob',
      details: err.message
    });
  }
}

