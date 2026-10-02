import MarkdownIt from 'markdown-it';
import footnote from 'markdown-it-footnote';
import mark from 'markdown-it-mark';
import taskLists from 'markdown-it-task-lists';
import DOMPurify from 'dompurify';

function escape(text) { return MarkdownIt().utils.escapeHtml(text); }

export async function renderMarkdown(source, target) {
  const md = new MarkdownIt({ html: false, linkify: true, typographer: false })
    .use(footnote).use(mark).use(taskLists);
  if (/\$/.test(source)) {
    const [{ default: texmath }, { default: katex }] = await Promise.all([import('markdown-it-texmath'), import('katex')]);
    await import('katex/dist/katex.min.css');
    md.use(texmath, { engine: katex, delimiters: 'dollars', katexOptions: { throwOnError: false, trust: false, strict: 'ignore' } });
  }
  md.renderer.rules.image = (tokens, index) => `<span class="media-placeholder">Image: ${escape(tokens[index].content || 'attachment')} · media is not included</span>`;
  const originalFence = md.renderer.rules.fence;
  md.renderer.rules.fence = (tokens, index, options, env, self) => {
    const token = tokens[index];
    if (token.info.trim() === 'mermaid') return `<div class="diagram"><pre class="mermaid-source">${escape(token.content)}</pre></div>`;
    return originalFence(tokens, index, options, env, self);
  };
  // Hide YAML properties while preserving the source for editing/download.
  const body = source.replace(/^\uFEFF/, '').replace(/^---\r?\n[\s\S]*?\r?\n---(?:\r?\n|$)/, '');
  target.innerHTML = DOMPurify.sanitize(md.render(body));
  for (const link of target.querySelectorAll('a[href]')) {
    if (/^https?:/.test(link.href)) { link.target = '_blank'; link.rel = 'noopener noreferrer'; }
  }
  for (const block of target.querySelectorAll('blockquote')) {
    const first = block.querySelector('p');
    const match = first?.textContent.match(/^\[!([\w-]+)\]([+-])?[ \t]*(.*)/);
    if (!match) continue;
    const title = document.createElement('div');
    title.className = 'callout-title';
    title.textContent = match[3] || match[1].replaceAll('-', ' ');
    block.classList.add('callout');
    block.dataset.callout = match[1].toLowerCase();
    const walker = document.createTreeWalker(first, NodeFilter.SHOW_TEXT);
    const text = walker.nextNode();
    if (text) text.textContent = text.textContent.replace(/^\[![\w-]+\][+-]?[^\n]*(?:\n|$)/, '');
    block.prepend(title);
    if (!first.textContent.trim()) first.remove();
  }
  const headings = [];
  const ids = new Map();
  for (const heading of target.querySelectorAll('h1,h2,h3,h4,h5,h6')) {
    const slug = heading.textContent.toLowerCase().replace(/[^\p{L}\p{N}\s-]/gu, '').trim().replace(/\s+/g, '-') || 'section';
    const count = ids.get(slug) || 0;
    ids.set(slug, count + 1);
    heading.id = count ? `${slug}-${count}` : slug;
    headings.push({ id: heading.id, text: heading.textContent, level: Number(heading.tagName.slice(1)) });
  }
  for (const pre of target.querySelectorAll('pre:not(.mermaid-source)')) {
    const button = document.createElement('button');
    button.className = 'copy-code'; button.textContent = 'Copy'; button.setAttribute('aria-label', 'Copy code');
    button.addEventListener('click', async () => {
      try { await navigator.clipboard.writeText(pre.querySelector('code')?.textContent || ''); button.textContent = 'Copied'; }
      catch { button.textContent = 'Copy unavailable'; }
      setTimeout(() => { button.textContent = 'Copy'; }, 1800);
    });
    pre.append(button);
  }
  return { headings, enhance: async () => {
    if (target.querySelector('pre code')) {
      const { default: hljs } = await import('highlight.js/lib/common');
      for (const code of target.querySelectorAll('pre code')) hljs.highlightElement(code);
    }
    if (target.querySelector('.mermaid-source')) {
      try {
        const { default: mermaid } = await import('mermaid');
        const css = getComputedStyle(document.documentElement);
        const v = name => css.getPropertyValue(name).trim();
        mermaid.initialize({ startOnLoad: false, securityLevel: 'strict', htmlLabels: false, suppressErrorRendering: true, theme: 'base', themeVariables: {
          darkMode: document.documentElement.dataset.appearance !== 'light', background: v('--bg'), fontFamily: v('--ui-font'), fontSize: '14px',
          primaryColor: v('--code'), primaryBorderColor: v('--border-strong'), primaryTextColor: v('--text'), lineColor: v('--muted'),
          secondaryColor: v('--surface'), tertiaryColor: v('--bg'), dropShadow: 'none',
        } });
        for (const [i, pre] of [...target.querySelectorAll('.mermaid-source')].entries()) {
          try {
            const { svg } = await mermaid.render(`diagram-${Date.now()}-${i}`, pre.textContent);
            pre.parentElement.innerHTML = DOMPurify.sanitize(svg, { USE_PROFILES: { svg: true, svgFilters: true }, ADD_ATTR: ['dominant-baseline'] });
          } catch { pre.parentElement.classList.add('diagram-error'); pre.setAttribute('aria-label', 'Diagram could not be rendered'); }
        }
      } catch { /* Source remains readable if the optional renderer fails. */ }
    }
  } };
}
