import crypto from 'node:crypto';

export function getAdminCredentials() {
  const username = process.env.ADMIN_USERNAME || 'admin';
  const password = process.env.ADMIN_PASSWORD || 'jeev123';
  const secret = process.env.SESSION_SECRET ||
    crypto.createHash('sha256').update(password + '-jeev-salt').digest('hex');
  return { username, password, secret };
}

export function createToken(username) {
  const { secret } = getAdminCredentials();
  const payload = {
    u: username,
    exp: Date.now() + 7 * 24 * 60 * 60 * 1000 // 7 days
  };
  const b64Payload = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto.createHmac('sha256', secret).update(b64Payload).digest('base64url');
  return `${b64Payload}.${signature}`;
}

export function verifyAuth(req) {
  const authHeader = req.headers['authorization'] || req.headers['x-admin-token'] || '';
  let token = '';

  if (authHeader.startsWith('Bearer ')) {
    token = authHeader.slice(7).trim();
  } else if (authHeader) {
    token = authHeader.trim();
  } else if (req.headers['cookie']) {
    const match = req.headers['cookie'].match(/admin_token=([^;]+)/);
    if (match) token = match[1].trim();
  }

  if (!token || !token.includes('.')) return false;

  const [b64Payload, signature] = token.split('.');
  if (!b64Payload || !signature) return false;

  const { secret } = getAdminCredentials();
  const expectedSig = crypto.createHmac('sha256', secret).update(b64Payload).digest('base64url');

  try {
    const sigBuf = Buffer.from(signature);
    const expBuf = Buffer.from(expectedSig);
    if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
      return false;
    }

    const payload = JSON.parse(Buffer.from(b64Payload, 'base64url').toString('utf8'));
    if (!payload.exp || Date.now() > payload.exp) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

export function setCorsHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-admin-token');
}

export async function parseJsonBody(req) {
  if (Buffer.isBuffer(req.body)) {
    try { return JSON.parse(req.body.toString('utf8')); } catch { return null; }
  }
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') {
    try { return JSON.parse(req.body); } catch { return null; }
  }
  if (req.readableEnded || req.complete) {
    return null;
  }
  return new Promise((resolve) => {
    const chunks = [];
    req.on('data', chunk => chunks.push(chunk));
    req.on('end', () => {
      try {
        const str = Buffer.concat(chunks).toString('utf8');
        resolve(JSON.parse(str));
      } catch {
        resolve(null);
      }
    });
    req.on('error', () => resolve(null));
  });
}

