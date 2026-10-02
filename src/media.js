const IMAGE_EXT = new Set(['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'avif', 'bmp', 'ico', 'apng']);
const VIDEO_EXT = new Set(['mp4', 'webm', 'ogv', 'mov', 'm4v']);
const AUDIO_EXT = new Set(['mp3', 'wav', 'ogg', 'flac', 'm4a', 'aac', 'oga']);

function escape(text) {
  return String(text).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
}

function fileName(src) {
  const clean = String(src).split(/[?#]/)[0];
  try { return decodeURIComponent(clean.split('/').pop() || '') || 'file'; }
  catch { return clean.split('/').pop() || 'file'; }
}

function extension(pathname) {
  const base = pathname.split('/').pop() || '';
  const dot = base.lastIndexOf('.');
  return dot < 0 ? '' : base.slice(dot + 1).toLowerCase();
}

export function httpUrl(value) {
  const text = String(value ?? '').trim();
  if (!text) return null;
  try {
    const url = new URL(text, 'https://mdweb.invalid');
    if (url.origin === 'https://mdweb.invalid') return null;
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
    return url;
  } catch { return null; }
}

function startSeconds(url) {
  const raw = url.searchParams.get('t') || url.searchParams.get('start') || '';
  if (/^\d{1,6}$/.test(raw)) return raw === '0' ? '' : raw;
  const match = raw.match(/^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/);
  if (!match || !raw) return '';
  const seconds = (Number(match[1] || 0) * 3600) + (Number(match[2] || 0) * 60) + Number(match[3] || 0);
  return seconds > 0 && seconds < 1000000 ? String(seconds) : '';
}

function youtube(url) {
  const host = url.hostname.replace(/^(www|m)\./, '');
  if (host !== 'youtu.be' && host !== 'youtube.com' && host !== 'youtube-nocookie.com') return null;
  let id = '';
  if (host === 'youtu.be') id = url.pathname.split('/').filter(Boolean)[0] || '';
  else if (url.pathname === '/watch') id = url.searchParams.get('v') || '';
  else {
    const [kind, value] = url.pathname.split('/').filter(Boolean);
    if (['embed', 'shorts', 'live', 'v'].includes(kind)) id = value || '';
  }
  return /^[\w-]{11}$/.test(id) ? { id, start: startSeconds(url) } : null;
}

function vimeo(url) {
  const host = url.hostname.replace(/^www\./, '');
  if (host !== 'vimeo.com' && host !== 'player.vimeo.com') return null;
  const parts = url.pathname.split('/').filter(Boolean);
  const id = parts[parts[0] === 'video' ? 1 : parts.length - 1];
  return /^\d{5,12}$/.test(id || '') ? id : null;
}

export function classifyMedia(src, { imageSyntax = false } = {}) {
  if (imageSyntax && /^data:image\/(?:png|jpe?g|gif|webp|avif);base64,[\w+/=]+$/i.test(String(src ?? '').trim())) return { kind: 'image', src: String(src).trim() };
  const url = httpUrl(src);
  if (!url) return { kind: 'missing', name: fileName(src || 'file') };
  const clip = youtube(url);
  if (clip) return { kind: 'youtube', ...clip };
  const vimeoId = vimeo(url);
  if (vimeoId) return { kind: 'vimeo', id: vimeoId };
  const ext = extension(url.pathname);
  if (VIDEO_EXT.has(ext)) return { kind: 'video', src: url.href };
  if (AUDIO_EXT.has(ext)) return { kind: 'audio', src: url.href };
  if (imageSyntax || IMAGE_EXT.has(ext)) return { kind: 'image', src: url.href };
  return { kind: 'file', src: url.href };
}

function sizeAttrs(width, height) {
  const attrs = [];
  if (/^\d{1,4}$/.test(width || '')) attrs.push(`width="${width}"`);
  if (/^\d{1,4}$/.test(height || '')) attrs.push(`height="${height}"`);
  return attrs.length ? ` ${attrs.join(' ')}` : '';
}

export function mediaHtml(src, alt = '', options = {}) {
  const media = classifyMedia(src, options);
  const label = alt || media.name || fileName(src || 'file');
  if (media.kind === 'missing') return `<span class="media-placeholder">${escape(label)} · not included</span>`;
  if (media.kind === 'file') return `<a href="${escape(media.src)}" target="_blank" rel="noopener noreferrer">${escape(fileName(media.src))}</a>`;
  if (media.kind === 'youtube' || media.kind === 'vimeo') {
    const start = media.start ? ` data-start="${media.start}"` : '';
    const width = /^\d{1,4}$/.test(options.width || '') ? ` data-width="${options.width}"` : '';
    return `<span class="embed" data-embed="${media.kind}" data-id="${escape(media.id)}"${start}${width}></span>`;
  }
  const dims = sizeAttrs(options.width, options.height);
  if (media.kind === 'video') return `<video class="media" controls playsinline src="${escape(media.src)}"${dims}></video>`;
  if (media.kind === 'audio') return `<audio class="media" controls src="${escape(media.src)}"></audio>`;
  return `<img class="media" src="${escape(media.src)}" alt="${escape(alt)}" loading="lazy"${dims}>`;
}

export function imageRule(tokens, index) {
  const token = tokens[index];
  const size = token.content.match(/^(.*?)\s*\|\s*(\d{1,4})(?:x(\d{1,4}))?$/);
  if (size) return mediaHtml(token.attrGet('src'), size[1], { imageSyntax: true, width: size[2], height: size[3] || '' });
  return mediaHtml(token.attrGet('src'), token.content, { imageSyntax: true });
}

export function replaceIframes(root) {
  for (const iframe of root.querySelectorAll('iframe')) {
    const media = classifyMedia(iframe.getAttribute('src'));
    if (media.kind !== 'youtube' && media.kind !== 'vimeo') { iframe.remove(); continue; }
    const holder = document.createElement('span');
    holder.className = 'embed';
    holder.dataset.embed = media.kind;
    holder.dataset.id = media.id;
    if (media.start) holder.dataset.start = media.start;
    iframe.replaceWith(holder);
  }
}

function obsidianEmbed(state, silent) {
  const start = state.pos;
  if (state.src.slice(start, start + 3) !== '![[') return false;
  const end = state.src.indexOf(']]', start + 3);
  if (end < 0 || state.src.slice(start, end).includes('\n')) return false;
  const body = state.src.slice(start + 3, end).trim();
  if (!body) return false;
  if (!silent) {
    const pipe = body.indexOf('|');
    const token = state.push('obsidian_embed', '', 0);
    token.content = (pipe < 0 ? body : body.slice(0, pipe)).trim();
    token.info = pipe < 0 ? '' : body.slice(pipe + 1).trim();
  }
  state.pos = end + 2;
  return true;
}

function embedSize(info) {
  const size = info.match(/^(\d{1,4})(?:x(\d{1,4}))?$/);
  if (size) return { width: size[1], height: size[2] || '', alt: '' };
  return { width: '', height: '', alt: info };
}

export function registerObsidianEmbed(md) {
  md.inline.ruler.before('image', 'obsidian_embed', obsidianEmbed);
  md.renderer.rules.obsidian_embed = (tokens, index) => {
    const token = tokens[index];
    return mediaHtml(token.content, embedSize(token.info).alt, embedSize(token.info));
  };
}

export function mountMedia(root) {
  for (const paragraph of [...root.querySelectorAll('p')]) {
    const link = paragraph.querySelector(':scope > a[href]');
    if (!link || paragraph.textContent.trim() !== link.textContent.trim()) continue;
    const html = mediaHtml(link.getAttribute('href'), '');
    if (!/^(<span class="embed"|<video |<audio |<img )/.test(html)) continue;
    const holder = document.createElement('div');
    holder.innerHTML = html;
    paragraph.replaceWith(...holder.childNodes);
  }
  for (const el of root.querySelectorAll('.embed[data-embed][data-id]')) {
    if (el.querySelector('iframe')) continue;
    const id = el.dataset.id;
    let src = '';
    if (el.dataset.embed === 'youtube' && /^[\w-]{11}$/.test(id)) src = `https://www.youtube-nocookie.com/embed/${id}`;
    else if (el.dataset.embed === 'vimeo' && /^\d{5,12}$/.test(id)) src = `https://player.vimeo.com/video/${id}`;
    else continue;
    if (/^\d+$/.test(el.dataset.start || '')) src += `?start=${el.dataset.start}`;
    const iframe = document.createElement('iframe');
    iframe.src = src;
    iframe.title = 'Embedded video';
    iframe.loading = 'lazy';
    iframe.allowFullscreen = true;
    iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
    iframe.referrerPolicy = 'strict-origin-when-cross-origin';
    if (/^\d{1,4}$/.test(el.dataset.width || '')) el.style.setProperty('--embed-width', `${el.dataset.width}px`);
    el.replaceChildren(iframe);
  }
}
