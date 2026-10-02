export const demo = {
  title: 'Welcome to mdweb',
  md: `# Welcome to mdweb

mdweb renders Markdown in your browser and shares it as a link. The document is stored in the link itself, so there is no server, account, or upload.

> [!note]
> Open a file from the **⋯** menu, drop one onto this page, or select **Edit** to paste Markdown.

## From Neovim

Save your note in [mdw.nvim](https://github.com/lmdevv/mdw.nvim) and run:

\`\`\`vim
:Mdw preview browser
\`\`\`

## Sharing

Select **Share** to get a link or a QR code. To share one passage, select some text first:

| Option | Includes |
| --- | --- |
| Share passage | Only the selected text |
| Share in context | The full document, with the selection highlighted |

Edits made here produce a new link. They are never written back to the original file.

## Supported syntax

- Tables, task lists, footnotes,[^1] and ==highlights==
- Obsidian callouts
- Syntax-highlighted code
- KaTeX math and Mermaid diagrams

A checklist:

- [x] Write the note
- [ ] Share it

$$
\\int_0^1 x^2\\,dx = \\tfrac{1}{3}
$$

\`\`\`mermaid
flowchart LR
  A[Markdown] --> B[Compressed link] --> C[Rendered page]
\`\`\`

[^1]: Images and videos are not included in links. They appear as placeholders.
`,
};
