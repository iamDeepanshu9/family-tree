import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

// 1. Load .env.local if present
const envPath = path.join(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx !== -1) {
      const key = trimmed.slice(0, idx).trim();
      const val = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, '');
      if (key && !process.env[key]) {
        process.env[key] = val;
      }
    }
  }
}

// Fallback defaults for dev
process.env.ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
process.env.ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin';
process.env.SESSION_SECRET = process.env.SESSION_SECRET || 'dev-secret-key-jeev';
if (!process.env.NODE_ENV) process.env.NODE_ENV = 'development';

const PORT = parseInt(process.env.PORT || '3000', 10);
const ROOT_DIR = process.cwd();

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8'
};

const server = http.createServer(async (req, res) => {
  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  let pathname = parsedUrl.pathname;

  // Enhance res with Vercel Serverless helpers
  res.status = function(code) {
    this.statusCode = code;
    return this;
  };
  res.json = function(data) {
    this.setHeader('Content-Type', 'application/json');
    this.end(JSON.stringify(data));
    return this;
  };

  // 1. Handle API Routes
  if (pathname.startsWith('/api/')) {
    const apiName = pathname.replace('/api/', '').split('/')[0].split('?')[0];
    const apiFile = path.join(ROOT_DIR, 'api', `${apiName}.js`);

    if (fs.existsSync(apiFile)) {
      try {
        // Parse request body for POST/PUT
        if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
          const bodyData = await new Promise((resolve) => {
            let data = '';
            req.on('data', chunk => { data += chunk; });
            req.on('end', () => {
              try { resolve(JSON.parse(data)); }
              catch { resolve(data); }
            });
            req.on('error', () => resolve(null));
          });
          req.body = bodyData;
        }

        const module = await import(`${apiFile}?t=${Date.now()}`);
        const handler = module.default;
        if (typeof handler === 'function') {
          await handler(req, res);
          return;
        }
      } catch (apiErr) {
        console.error(`API Error on ${pathname}:`, apiErr);
        res.status(500).json({ error: 'Internal API Server Error', details: apiErr.message });
        return;
      }
    } else {
      res.status(404).json({ error: `API route ${pathname} not found` });
      return;
    }
  }

  // 2. Handle /admin rewrites
  if (pathname === '/admin' || pathname === '/admin/') {
    pathname = '/admin.html';
  } else if (pathname === '/') {
    pathname = '/index.html';
  }

  // 3. Serve Static Files
  const safePath = path.normalize(pathname).replace(/^(\.\.[/\\])+/, '');
  const filePath = path.join(ROOT_DIR, safePath);

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.statusCode = 404;
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.end(`<h1>404 Not Found</h1><p>Cannot find ${pathname}</p>`);
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const mime = MIME_TYPES[ext] || 'application/octet-stream';
    res.statusCode = 200;
    res.setHeader('Content-Type', mime);
    res.setHeader('Cache-Control', 'no-cache');

    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
  });
});

server.listen(PORT, () => {
  console.log('\n======================================================');
  console.log('🌳  Jeev Family Tree Local Development Server');
  console.log('======================================================');
  console.log(`\n  👉 Public Tree:   http://localhost:${PORT}`);
  console.log(`  👉 Admin Portal:  http://localhost:${PORT}/admin`);
  console.log('\n  🔐 Default Admin Credentials:');
  console.log(`     ID:       ${process.env.ADMIN_USERNAME}`);
  console.log(`     Password: ${process.env.ADMIN_PASSWORD}`);
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    console.log('\n  ☁️  Vercel Blob: Connected (uploads sync to live Blob)');
  } else {
    console.log('\n  💾 Vercel Blob: Local Fallback Mode (saves to local files)');
  }
  console.log('\n======================================================\n');
});

