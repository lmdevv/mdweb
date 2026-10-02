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

export function restorePassage(article, selection) {
  if (!selection) return false;
  const text = article.textContent;
  let start = selection.start;
  if (text.slice(start, selection.end) !== selection.quote) start = text.indexOf(selection.quote);
  if (start < 0) return false;
  const end = start + selection.quote.length;
  const walker = document.createTreeWalker(article, NodeFilter.SHOW_TEXT);
  const nodes = [];
  let node, offset = 0;
  while ((node = walker.nextNode())) {
    const next = offset + node.length;
    if (next > start && offset < end && !node.parentElement.closest('button,svg')) nodes.push({ node, from: Math.max(0, start - offset), to: Math.min(node.length, end - offset) });
    offset = next;
  }
  for (const { node, from, to } of nodes.reverse()) {
    node.splitText(to);
    const selected = node.splitText(from);
    const mark = document.createElement('mark'); mark.className = 'shared-highlight';
    selected.replaceWith(mark); mark.append(selected);
  }
  article.querySelector('.shared-highlight')?.scrollIntoView({ block: 'center' });
  return nodes.length > 0;
}
