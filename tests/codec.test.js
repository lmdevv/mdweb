import { test } from 'node:test';
import assert from 'node:assert/strict';
import { deflateRawSync, inflateRawSync, gzipSync } from 'node:zlib';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';
import { decodeHash, documentUrl, MAX_BYTES } from '../src/codec.js';

const fixture = { md: '# Unicode\r\n\r\ncafé 日本語 🙂\r\n```lua\r\nprint("hi")\r\n```\r\n', title: '日本語', theme: 'paper' };
const hash = payload => '#v=1&doc=' + deflateRawSync(Buffer.from(JSON.stringify(payload))).toString('base64url');

test('decode a standard raw DEFLATE payload, preserving UTF-8 and CRLF', async () => {
  assert.deepEqual(await decodeHash(hash(fixture)), fixture);
});
test('browser encoding is interoperable with zlib and preserves selection', async () => {
  const payload = { ...fixture, selection: { start: 2, end: 9, quote: 'Unicode' } };
  const url = new URL(await documentUrl(payload, 'https://md.luismario.me/?tracking=test'));
  assert.equal(url.search, '');
  const decoded = JSON.parse(inflateRawSync(Buffer.from(new URLSearchParams(url.hash.slice(1)).get('doc'), 'base64url')));
  assert.deepEqual(decoded, payload);
});
test('empty Markdown is valid', async () => { assert.equal((await decodeHash(hash({ md: '' }))).md, ''); });
test('several highlights round-trip and invalid ones are dropped', async () => {
  const highlights = [{ start: 0, end: 5, quote: 'hello' }, { start: 6, end: 11, quote: 'world' }];
  const decoded = await decodeHash(hash({ md: 'hello world', highlights: [...highlights, { start: -1, end: 1, quote: 'no' }, { start: 0, end: 4, quote: 'hey' }] }));
  assert.deepEqual(decoded.highlights, highlights);
  assert.equal(decoded.selection, undefined);
});
test('malformed links and gzip are rejected', async () => {
  for (const value of ['#v=2&doc=abc', '#v=1&doc=!', '#v=1&doc=a', '#v=1&doc=aaaa', hash({ wrong: true }), '#v=1&doc=' + gzipSync(JSON.stringify(fixture)).toString('base64url')]) {
    await assert.rejects(decodeHash(value));
  }
});
test('decompression and document size are bounded', async () => {
  await assert.rejects(decodeHash(hash({ md: 'a'.repeat(MAX_BYTES + 1) })), /limit/);
  await assert.rejects(decodeHash(hash({ md: 'a'.repeat(MAX_BYTES * 3) })), /limit/);
});
test('older browsers can use the lazy DEFLATE fallback', async () => {
  const compress = globalThis.CompressionStream, decompress = globalThis.DecompressionStream;
  globalThis.CompressionStream = undefined; globalThis.DecompressionStream = undefined;
  try {
    assert.deepEqual(await decodeHash(new URL(await documentUrl(fixture, 'https://md.luismario.me')).hash), fixture);
    await assert.rejects(decodeHash(hash({ md: 'x'.repeat(MAX_BYTES * 3) })), /limit/);
  } finally { globalThis.CompressionStream = compress; globalThis.DecompressionStream = decompress; }
});

const plugin = resolve(process.env.MDW_PATH || '../mdw.nvim');
test('real Lua command reads the latest saved file and opens a browser-compatible link', { skip: !existsSync(join(plugin, 'lua/mdw/browser.lua')) }, async () => {
  const dir = mkdtempSync(join(tmpdir(), 'mdweb-roundtrip-'));
  const note = join(dir, '日本語 note.md');
  const script = join(dir, 'roundtrip.lua');
  writeFileSync(note, fixture.md);
  writeFileSync(script, `
vim.opt.runtimepath:prepend(vim.env.MDWEB_PLUGIN)
require('mdw').setup({ format = { enabled = false } })
vim.cmd.edit(vim.fn.fnameescape(vim.env.MDWEB_NOTE))
vim.api.nvim_buf_set_lines(0, 0, -1, false, { '# UNSAVED TEXT MUST NOT TRAVEL' })
vim.ui.open = function(url) io.write(url); return {} end
vim.cmd('Mdw preview browser')
`);
  try {
    const result = spawnSync('nvim', ['--headless', '-u', 'NONE', '-i', 'NONE', '-n', '-l', script], { encoding: 'utf8', env: { ...process.env, MDWEB_PLUGIN: plugin, MDWEB_NOTE: note } });
    assert.equal(result.status, 0, result.stderr);
    const url = new URL(result.stdout);
    assert.equal(url.origin, 'https://md.luismario.me');
    const payload = await decodeHash(url.hash);
    assert.equal(payload.md, fixture.md);
    assert.equal(payload.title, '日本語 note');
    const json = inflateRawSync(Buffer.from(new URLSearchParams(url.hash.slice(1)).get('doc'), 'base64url')).toString('utf8');
    assert.equal(json, JSON.stringify({ md: fixture.md, title: '日本語 note' }), 'Lua JSON field order is stable');
    const again = spawnSync('nvim', ['--headless', '-u', 'NONE', '-i', 'NONE', '-n', '-l', script], { encoding: 'utf8', env: { ...process.env, MDWEB_PLUGIN: plugin, MDWEB_NOTE: note } });
    assert.equal(again.status, 0, again.stderr);
    assert.equal(again.stdout, result.stdout, 'independent Neovim processes generate identical URLs');
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
