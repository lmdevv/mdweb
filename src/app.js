import { decodeHash, documentUrl, MAX_BYTES } from './codec.js';
import { renderMarkdown } from './render.js';
import { selectedPassage, restorePassages, addHighlight, highlightAt } from './selection.js';
import { demo } from './demo.js';

const $ = id => document.getElementById(id);
const article = $('document');
let payload = { ...demo };
let outline = [];
let passage = null;
let observer;
let renderVersion = 0;
let toastTimer;
let appearance = readPreference('appearance') || (matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
let fontSize = 16;
const narrow = matchMedia('(max-width: 1023px)');

function readPreference(key) { try { return localStorage.getItem('mdweb-' + key); } catch { return null; } }
function savePreference(key, value) { try { localStorage.setItem('mdweb-' + key, value); } catch { /* Storage is optional. */ } }
function notify(message) {
  $('toast').textContent = message; $('toast').hidden = false;
  clearTimeout(toastTimer); toastTimer = setTimeout(() => { $('toast').hidden = true; }, 3500);
}
function syncThemeColor() {
  document.querySelector('meta[name="theme-color"]').content = getComputedStyle(document.documentElement).getPropertyValue('--bg').trim();
}
function appearanceChanged() {
  document.documentElement.dataset.appearance = appearance;
  $('appearance').setAttribute('aria-label', `Switch to ${appearance === 'dark' ? 'light' : 'dark'} appearance`);
  syncThemeColor();
}
appearanceChanged();

function activeHighlights(doc = payload) {
  if (Array.isArray(doc.highlights) && doc.highlights.length) return doc.highlights;
  return doc.selection ? [doc.selection] : [];
}
function renderOutline(headings) {
  outline = headings;
  $('outline').replaceChildren();
  document.body.classList.toggle('no-outline', headings.length < 2);
  const minLevel = Math.min(...headings.map(h => h.level), 1);
  for (const heading of headings) {
    const link = document.createElement('a');
    link.href = '#' + heading.id; link.textContent = heading.text;
    link.style.setProperty('--level', heading.level - minLevel);
    link.dataset.heading = heading.id;
    link.addEventListener('click', event => {
      event.preventDefault(); document.getElementById(heading.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      if (narrow.matches) toggleOutline(false);
    });
    $('outline').append(link);
  }
  observer?.disconnect();
  observer = new IntersectionObserver(entries => {
    for (const entry of entries) if (entry.isIntersecting) {
      for (const link of $('outline').querySelectorAll('a')) {
        const active = link.dataset.heading === entry.target.id;
        link.classList.toggle('active', active);
        if (active) link.setAttribute('aria-current', 'location'); else link.removeAttribute('aria-current');
      }
    }
  }, { rootMargin: '-10% 0px -70% 0px' });
  for (const heading of headings) observer.observe(document.getElementById(heading.id));
}

async function render() {
  const version = ++renderVersion;
  $('error').hidden = true;
  $('selection-actions').hidden = true; passage = null;
  document.title = `${payload.title} — mdweb`;
  $('document-name').textContent = payload.title;
  $('theme').value = payload.theme || readPreference('theme') || 'obsidian';
  document.documentElement.dataset.theme = $('theme').value;
  syncThemeColor();
  $('source').value = payload.md;
  const { headings, enhance } = await renderMarkdown(payload.md, article, { title: payload.title });
  if (version !== renderVersion) return;
  renderOutline(headings);
  syncHighlightCount();
  // Restore before optional renderers change diagram text nodes.
  restorePassages(article, activeHighlights(payload), { scroll: true });
  await enhance();
}

async function load() {
  try {
    payload = location.hash ? await decodeHash(location.hash) : { ...demo };
    await render();
  } catch (error) {
    article.replaceChildren(); outline = []; $('outline').replaceChildren(); document.body.classList.add('no-outline');
    $('error').textContent = `${error.message} Open a Markdown file to start again.`; $('error').hidden = false;
    $('document-name').textContent = 'Unable to open document';
  }
}

function toggleOutline(force) {
  const open = typeof force === 'boolean' ? force : !document.body.classList.contains('outline-open');
  document.body.classList.toggle('outline-open', open); $('outline-toggle').setAttribute('aria-expanded', String(open));
}
$('outline-toggle').addEventListener('click', () => toggleOutline());
document.addEventListener('click', event => {
  if (document.body.classList.contains('outline-open') && !event.target.closest('#sidebar, #outline-toggle')) toggleOutline(false);
});
document.addEventListener('keydown', event => {
  if (event.key === 'Escape') {
    if (event.defaultPrevented) return;
    if (!$('finder').hidden) { closeFinder(); return; }
    if ($('share-dialog').open) return;
    toggleOutline(false);
    return;
  }
  const command = event.metaKey || event.ctrlKey;
  if (command && event.code === 'KeyK' && !event.altKey && !event.shiftKey) {
    event.preventDefault();
    $('finder').hidden ? openFinder() : closeFinder();
    return;
  }
  if (command || event.altKey || event.shiftKey || event.repeat) return;
  if (event.target instanceof Element && event.target.closest('input, textarea, select, [contenteditable]')) return;
  if (!$('finder').hidden || $('share-dialog').open) return;
  const key = event.key.toLowerCase();
  if (key === 's') { event.preventDefault(); showShare(); }
  else if (key === 'y') { event.preventDefault(); copyShareLink(); }
  else if (key === 'h' && selectedPassage(article)) { event.preventDefault(); toggleHighlight(); }
});
addEventListener('scroll', () => document.body.classList.toggle('scrolled', scrollY > 4), { passive: true });
$('menu').addEventListener('beforetoggle', event => {
  if (event.newState !== 'open') return;
  const anchor = $('more').getBoundingClientRect();
  $('menu').style.top = anchor.bottom + 6 + 'px';
  $('menu').style.right = Math.max(8, innerWidth - anchor.right) + 'px';
});
for (const item of $('menu').querySelectorAll('.menu-item')) item.addEventListener('click', () => $('menu').hidePopover());
$('appearance').addEventListener('click', () => { appearance = appearance === 'dark' ? 'light' : 'dark'; savePreference('appearance', appearance); appearanceChanged(); render().catch(error => notify(error.message)); });
$('theme').addEventListener('change', () => { payload.theme = $('theme').value; document.documentElement.dataset.theme = payload.theme; savePreference('theme', payload.theme); syncThemeColor(); });
for (const [id, delta] of [['smaller', -1], ['larger', 1]]) $(id).addEventListener('click', () => { fontSize = Math.max(13, Math.min(24, fontSize + delta)); document.documentElement.style.setProperty('--reading-size', fontSize + 'px'); });
$('edit-toggle').addEventListener('click', () => {
  const open = $('editor').hidden; $('editor').hidden = !open; document.body.classList.toggle('editing', open);
  $('edit-toggle').setAttribute('aria-pressed', String(open));
  if (open) { $('source').value = payload.md; $('source').focus(); }
});
$('apply').addEventListener('click', async () => {
  try {
    const next = { md: $('source').value, title: $('source').value.match(/^#\s+(.+)$/m)?.[1] || payload.title, theme: $('theme').value, highlights: activeHighlights(payload) };
    const url = await documentUrl(next);
    history.replaceState(null, '', url); payload = next;
    await render(); notify('Changes applied. Share a new snapshot when you’re ready.');
  } catch (error) { notify(error.message); }
});

async function openFile(file) {
  if (!file) return;
  if (file.size > MAX_BYTES) { notify('Choose a Markdown file smaller than 1 MiB.'); return; }
  try {
    const next = { md: await file.text(), title: file.name.replace(/\.[^.]+$/, ''), theme: $('theme').value };
    const url = await documentUrl(next);
    history.replaceState(null, '', url); payload = next;
    await render(); window.scrollTo(0, 0); notify('Opened ' + file.name);
  } catch (error) { notify(error.message); }
}
$('open-file').addEventListener('click', () => $('file-input').click());
$('file-input').addEventListener('change', () => { openFile($('file-input').files[0]); $('file-input').value = ''; });
window.addEventListener('dragover', event => { event.preventDefault(); });
window.addEventListener('drop', event => { event.preventDefault(); openFile(event.dataTransfer.files[0]); });

function download(blob, filename) {
  const url = URL.createObjectURL(blob); const a = document.createElement('a');
  a.href = url; a.download = filename; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function filename() { return payload.title.replace(/[^\p{L}\p{N} _-]/gu, '').trim() || 'document'; }
$('download').addEventListener('click', () => download(new Blob([payload.md], { type: 'text/markdown;charset=utf-8' }), filename() + '.md'));
$('print').addEventListener('click', () => window.print());

function snapshot() {
  const next = { ...payload, theme: $('theme').value };
  const highlights = activeHighlights(payload);
  if (highlights.length) next.highlights = highlights;
  else delete next.highlights;
  delete next.selection;
  return next;
}
async function copyShareLink() {
  try { await navigator.clipboard.writeText(await documentUrl(snapshot())); notify('Link copied'); }
  catch (error) { notify(error.name === 'NotAllowedError' ? 'Copy failed. Use Share and copy the link there.' : error.message); }
}
async function showShare() {
  try {
    const count = activeHighlights(payload).length;
    const url = await documentUrl(snapshot());
    $('share-title').textContent = 'Share this document';
    $('share-description').textContent = count ? `${count} highlighted ${count === 1 ? 'passage' : 'passages'} included.` : 'A snapshot of this document.';
    $('share-url').value = url; $('copy-link').textContent = 'Copy link';
    $('qr').hidden = true; $('save-qr').hidden = true;
    $('qr-message').hidden = false; $('qr-message').textContent = 'Creating QR code…';
    $('native-share').hidden = typeof navigator.share !== 'function';
    if (!$('share-dialog').open) $('share-dialog').showModal();
    try {
      const { default: QRCode } = await import('qrcode');
      await QRCode.toCanvas($('qr'), url, { width: 320, margin: 4, errorCorrectionLevel: 'M', color: { dark: '#19181d', light: '#ffffff' } });
      $('qr').hidden = false; $('save-qr').hidden = false; $('qr-message').hidden = true;
    } catch { $('qr-message').textContent = 'This document is too long for a QR code. Copy the link instead.'; }
  } catch (error) { notify(error.message); }
}
$('share').addEventListener('click', () => showShare());
$('close-share').addEventListener('click', () => $('share-dialog').close());
$('share-dialog').addEventListener('click', event => { if (event.target === $('share-dialog') && (event.clientX < event.target.getBoundingClientRect().left || event.clientX > event.target.getBoundingClientRect().right || event.clientY < event.target.getBoundingClientRect().top || event.clientY > event.target.getBoundingClientRect().bottom)) $('share-dialog').close(); });
$('copy-link').addEventListener('click', async () => {
  try { await navigator.clipboard.writeText($('share-url').value); $('copy-link').textContent = 'Copied'; notify('Link copied'); }
  catch { $('share-url').focus(); $('share-url').select(); notify('Select and copy the link above.'); }
});
$('native-share').addEventListener('click', async () => { try { await navigator.share({ title: payload.title, url: $('share-url').value }); } catch (error) { if (error.name !== 'AbortError') notify('Sharing is unavailable. Copy the link instead.'); } });
$('save-qr').addEventListener('click', () => $('qr').toBlob(blob => { if (blob) download(blob, filename() + '-qr.png'); }));

function setHighlights(list) {
  if (list.length) payload.highlights = list;
  else delete payload.highlights;
  delete payload.selection;
  for (const mark of article.querySelectorAll('mark.shared-highlight')) mark.replaceWith(...mark.childNodes);
  article.normalize();
  restorePassages(article, payload.highlights || []);
  syncHighlightCount();
  persist();
}
function syncHighlightCount() {
  $('clear-highlights').hidden = !activeHighlights(payload).length;
}
$('clear-highlights').addEventListener('click', () => { setHighlights([]); notify('Highlights cleared'); });
let persistQueue = Promise.resolve();
function persist() {
  const current = snapshot();
  persistQueue = persistQueue.then(async () => {
    try { history.replaceState(null, '', await documentUrl(current)); }
    catch (error) { notify(error.message); }
  }).catch(() => {});
}
document.addEventListener('selectionchange', () => {
  const next = selectedPassage(article);
  if (next) {
    passage = next;
    const inside = highlightAt(activeHighlights(payload), next, article.textContent) >= 0;
    $('highlight-toggle').textContent = inside ? 'Remove highlight' : 'Highlight';
    $('selection-actions').hidden = false;
  } else if (!document.activeElement?.closest('#selection-actions')) $('selection-actions').hidden = true;
});
$('selection-actions').addEventListener('pointerdown', event => event.preventDefault());
function toggleHighlight() {
  const next = selectedPassage(article) || passage;
  if (!next) return;
  passage = next;
  if (passage.quote.length > 20000) { notify('Select a shorter passage.'); return; }
  const text = article.textContent;
  const existing = highlightAt(activeHighlights(payload), passage, text);
  if (existing < 0 && activeHighlights(payload).length >= 40) { notify('A document can have up to 40 highlights.'); return; }
  setHighlights(existing >= 0 ? activeHighlights(payload).filter((_, index) => index !== existing) : addHighlight(activeHighlights(payload), passage, text));
  getSelection().removeAllRanges();
  $('selection-actions').hidden = true;
  const count = activeHighlights(payload).length;
  notify(existing >= 0 ? 'Highlight removed' : `${count} ${count === 1 ? 'highlight' : 'highlights'} · Share includes ${count === 1 ? 'it' : 'all of them'}`);
}
$('highlight-toggle').addEventListener('click', toggleHighlight);
let finderItems = [];
let finderIndex = 0;
function closeFinder() { $('finder').hidden = true; $('finder-input').value = ''; }
function jumpTo(id) {
  closeFinder();
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  if (narrow.matches) toggleOutline(false);
}
function renderFinder() {
  const query = $('finder-input').value.trim().toLowerCase();
  finderItems = outline.filter(heading => heading.text.toLowerCase().includes(query));
  if (finderIndex >= finderItems.length) finderIndex = Math.max(0, finderItems.length - 1);
  $('finder-list').replaceChildren();
  if (!finderItems.length) {
    const empty = document.createElement('li');
    empty.className = 'finder-empty';
    empty.textContent = outline.length ? 'No matching headings' : 'No headings';
    $('finder-list').append(empty);
    return;
  }
  finderItems.forEach((heading, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.role = 'option';
    button.textContent = heading.text;
    button.style.setProperty('--level', heading.level - 1);
    button.setAttribute('aria-selected', String(index === finderIndex));
    button.addEventListener('click', () => jumpTo(heading.id));
    $('finder-list').append(button);
  });
  $('finder-list').querySelector('[aria-selected="true"]')?.scrollIntoView({ block: 'nearest' });
}
function openFinder() {
  $('menu').hidePopover();
  toggleOutline(false);
  finderIndex = 0;
  $('finder').hidden = false;
  $('finder-input').value = '';
  renderFinder();
  $('finder-input').focus();
}
$('finder').addEventListener('mousedown', event => { if (event.target === $('finder')) closeFinder(); });
$('finder-input').addEventListener('input', () => { finderIndex = 0; renderFinder(); });
$('finder-input').addEventListener('keydown', event => {
  if (!finderItems.length && (event.key === 'ArrowDown' || event.key === 'ArrowUp')) return;
  if (event.key === 'ArrowDown') { event.preventDefault(); finderIndex = Math.min(finderItems.length - 1, finderIndex + 1); renderFinder(); }
  else if (event.key === 'ArrowUp') { event.preventDefault(); finderIndex = Math.max(0, finderIndex - 1); renderFinder(); }
  else if (event.key === 'Enter' && finderItems[finderIndex]) { event.preventDefault(); jumpTo(finderItems[finderIndex].id); }
  else if (event.key === 'Escape') { event.preventDefault(); closeFinder(); }
});
article.addEventListener('click', event => {
  const mark = event.target.closest('mark.shared-highlight');
  if (mark && !event.target.closest('a') && !getSelection().toString()) {
    // Selecting the whole highlight surfaces "Remove highlight" instead of deleting on a stray click.
    const parts = article.querySelectorAll(`mark.shared-highlight[data-highlight="${mark.dataset.highlight}"]`);
    const range = document.createRange();
    range.setStartBefore(parts[0]); range.setEndAfter(parts[parts.length - 1]);
    getSelection().removeAllRanges(); getSelection().addRange(range);
    return;
  }
  const link = event.target.closest('a');
  if (link?.getAttribute('href')?.startsWith('#')) {
    event.preventDefault(); document.getElementById(decodeURIComponent(link.getAttribute('href').slice(1)))?.scrollIntoView({ behavior: 'smooth' });
  }
});
window.addEventListener('hashchange', load);
await load();
