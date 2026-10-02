import { build } from 'esbuild';
import { cp, mkdir, rm, readFile, writeFile } from 'node:fs/promises';

await rm('dist', { recursive: true, force: true });
await mkdir('dist', { recursive: true });
const result = await build({
  entryPoints: ['src/app.js'], bundle: true, splitting: true, format: 'esm',
  outdir: 'dist/assets', minify: true, target: 'es2022',
  chunkNames: 'chunks/[name]-[hash]', assetNames: '[name]-[hash]',
  entryNames: '[name]-[hash]',
  loader: { '.woff2': 'file', '.woff': 'file', '.ttf': 'file' },
  legalComments: 'external', metafile: true,
});
await cp('public', 'dist', { recursive: true });
const [entry, metadata] = Object.entries(result.metafile.outputs).find(([, output]) => output.entryPoint === 'src/app.js');
const html = (await readFile('dist/index.html', 'utf8'))
  .replace('/assets/app.js', '/' + entry.replace(/^dist\//, ''))
  .replace('/assets/app.css', '/' + metadata.cssBundle.replace(/^dist\//, ''));
await writeFile('dist/index.html', html);
console.log('Built static mdweb in dist/');
