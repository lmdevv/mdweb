import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { resolve, extname } from 'node:path';

const root = resolve('dist');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf' };
// Mirror the production headers so CSP problems show up locally.
const headers = {};
let section = '';
for (const line of (await readFile(resolve(root, '_headers'), 'utf8').catch(() => '')).split('\n')) {
  if (/^\S/.test(line)) section = line.trim();
  else if (section === '/*' && line.includes(':')) {
    const at = line.indexOf(':');
    headers[line.slice(0, at).trim()] = line.slice(at + 1).trim();
  }
}
createServer(async (req, res) => {
  try {
    let file = resolve(root, '.' + decodeURIComponent(new URL(req.url, 'http://localhost').pathname));
    if (!file.startsWith(root + '/') && file !== root) { res.writeHead(403).end(); return; }
    if ((await stat(file).catch(() => null))?.isDirectory()) file += '/index.html';
    const data = await readFile(file);
    res.writeHead(200, { ...headers, 'Content-Type': types[extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' }).end(data);
  } catch { res.writeHead(404).end('Not found'); }
}).listen(Number(process.env.PORT || 5184), '0.0.0.0', () => console.log(`mdweb: http://localhost:${process.env.PORT || 5184}`));
