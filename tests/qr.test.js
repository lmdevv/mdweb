import { test } from 'node:test';
import assert from 'node:assert/strict';
import QRCode from 'qrcode';
import jsQR from 'jsqr';
import { PNG } from 'pngjs';
import { documentUrl } from '../src/codec.js';

test('generated QR code decodes to the exact document URL', async () => {
  const url = await documentUrl({ md: '# A note\n\ncafé 日本語 🙂', title: 'A note' }, 'https://md.luismario.me');
  const data = await QRCode.toDataURL(url, { width: 320, margin: 4, errorCorrectionLevel: 'M' });
  const png = PNG.sync.read(Buffer.from(data.split(',')[1], 'base64'));
  const decoded = jsQR(new Uint8ClampedArray(png.data), png.width, png.height);
  assert.equal(decoded?.data, url);
});
test('a document that cannot fit a QR code fails without truncating its URL', async () => {
  await assert.rejects(QRCode.toDataURL('https://md.luismario.me/#' + 'a'.repeat(6000), { errorCorrectionLevel: 'M' }));
});
