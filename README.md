# mdweb

A static Markdown reader that shares documents as links. Live at
[md.luismario.me](https://md.luismario.me).

The document is compressed into the URL fragment and rendered in the browser.
There is no backend, and nothing is uploaded.

## Usage

From Neovim with [mdw.nvim](https://github.com/lmdevv/mdw.nvim):

```vim
:Mdw preview browser
```

Or open a Markdown file, drop one onto the page, or paste into the editor.

Supports CommonMark with sanitized inline HTML, GFM tables, task lists,
footnotes, syntax highlighting, KaTeX math, and Mermaid diagrams. Obsidian
syntax works too: `==highlights==`, callouts (including foldable `[!note]-`),
`[[wikilinks]]`, `%%comments%%`, `#tags`, and `^block-ids`. Remote images and
videos render from `![](url)`, `![alt|300](url)`, and `![[embed]]`; YouTube and
Vimeo links become players. Vault files stay placeholders.

`S` shares the document, `Y` copies the link, `H` highlights the selection, and
`Ctrl` or `Cmd` `K` jumps to a heading. Select text and choose Highlight; Share
includes every highlight.

## Link format

```text
https://md.luismario.me/#v=1&doc=PAYLOAD
```

`PAYLOAD` is UTF-8 JSON, compressed with raw DEFLATE and encoded as unpadded
base64url:

```json
{ "md": "# Note\n", "title": "Note", "theme": "obsidian" }
```

Only `md` is required. Markdown is limited to 1 MiB and links to 60,000
characters.

## Development

Requires Node.js 24+.

```sh
npm ci
npm test
npm run dev     # http://localhost:5184
npm run deploy  # Cloudflare Workers static assets
```

Pushes to `main` deploy automatically once tests pass. This requires a
`CLOUDFLARE_API_TOKEN` repository secret.

## License

MIT
