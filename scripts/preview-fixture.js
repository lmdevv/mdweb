import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
const plugin = resolve(process.env.MDW_PATH || '../mdw.nvim');
const fixture = resolve('tests/fixtures/preview.md');
const script = `
vim.opt.runtimepath:prepend(vim.env.MDWEB_PLUGIN)
require('mdw').setup({ preview = { url = vim.env.MDWEB_URL }, format = { enabled = false } })
vim.cmd.edit(vim.fn.fnameescape(vim.env.MDWEB_NOTE))
vim.api.nvim_buf_set_lines(0, 0, -1, false, { '# UNSAVED TEXT MUST NOT TRAVEL' })
vim.ui.open = function(url) io.write(url); return {} end
vim.cmd('Mdw preview browser')
`;
const dir = mkdtempSync(resolve(tmpdir(), 'mdweb-fixture-'));
const scriptPath = resolve(dir, 'preview.lua');
writeFileSync(scriptPath, script);
const result = spawnSync('nvim', ['--headless', '-u', 'NONE', '-i', 'NONE', '-n', '-l', scriptPath], {
  encoding: 'utf8', env: { ...process.env, MDWEB_PLUGIN: plugin, MDWEB_NOTE: fixture, MDWEB_URL: process.argv[2] || 'https://md.luismario.me' },
});
rmSync(dir, { recursive: true, force: true });
if (result.status !== 0 || !result.stdout.startsWith('http')) throw new Error(result.stderr || 'mdw did not open the fixture');
console.log(result.stdout);
