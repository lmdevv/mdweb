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

Select text and choose **Highlight**. You can mark several passages. **Share** sends the whole note with all of them.

- \`S\` opens share
- \`Y\` copies the link
- \`H\` highlights the selected text
- \`Ctrl\` or \`Cmd\` \`K\` jumps to a heading

Edits made here produce a new link. They are never written back to the original file.

## Supported syntax

- Tables, task lists, footnotes,[^1] and ==highlights==
- Obsidian callouts
- Syntax-highlighted code
- KaTeX math and Mermaid diagrams
- Images and videos, including Obsidian embeds

![Earth from space](https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1200&q=60)

![video](https://youtu.be/dQw4w9WgXcQ)

A vault file stays a placeholder: ![[diagram.png]]

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

[^1]: A picture or video at a web address is shown. A file that exists only in a vault is a placeholder.
`,
};
