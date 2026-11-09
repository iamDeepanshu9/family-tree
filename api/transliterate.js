import { setCorsHeaders } from './_utils.js';

// Common family tree honorific dictionary for fast normalization & offline fallback
const DICT = {
  'swargiya': 'स्वर्गीय',
  'late': 'स्वर्गीय',
  'shri': 'श्री',
  'shree': 'श्री',
  'sh.': 'श्री',
  'shrimati': 'श्रीमती',
  'smt': 'श्रीमती',
  'smt.': 'श्रीमती',
  'devi': 'देवी',
  'singh': 'सिंह',
  'kumar': 'कुमार',
  'kumari': 'कुमारी',
  'ram': 'राम',
  'prasad': 'प्रसाद',
  'lal': 'लाल',
  'chand': 'चंद',
  'ji': 'जी'
};

export default async function handler(req, res) {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const parsedUrl = new URL(req.url, 'http://localhost');
  let text = parsedUrl.searchParams.get('text') || '';

  if (!text.trim()) {
    return res.status(200).json({ success: true, hindi: '' });
  }

  // Pre-normalize common prefixes
  let normalized = text
    .replace(/\bLate\b/gi, 'Swargiya')
    .replace(/\bSmt\.?\b/gi, 'Shrimati')
    .replace(/\bSh\.?\b/gi, 'Shri');

  try {
    const googleUrl = `https://inputtools.google.com/request?text=${encodeURIComponent(normalized)}&itc=hi-t-i0-und&num=1`;
    const response = await fetch(googleUrl);

    if (response.ok) {
      const data = await response.json();
      if (Array.isArray(data) && data[0] === 'SUCCESS' && data[1] && data[1][0] && data[1][0][1]) {
        const hindiResult = data[1][0][1][0];
        if (hindiResult) {
          return res.status(200).json({
            success: true,
            hindi: hindiResult,
            original: text
          });
        }
      }
    }
  } catch (err) {
    console.warn('Google Transliterate API offline, falling back to local dictionary:', err.message);
  }

  // Fallback: word-by-word replacement using common dictionary
  const words = normalized.split(/\s+/);
  const fallback = words.map(w => {
    const lower = w.toLowerCase().replace(/[^a-z.]/g, '');
    return DICT[lower] || w;
  }).join(' ');

  return res.status(200).json({
    success: true,
    hindi: fallback,
    original: text,
    isFallback: true
  });
}

