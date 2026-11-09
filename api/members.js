import { verifyAuth, setCorsHeaders, parseJsonBody } from './_utils.js';
import { validateFamily } from '../js/validate.js';

export default async function handler(req, res) {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST' && req.method !== 'PUT') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // 1. Verify admin session
  if (!verifyAuth(req)) {
    return res.status(401).json({ error: 'Unauthorized: Invalid or expired admin session' });
  }

  // 2. Parse request body
  const body = await parseJsonBody(req);
  if (!body) {
    return res.status(400).json({ error: 'Empty or invalid JSON body' });
  }

  // Support both direct { family, members } and { familyData: { family, members } }
  const familyData = body.familyData || (body.members && body.family ? body : null);

  if (!familyData || !Array.isArray(familyData.members)) {
    return res.status(400).json({ error: 'Invalid payload: must contain family metadata and members array' });
  }

  // 3. Strict domain validation (uses existing validateFamily engine)
  const validation = validateFamily(familyData);
  if (validation.errors.length > 0) {
    return res.status(400).json({
      error: 'Data validation failed. Please correct the highlighted issues.',
      details: validation.errors
    });
  }

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return res.status(500).json({
      error: 'Vercel Blob is not configured. Please add BLOB_READ_WRITE_TOKEN in your Vercel settings.'
    });
  }

  // 4. Save to Vercel Blob
  try {
    const { put } = await import('@vercel/blob');
    const jsonString = JSON.stringify(validation.value, null, 2);

    const blob = await put('family.json', jsonString, {
      access: 'public',
      contentType: 'application/json',
      addRandomSuffix: false
    });

    return res.status(200).json({
      success: true,
      message: 'Family data successfully updated and saved to Vercel Blob.',
      url: blob.url,
      membersCount: validation.value.members.length,
      warnings: validation.warnings
    });
  } catch (err) {
    console.error('Failed to write family.json to Vercel Blob:', err);
    return res.status(500).json({
      error: 'Failed to write data to Vercel Blob',
      details: err.message
    });
  }
}

