import crypto from 'node:crypto';
import { getAdminCredentials, createToken, verifyAuth, setCorsHeaders, parseJsonBody } from './_utils.js';

export default async function handler(req, res) {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'GET') {
    const isValid = verifyAuth(req);
    return res.status(200).json({ authenticated: isValid });
  }

  if (req.method === 'POST') {
    const body = await parseJsonBody(req);
    if (!body || !body.username || !body.password) {
      return res.status(400).json({ success: false, error: 'Username and password required' });
    }

    const { username, password } = getAdminCredentials();

    // Constant-time comparison for security
    const userMatch = crypto.timingSafeEqual(
      Buffer.from(String(body.username).padEnd(64, ' ')),
      Buffer.from(String(username).padEnd(64, ' '))
    );
    const passMatch = crypto.timingSafeEqual(
      Buffer.from(String(body.password).padEnd(64, ' ')),
      Buffer.from(String(password).padEnd(64, ' '))
    );

    if (userMatch && passMatch) {
      const token = createToken(username);
      res.setHeader('Set-Cookie', `admin_token=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${7 * 86400}`);
      return res.status(200).json({
        success: true,
        token,
        username
      });
    }

    return res.status(401).json({ success: false, error: 'Invalid ID or password' });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

