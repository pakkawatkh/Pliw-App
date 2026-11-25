import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.json': 'application/json; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.dmg': 'application/x-apple-diskimage',
  '.zip': 'application/zip',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
};

export function getMimeType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return MIME_TYPES[ext] || 'application/octet-stream';
}

export async function startStaticServer(distDir, { mountPrefix = '/public' } = {}) {
  const resolvedRoot = path.resolve(distDir);
  if (!fs.existsSync(resolvedRoot) || !fs.statSync(resolvedRoot).isDirectory()) {
    throw new Error(`Static server distDir does not exist or is not a directory: ${resolvedRoot}`);
  }

  const normalizedPrefix = mountPrefix.endsWith('/') ? mountPrefix.slice(0, -1) : mountPrefix;

  const server = http.createServer((req, res) => {
    try {
      const method = (req.method || 'GET').toUpperCase();
      if (method !== 'GET' && method !== 'HEAD') {
        res.writeHead(405, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('Method Not Allowed');
        return;
      }

      const rawUrl = (req.url || '/').split('?')[0].split('#')[0];
      let pathname;
      try {
        pathname = decodeURIComponent(rawUrl);
      } catch {
        res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('Bad Request');
        return;
      }

      if (pathname === normalizedPrefix) {
        res.writeHead(301, { Location: `${normalizedPrefix}/` });
        res.end();
        return;
      }

      if (!pathname.startsWith(`${normalizedPrefix}/`)) {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end(`Not Found (must be under ${normalizedPrefix}/): ${pathname}`);
        return;
      }

      const relUrlPath = pathname.slice(normalizedPrefix.length + 1);
      const safeRelPath = path.posix.normalize(`/${relUrlPath}`).slice(1);
      const targetPath = path.resolve(resolvedRoot, safeRelPath);

      if (targetPath !== resolvedRoot && !targetPath.startsWith(resolvedRoot + path.sep)) {
        res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('Forbidden');
        return;
      }

      let fileToServe = null;
      if (fs.existsSync(targetPath)) {
        const stat = fs.statSync(targetPath);
        if (stat.isDirectory()) {
          if (!pathname.endsWith('/')) {
            res.writeHead(301, { Location: `${pathname}/` });
            res.end();
            return;
          }
          const idx = path.join(targetPath, 'index.html');
          if (fs.existsSync(idx) && fs.statSync(idx).isFile()) {
            fileToServe = idx;
          }
        } else if (stat.isFile()) {
          fileToServe = targetPath;
        }
      }

      if (!fileToServe) {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end(`Not Found: ${pathname}`);
        return;
      }

      const stat = fs.statSync(fileToServe);
      res.writeHead(200, {
        'Content-Type': getMimeType(fileToServe),
        'Content-Length': stat.size,
        'Cache-Control': 'no-store',
      });

      if (method === 'HEAD') {
        res.end();
        return;
      }

      const stream = fs.createReadStream(fileToServe);
      stream.on('error', () => {
        if (!res.headersSent) {
          res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
        }
        res.end('Internal Server Error');
      });
      stream.pipe(res);
    } catch (err) {
      if (!res.headersSent) {
        res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
      }
      res.end(err?.message || 'Internal Server Error');
    }
  });

  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      server.removeListener('error', reject);
      resolve();
    });
  });

  const addr = server.address();
  const port = typeof addr === 'object' && addr ? addr.port : 0;
  const origin = `http://127.0.0.1:${port}`;
  const baseUrl = `${origin}${normalizedPrefix}/`;

  return {
    server,
    port,
    origin,
    baseUrl,
    async close() {
      server.closeAllConnections?.();
      await new Promise((resolve) => server.close(() => resolve()));
    },
  };
}
