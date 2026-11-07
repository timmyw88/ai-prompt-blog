# Content contract

Posts stay portable. Astro reads them for this site. A future MERN app can read the same files with `gray-matter` and serve the fields as JSON. Do not put MDX components, shortcodes, or secrets in a post.

## Files

| Path | Role |
| --- | --- |
| `content/posts/*.md` | One tutorial per file. The file name, without `.md`, is the id and the URL slug. |
| `templates/new-post.md` | Blank tutorial. It is not published. |
| `public/media/**` | Images and clips. In the Markdown, refer to them as `/media/...`. |
| `site.config.json` | Title, description, author, social links, and the ads switch. |
| `/search-index.json` | Built list used by the archive filter. |

`draft: true` omits a post from the built site and from `search-index.json`. It does not make the file private.

## Frontmatter

```yaml
title: "Window light"
summary: "One or two sentences."
date: 2026-04-03
updated: 2026-04-10
tool: "Name of the app"
model: "Name of the model"
category: "image" # or video
tags: ["lighting"]
draft: false
example: false
cover: "/media/cover.jpg"
coverAlt: "Describe the cover."
videoUrl: "https://www.youtube.com/watch?v=VIDEO_ID"
steps:
  - title: "Do this"
    body: "Plain sentences."
positivePrompt: |
  first line
  second line
negativePrompt: |
  optional
settings:
  - label: "Steps"
    value: "30"
tips:
  - "A short tip."
results:
  - src: "/media/result.jpg"
    alt: "Describe the result."
    caption: "Optional."
    kind: "image" # or video for .mp4 and .webm
```

Required: `title`, `summary`, `date`, `tool`, `category`. `category` is only `image` or `video`. Dates are `YYYY-MM-DD` and are stored as UTC calendar dates.

Media paths start with `/` and do not contain `..` or a host. The site adds the GitHub Pages project prefix at build time. A future app should add its own public prefix the same way, and keep the Markdown unchanged.

`videoUrl`, when present, must be a YouTube watch, embed, shorts, or youtu.be link. The page embeds `https://www.youtube-nocookie.com/embed/ID`.

The Markdown body under the frontmatter is optional notes. Raw HTML is escaped to text. JavaScript URLs are removed. Body images must use a `/media/...` path.

Prompts are stored with their line breaks. The copy button reads that text. Fenced code in the notes drops only a single wrapping newline that the HTML block adds.

## Search record

`GET /search-index.json` is an array of:

```json
{
  "id": "window-light",
  "title": "Window light",
  "category": "image",
  "tool": "Name of the app",
  "tags": ["lighting"],
  "text": "title, summary, prompts, steps, settings, tips, and notes joined for search"
}
```

The archive page filters that list in the browser. A future API can return the same objects.

## Reading the files from Node

```js
import { readFileSync, readdirSync } from 'node:fs';
import matter from 'gray-matter';

const posts = readdirSync('content/posts')
  .filter((name) => name.endsWith('.md'))
  .map((name) => {
    const parsed = matter(readFileSync(`content/posts/${name}`, 'utf8'));
    return { id: name.replace(/\.md$/, ''), ...parsed.data, body: parsed.content };
  });
```

Validate with the same rules as `src/lib/post-schema.ts` before you serve them. Do not trust the body as HTML. Render Markdown on the server with a sanitizer, or send the source and render it safely in the client.

`site.config.json` has no secrets. `ads.enabled` is a boolean. This template has no publisher id field.
