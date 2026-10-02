# mdweb

A static Markdown reader at [md.luismario.me](https://md.luismario.me).
Written in JavaScript with browser APIs, no UI framework, and no document backend.

Open a saved note from [mdw.nvim](https://github.com/lmdevv/mdw.nvim):

```vim
:mdw preview browser
```

Or open a Markdown file, drop one onto the page, or paste into the source editor.

## Reading and sharing

- Obsidian-inspired styling, Paper and Midnight themes, light/dark appearance, text size.
- Nested heading outline with the current section, duplicate heading IDs, and a mobile drawer.
- Tables, task lists, highlights, footnotes, and Obsidian callouts.
- Code highlighting and copy buttons, KaTeX math, and Mermaid diagrams.
- Share a document by link or QR, use the mobile share sheet, and download a QR image.
- Select text to share just an excerpt or highlight it within the full document.
- Edit a snapshot, download the original Markdown, and print/save as PDF.

Sharing in context includes the entire document. Sharing a passage includes only
the selected plain text. Browser edits do not write back to the original file.
Images and videos are outside this version; image references show placeholders.

Documents travel in the URL fragment and are processed in the browser. The
fragment is not part of the HTTP request, but anyone with the complete URL can
read the document. No analytics or third-party runtime requests are included.
Libraries and math fonts are served from the same origin.

## Run locally

Requires Node.js 24 or newer for development/building:

```sh
npm ci
npm test
npm run dev
```

Open `http://localhost:5184`. Set `PORT` for another port.
The build is ordinary HTML, CSS, and JavaScript in `dist/`, deployable to any
static host. Math, diagrams, code highlighting, and QR generation load on demand.

## URL protocol

```text
https://md.luismario.me/#v=1&doc=PAYLOAD
```

Version 1 uses UTF-8 JSON, **raw DEFLATE** (RFC 1951, not gzip or zlib framing),
and unpadded base64url. The decoded JSON is:

```json
{
  "md": "# Your Markdown\n",
  "title": "Your note",
  "theme": "obsidian",
  "selection": { "start": 0, "end": 4, "quote": "Your" }
}
```

Only `md` is required. `theme` and `selection` are optional. Selection offsets
are UTF-16 offsets into the rendered article's text; the exact quote provides
a fallback when renderer output differs. Selection metadata is set by mdweb,
not by the Neovim plugin. Native compression streams are used where supported;
fflate is loaded as a fallback for older browsers.

Markdown is limited to 1 MiB, the inflated JSON to 2 MiB, and links to 60,000
characters. QR codes have a much smaller capacity. Oversized QR payloads show
a copy-link/excerpt alternative; URLs are never truncated. There is no stored
short-link service in this version.

## Verify the Lua integration

With `mdw.nvim` checked out beside this repository and Neovim available:

```sh
npm test
node scripts/preview-fixture.js http://localhost:5184
node scripts/preview-fixture.js https://md.luismario.me
```

Set `MDW_PATH` for a different plugin checkout. The integration test invokes the
real `:Mdw preview browser` command with a modified buffer and verifies that the
link contains the saved Unicode/CRLF file, not unsaved edits. The fixture script
prints a link for manual browser verification. The Lua test is skipped when the
plugin checkout is absent, including standalone mdweb CI.

## Deploy

The repository includes a Wrangler static-assets configuration and a custom
domain route for `md.luismario.me` on the `lmdev` Cloudflare account.

```sh
npm run deploy
```

Wrangler authentication is local and is not checked into this repository.
The custom domain creates the required DNS record and certificate. Deployment
is explicit; pushing to GitHub runs verification but does not deploy by itself.

## License

MIT for mdweb. Dependencies retain their own licenses. Build outputs preserve
third-party license notices. A patched lodash-es override avoids vulnerable
versions pinned by Mermaid's parser dependencies.
