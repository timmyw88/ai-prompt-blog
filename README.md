# Prompt Ledger

A static archive for image and video tutorials. Each tutorial is a Markdown file with a block of fields at the top. Viewers can search prompts, filter by tool, topic, and image or video, open a tutorial, and copy a prompt without losing its line breaks.

The pages are built with [Astro](https://astro.build) into plain HTML, CSS, and a little JavaScript. There is no database, no sign-in, and no paid service. GitHub Pages can host the built files later. **This project has not been published to GitHub Pages.** Pushing it to your own repository and turning Pages on is still your step.

The three tutorials in `content/posts` are labelled examples. They are not lessons from a real channel.

## Preview

Requires Node.js 22 or newer.

```bash
npm install
npm run dev
```

Open [http://127.0.0.1:4731/](http://127.0.0.1:4731/).

```bash
npm test
npm run build
npm run preview
```

`npm run build` writes the site into `dist/`. `npm test` runs the checks and a production build, including a project-site base path.

## Where to edit

| Change | File |
| --- | --- |
| Site name, description, social links, ads switch | `site.config.json` |
| Tutorials | `content/posts/*.md` |
| Blank tutorial | `templates/new-post.md` |
| Pictures and clips | `public/media/` |
| Nontechnical editing steps | `GUIDE.md` (also on the site at `/guide/`) |
| Field list for a future app | `CONTENT_SCHEMA.md` |
| About and privacy, both need your words | `src/pages/about.astro`, `src/pages/privacy.astro` |
| Your own ad snippet, only after you have an account | `src/components/AdSlot.astro` |

`draft: true` keeps a tutorial out of the built site. On a **public** GitHub repository the file is still public. Do not commit passwords, API keys, or private photos.

## Publish with GitHub Pages

1. Create your own GitHub repository and push this project to it.
2. In the repository, open **Settings → Pages → Build and deployment**, and set **Source** to **GitHub Actions**.
3. The workflow `.github/workflows/pages.yml` runs on every push to `main`. If your default branch has another name, change `branches` in that file.
4. A user or organization site (`username.github.io`) is published at `/`.
5. A project site (`username.github.io/repository-name`) is published at `/repository-name/`. The workflow sets that base path from the repository name. Keep paths in tutorials as `/media/...`, without the repository name.
6. Set `site` in `site.config.json` to `https://username.github.io` (no project path) before you care about canonical links in a local build. The Action sets the real origin when it runs.

Until you do this, the site is only the files in the repository and whatever you preview locally.

## Ads

`ads.enabled` is `false`. No ad script, tracking snippet, or publisher ID is included, and nothing here claims an ad network has approved the site. See `GUIDE.md` before you turn the switch on.

## A later move to MERN

Keep `content/posts`, `public/media`, and `site.config.json`. A Node API can read the same Markdown with a frontmatter parser. Do not add framework-only shortcodes inside the posts. The shape is written down in `CONTENT_SCHEMA.md`.

## Limits

- Search runs in the browser over one generated list. That fits a personal archive, not a large multi-author site.
- Link-preview images should be PNG, JPG, or WebP. The sample pictures are SVG and are not used as social images.
- On a project site, crawlers often read `robots.txt` from the host root, which this repository does not control.
- YouTube’s own policies apply to any embedded player.
- The About and Privacy pages are templates. They are not legal advice.
