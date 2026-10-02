import { test } from 'node:test';
import assert from 'node:assert/strict';
import MarkdownIt from 'markdown-it';
import { classifyMedia, mediaHtml, registerObsidianEmbed, imageRule } from '../src/media.js';

test('a markdown image of a YouTube URL becomes an embed', () => {
  const html = mediaHtml('https://youtu.be/DHoZPOyw1Yg?si=Dsf2cy_FqlFn55p0', 'video', { imageSyntax: true });
  assert.match(html, /data-embed="youtube"/);
  assert.match(html, /data-id="DHoZPOyw1Yg"/);
  assert.equal(classifyMedia('https://www.youtube.com/watch?v=DHoZPOyw1Yg&t=90').start, '90');
  assert.equal(classifyMedia('https://vimeo.com/123456789').kind, 'vimeo');
});

test('remote images and video files render, and vault files do not', () => {
  assert.match(mediaHtml('https://cdn.example.com/a.png', 'Earth', { imageSyntax: true }), /<img [^>]*src="https:\/\/cdn\.example\.com\/a\.png"/);
  assert.match(mediaHtml('https://cdn.example.com/a.mp4', 'clip', { imageSyntax: true }), /<video/);
  assert.match(mediaHtml('assets/photo.png', 'Local image', { imageSyntax: true }), /Local image · not included/);
  assert.equal(classifyMedia('javascript:alert(1)', { imageSyntax: true }).kind, 'missing');
});

test('obsidian embeds accept urls, sizes, and local files', () => {
  const md = new MarkdownIt({ html: false, linkify: true });
  registerObsidianEmbed(md);
  md.renderer.rules.image = imageRule;
  const html = md.render([
    '![[photo.png]]',
    '![[https://cdn.example.com/wide.png|320]]',
    '![[https://youtu.be/DHoZPOyw1Yg]]',
    '![video](https://cdn.example.com/a.mp4)',
    '![pic](https://cdn.example.com/a.png)',
    '`![[not-an-embed.png]]`',
  ].join('\n\n'));
  assert.match(html, /photo\.png · not included/);
  assert.match(html, /width="320"/);
  assert.match(html, /data-embed="youtube"/);
  assert.match(html, /<video /);
  assert.match(html, /<img /);
  assert.match(html, /<code>!\[\[not-an-embed\.png\]\]<\/code>/);
});
