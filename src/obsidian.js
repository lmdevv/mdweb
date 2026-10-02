export function slugify(text) {
  return String(text).toLowerCase().replace(/[^\p{L}\p{N}\s-]/gu, '').trim().replace(/\s+/g, '-') || 'section';
}

function wikilink(state, silent) {
  const start = state.pos;
  if (state.src.slice(start, start + 2) !== '[[') return false;
  const end = state.src.indexOf(']]', start + 2);
  if (end < 0) return false;
  const body = state.src.slice(start + 2, end);
  if (!body.trim() || /[\n[\]]/.test(body)) return false;
  if (!silent) {
    const pipe = body.indexOf('|');
    const token = state.push('wikilink', '', 0);
    token.content = (pipe < 0 ? body : body.slice(0, pipe)).trim();
    token.info = pipe < 0 ? '' : body.slice(pipe + 1).trim();
  }
  state.pos = end + 2;
  return true;
}

function renderWikilink(escape) {
  return (tokens, index, options, env) => {
    const { content: target, info: alias } = tokens[index];
    const hash = target.indexOf('#');
    const page = (hash < 0 ? target : target.slice(0, hash)).trim();
    const section = hash < 0 ? '' : target.slice(hash + 1).trim();
    const label = alias || [page, section.replace(/^\^/, '')].filter(Boolean).join(' › ');
    const here = !page || page.toLowerCase() === String(env?.title || '').toLowerCase();
    if (here && section) {
      const id = section.startsWith('^') ? section : slugify(section);
      return `<a class="internal-link" href="#${escape(encodeURIComponent(id))}">${escape(label)}</a>`;
    }
    return `<span class="internal-link unresolved" title="${escape(page)} is not part of this document">${escape(label)}</span>`;
  };
}

function inlineComment(state, silent) {
  const start = state.pos;
  if (state.src.slice(start, start + 2) !== '%%') return false;
  const end = state.src.indexOf('%%', start + 2);
  if (end < 0) return false;
  if (!silent) state.push('obsidian_comment', '', 0);
  state.pos = end + 2;
  return true;
}

function blockComment(state, startLine, endLine, silent) {
  if (state.sCount[startLine] - state.blkIndent >= 4) return false;
  const open = state.bMarks[startLine] + state.tShift[startLine];
  if (state.src.slice(open, open + 2) !== '%%') return false;
  const close = state.src.indexOf('%%', open + 2);
  let line = startLine;
  if (close < 0) line = endLine - 1;
  else {
    while (line < endLine && state.eMarks[line] < close) line += 1;
    if (line >= endLine || state.src.slice(close + 2, state.eMarks[line]).trim()) return false;
  }
  if (silent) return true;
  state.line = line + 1;
  state.push('obsidian_comment', '', 0).map = [startLine, state.line];
  return true;
}

function tag(state, silent) {
  const start = state.pos;
  if (state.src[start] !== '#' || (start > 0 && !/\s/.test(state.src[start - 1]))) return false;
  const match = state.src.slice(start + 1).match(/^[\p{L}\p{N}_/-]+/u);
  if (!match || /^\d+$/.test(match[0])) return false;
  if (!silent) state.push('obsidian_tag', '', 0).content = match[0];
  state.pos = start + 1 + match[0].length;
  return true;
}

function blockId(state, silent) {
  const start = state.pos;
  if (state.src[start] !== '^' || start === 0 || !/[ \t]/.test(state.src[start - 1])) return false;
  const match = state.src.slice(start).match(/^\^([A-Za-z0-9-]+)[ \t]*(?=\n|$)/);
  if (!match) return false;
  if (!silent) state.push('obsidian_block_id', '', 0).content = match[1];
  state.pos = start + match[0].length;
  return true;
}

export function registerObsidian(md) {
  const escape = md.utils.escapeHtml;
  md.inline.ruler.before('link', 'wikilink', wikilink);
  md.inline.ruler.before('text', 'obsidian_comment', inlineComment);
  md.inline.ruler.push('obsidian_tag', tag);
  md.inline.ruler.push('obsidian_block_id', blockId);
  md.block.ruler.before('table', 'obsidian_comment', blockComment, { alt: ['paragraph', 'reference', 'blockquote', 'list'] });
  md.renderer.rules.wikilink = renderWikilink(escape);
  md.renderer.rules.obsidian_comment = () => '';
  md.renderer.rules.obsidian_tag = (tokens, index) => `<span class="tag">#${escape(tokens[index].content)}</span>`;
  md.renderer.rules.obsidian_block_id = (tokens, index) => `<span id="^${escape(tokens[index].content)}"></span>`;
}
