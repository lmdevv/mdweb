import { test } from 'node:test';
import assert from 'node:assert/strict';
import MarkdownIt from 'markdown-it';
import { registerObsidian, slugify } from '../src/obsidian.js';
import { registerObsidianEmbed, imageRule, classifyMedia } from '../src/media.js';

function render(source, title = 'My note') {
  const md = new MarkdownIt({ html: true, linkify: true });
  registerObsidianEmbed(md);
  registerObsidian(md);
  md.renderer.rules.image = imageRule;
  return md.render(source, { title });
}

test('wikilinks to this note jump to headings; other notes stay labelled', () => {
  assert.match(render('See [[#Getting Started]].'), /<a class="internal-link" href="#getting-started">Getting Started<\/a>/);
  assert.match(render('See [[My note#Setup|setup]].'), /href="#setup">setup<\/a>/);
  assert.match(render('See [[Other#Part]].'), /<span class="internal-link unresolved"[^>]*>Other › Part<\/span>/);
  assert.match(render('See [[Other|alias]].'), />alias<\/span>/);
  assert.equal(slugify('Getting Started!'), 'getting-started');
});

test('embeds still win over wikilinks, and code keeps the literal text', () => {
  assert.match(render('![[photo.png]]'), /photo\.png · not included/);
  assert.match(render('`[[Note]]`'), /<code>\[\[Note\]\]<\/code>/);
});

test('comments are hidden inline and across blocks', () => {
  assert.equal(render('Keep %%hidden%% this.').trim(), '<p>Keep  this.</p>');
  const html = render('Before\n\n%%\nsecret\n\nmore secret\n%%\n\nAfter');
  assert.doesNotMatch(html, /secret/);
  assert.match(html, /Before/);
  assert.match(html, /After/);
  assert.match(render('```\n%% code %%\n```'), /%% code %%/);
});

test('tags and block ids', () => {
  assert.match(render('A #project/alpha note'), /<span class="tag">#project\/alpha<\/span>/);
  assert.doesNotMatch(render('Issue #123'), /class="tag"/);
  assert.doesNotMatch(render('see https://example.com/#anchor'), /class="tag"/);
  assert.match(render('# Heading'), /<h1>Heading<\/h1>/);
  const block = render('A paragraph ^abc-1');
  assert.match(block, /<span id="\^abc-1"><\/span>/);
  assert.doesNotMatch(block, /\^abc-1<\/p>/);
  assert.match(render('[[#^abc-1]]'), /href="#%5Eabc-1"/);
});

test('standard image syntax accepts Obsidian sizes and data URIs', () => {
  assert.match(render('![Earth|300](https://cdn.example.com/a.png)'), /alt="Earth"[^>]*width="300"/);
  assert.equal(classifyMedia('data:image/png;base64,iVBORw0KGgo=', { imageSyntax: true }).kind, 'image');
  assert.equal(classifyMedia('data:text/html;base64,PHNjcmlwdD4=', { imageSyntax: true }).kind, 'missing');
});
