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

Supports GFM tables, task lists, footnotes, highlights, Obsidian callouts,
syntax highlighting, KaTeX math, and Mermaid diagrams.

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
