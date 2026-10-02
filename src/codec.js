export const MAX_BYTES = 1024 * 1024;
export const MAX_URL = 60000;
const encoder = new TextEncoder();

function base64url(bytes) {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
}

function unbase64url(text) {
  if (!text || !/^[A-Za-z0-9_-]+$/.test(text) || text.length % 4 === 1) throw new Error('Invalid document encoding.');
  return Uint8Array.from(atob(text.replaceAll('-', '+').replaceAll('_', '/')), c => c.charCodeAt(0));
}

async function transform(bytes, compress) {
  let stream;
  try {
    stream = new Blob([bytes]).stream().pipeThrough(compress
      ? new CompressionStream('deflate-raw') : new DecompressionStream('deflate-raw'));
  } catch {
    const { deflateSync, Inflate } = await import('fflate');
    if (compress) return deflateSync(bytes, { level: 5 });
    const chunks = [];
    let total = 0;
    const inflater = new Inflate(chunk => {
      total += chunk.length;
      if (total > MAX_BYTES * 2) throw new Error('Document exceeds the preview size limit.');
      chunks.push(chunk);
    });
    // Small input chunks bound intermediate allocation on older browsers.
    for (let i = 0; i < bytes.length; i += 256) inflater.push(bytes.subarray(i, i + 256), i + 256 >= bytes.length);
    const result = new Uint8Array(total);
    let offset = 0;
    for (const chunk of chunks) { result.set(chunk, offset); offset += chunk.length; }
    return result;
  }
  const reader = stream.getReader();
  const chunks = [];
  let total = 0;
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      total += value.length;
      if (total > MAX_BYTES * 2) { await reader.cancel(); throw new Error('Document exceeds the preview size limit.'); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const result = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) { result.set(chunk, offset); offset += chunk.length; }
  return result;
}

export function validatePayload(payload) {
  if (!payload || typeof payload.md !== 'string') throw new Error('The link does not contain a Markdown document.');
  if (encoder.encode(payload.md).length > MAX_BYTES) throw new Error('Document exceeds the 1 MiB limit.');
  if (payload.title !== undefined && typeof payload.title !== 'string') throw new Error('Invalid document title.');
  const result = { md: payload.md, title: (payload.title || 'Untitled').slice(0, 200) };
  if (['obsidian', 'paper', 'midnight'].includes(payload.theme)) result.theme = payload.theme;
  if (payload.selection && Number.isSafeInteger(payload.selection.start) && Number.isSafeInteger(payload.selection.end)
      && payload.selection.start >= 0 && payload.selection.end > payload.selection.start && typeof payload.selection.quote === 'string') {
    result.selection = { start: payload.selection.start, end: payload.selection.end, quote: payload.selection.quote };
  }
  return result;
}

export async function encodeDocument(payload) {
  const bytes = encoder.encode(JSON.stringify(validatePayload(payload)));
  if (bytes.length > MAX_BYTES * 2) throw new Error('Document exceeds the preview size limit.');
  return base64url(await transform(bytes, true));
}

export async function decodeHash(hash) {
  if (hash.length > MAX_URL) throw new Error('This document link is too large.');
  const params = new URLSearchParams(hash.replace(/^#/, ''));
  if (params.get('v') !== '1') throw new Error('Unsupported document link version.');
  const bytes = await transform(unbase64url(params.get('doc')), false);
  return validatePayload(JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)));
}

export async function documentUrl(payload, base = location.href) {
  const url = new URL(base);
  url.search = '';
  url.hash = 'v=1&doc=' + await encodeDocument(payload);
  if (url.href.length > MAX_URL) throw new Error('Compressed document exceeds the link size limit.');
  return url.href;
}
