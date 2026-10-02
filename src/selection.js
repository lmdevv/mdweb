export function selectedPassage(article) {
  const selection = window.getSelection();
  if (!selection?.rangeCount || selection.isCollapsed) return null;
  const range = selection.getRangeAt(0);
  if (!article.contains(range.startContainer) || !article.contains(range.endContainer)) return null;
  const before = document.createRange();
  before.selectNodeContents(article); before.setEnd(range.startContainer, range.startOffset);
  const start = before.toString().length;
  const quote = range.toString();
  if (!quote.trim()) return null;
  return { start, end: start + quote.length, quote };
}

function locate(text, item) {
  if (text.slice(item.start, item.end) === item.quote) return item.start;
  return text.indexOf(item.quote);
}

export function addHighlight(list, passage, text) {
  let start = passage.start;
  let end = passage.end;
  const kept = [];
  for (const item of list) {
    const located = locate(text, item);
    if (located < 0) { kept.push(item); continue; }
    const itemEnd = located + item.quote.length;
    if (end < located || start > itemEnd) kept.push({ start: located, end: itemEnd, quote: item.quote });
    else { start = Math.min(start, located); end = Math.max(end, itemEnd); }
  }
  kept.push({ start, end, quote: text.slice(start, end) });
  kept.sort((a, b) => a.start - b.start);
  return kept;
}

export function highlightAt(list, passage, text) {
  for (const [index, item] of list.entries()) {
    const start = locate(text, item);
    if (start >= 0 && passage.start >= start && passage.end <= start + item.quote.length) return index;
  }
  return -1;
}

function wrap(article, range) {
  const walker = document.createTreeWalker(article, NodeFilter.SHOW_TEXT);
  const nodes = [];
  let node, offset = 0;
  while ((node = walker.nextNode())) {
    const next = offset + node.length;
    if (next > range.start && offset < range.end && !node.parentElement.closest('button, svg, mark.shared-highlight')) {
      nodes.push({ node, from: Math.max(0, range.start - offset), to: Math.min(node.length, range.end - offset) });
    }
    offset = next;
  }
  for (const { node, from, to } of nodes.reverse()) {
    if (from >= to) continue;
    node.splitText(to);
    const selected = node.splitText(from);
    const mark = document.createElement('mark');
    mark.className = 'shared-highlight';
    mark.dataset.highlight = String(range.index);
    mark.title = 'Shared highlight';
    selected.replaceWith(mark);
    mark.append(selected);
  }
  return nodes.length > 0;
}

export function restorePassages(article, selections, { scroll = false } = {}) {
  const list = Array.isArray(selections) ? selections : selections ? [selections] : [];
  const text = article.textContent;
  const ranges = [];
  for (const [index, selection] of list.entries()) {
    if (!selection?.quote) continue;
    const start = locate(text, selection);
    if (start < 0) continue;
    ranges.push({ start, end: start + selection.quote.length, index });
  }
  let painted = 0;
  for (const range of ranges.sort((a, b) => b.start - a.start)) if (wrap(article, range)) painted += 1;
  if (scroll) article.querySelector('.shared-highlight')?.scrollIntoView({ block: 'center' });
  return painted;
}
