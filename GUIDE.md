# Add a tutorial on GitHub

You do not need a dashboard, a password for this site, or a paid service. A tutorial is a text file. You edit that file on the GitHub website, then GitHub rebuilds the site.

If the repository is **public**, every file you commit is public. That includes unfinished drafts and pictures. Do not put passwords, API keys, or private photos in the repository.

## What you change

| You want to change | Open this |
| --- | --- |
| A tutorial | `content/posts` |
| A blank tutorial | `templates/new-post.md` |
| A picture or clip | `public/media` |
| The site name and links | `site.config.json` |
| The About page | `src/pages/about.astro` |
| The Privacy page | `src/pages/privacy.astro` |

The folder named `public` is copied onto the website. Do not put a private file there.

## Add a tutorial

1. Open your repository on the GitHub website.
2. Click `templates`, then open `new-post.md`.
3. Click **Raw**, select all of the text, and copy it.
4. Go back to the repository. Click `content`, then `posts`.
5. Click **Add file**, then **Create new file**.
6. Name the file with lowercase words and hyphens, and end it with `.md`. Example: `soft-window-portrait.md`.
7. Paste the copied text.
8. Replace the sample words. The notes at the top of the file explain each line. Lines that start with `#` are notes. They do not show on the site.
9. Leave `draft: true` until the tutorial is finished. Change it to `draft: false` when you want viewers to see it. `true` and `false` have no quotes.
10. Scroll down and click **Commit changes**. Choose **Commit directly to the `main` branch** if GitHub offers that choice.
11. Wait a minute or two. Open the **Actions** tab if you want to see the build finish.

You do not need a pull request for a normal update. If GitHub refuses a direct commit, use the button it offers to open a pull request, then merge that request.

## What to type

The block between the two `---` lines is the information the archive searches.

| Line | Required | What to type |
| --- | --- | --- |
| `title` | Yes | The name viewers see. |
| `summary` | Yes | One or two sentences for the card and for search. |
| `date` | Yes | A real date, like `2026-11-06`. |
| `updated` | No | A date, only if you revise the tutorial. |
| `tool` | Yes | The app you show in the video. |
| `model` | No | The model name, or leave it blank. |
| `category` | Yes | `image` or `video`. No other word. |
| `tags` | No | Short topics. These become the topic filter. |
| `draft` | Yes | `true` hides it from the site. `false` shows it. |
| `example` | Yes | `false` for your own lesson. `true` adds an Example badge. |
| `cover` | No | A path like `/media/your-picture.jpg`. |
| `coverAlt` | With a cover | A sentence that describes the picture. |
| `videoUrl` | No | A YouTube link, or leave it blank. |
| `steps` | No | Numbered actions. Each one needs a `title` and a `body`. |
| `positivePrompt` | No | The prompt. Line breaks are kept when someone copies it. |
| `negativePrompt` | No | Delete the sample text if the app has no negative box. |
| `settings` | No | Each row needs a `label` and a `value`. |
| `tips` | No | Short reminders. |
| `results` | No | Pictures or video files you uploaded. See below. |

Keep the quotes around sentences. Do not use the tab key to indent. Copy the list shape that is already in the blank file.

Under the second `---` line you can write extra notes in normal sentences. That part is optional. A fenced block like the one in the blank file also gets a copy button.

## Add a picture or a clip

1. Open `public`, then `media`.
2. Click **Add file**, then **Upload files**.
3. Choose a JPG, PNG, WebP, or SVG. For a clip you host yourself, use MP4 or WebM.
4. Commit the upload.
5. In the tutorial, use a path that starts with `/media/` and the file name. Example: `/media/soft-window.jpg`.
6. Do not put the repository name in the path. The build adds that for a project site.
7. Write `coverAlt` or `alt` as a real sentence about the picture.

Keep files reasonably small, about 1 MB or less, so the page stays quick. The example pictures already in `public/media/examples` are labelled illustrations for this template. Replace them. Do not present them as your own results.

To show a result, replace `results: []` with a block like this:

```yaml
results:
  - src: "/media/your-result.jpg"
    alt: "Describe the picture."
    caption: "Optional caption."
    kind: "image"
```

For your own video file, set `kind` to `video` and use an `.mp4` or `.webm` path. For YouTube, leave `results` alone and put the watch link in `videoUrl`.

## Change or remove a tutorial

To change one, open its file, click the pencil (**Edit this file**), edit, and commit.

To hide one without deleting it, set `draft: true` and commit. It leaves the website. The file is still visible on a public repository.

To remove one, open the file, click the trash icon, and commit.

## Change the site name

Open `site.config.json`.

- `title` is the name in the header.
- `tagline` is the short line under the name.
- `description` is the sentence used for search engines.
- `author` is your name. The About and Privacy pages should match it.
- `social.youtube`, `social.facebook`, and `social.github` are full `https://` links, or `""` if you do not want that link.
- `brandingNotice` is `true` while the header still says the branding is provisional. Set it to `false` after you change the name.
- `site` is `https://your-name.github.io` with nothing after the host. Do not put the repository name here.
- `base` stays `"/"` in the file. The GitHub Action fills in a project-site prefix when it builds.
- `ads.enabled` stays `false` unless you follow the ads section below.

`true` and `false` in this file are JSON, so they are not in quotes. Text is in quotes.

Also edit `src/pages/about.astro` and `src/pages/privacy.astro`. Both pages say they still need your words.

## See the site update

The workflow file is `.github/workflows/pages.yml`. It runs when you push to `main`.

GitHub Pages has to be set to **GitHub Actions** once: in the repository, open **Settings**, then **Pages**, then **Build and deployment**, and choose **GitHub Actions** as the source.

- A user site (`your-name.github.io`) is served from `/`.
- A project site (`your-name.github.io/repository-name`) is served from `/repository-name/`. The workflow sets that prefix. You do not type it into each tutorial.

This template does not turn Pages on for you. Publishing happens only after those steps, in your repository.

## If the update fails

Open the **Actions** tab and click the failed run. The log names the file. Common causes:

- `category` is not `image` or `video`.
- The date is not a real `YYYY-MM-DD` date.
- A picture path does not start with `/media/`, or the file was not uploaded.
- `cover` is set but `coverAlt` is empty.
- A quote is missing around a sentence.
- `videoUrl` is not a YouTube link.

Fix the file and commit again.

## Ads

Ads are off. `ads.enabled` is `false`. The template includes no ad script and no publisher ID. It does not claim that any ad network has approved the site.

Leave the switch off until you have your own account. Then:

1. Set `ads.enabled` to `true`.
2. Paste only your own snippet into `src/components/AdSlot.astro`.
3. Rewrite the ads section of `src/pages/privacy.astro`.

Until you paste a snippet, the slot only shows a note that no ad code is present. It does not contact an ad network.

## Preview on your computer

If you use a terminal:

```bash
npm install
npm run dev
```

Open `http://127.0.0.1:4731/`.

```bash
npm test
npm run build
npm run preview
```

`npm test` checks the content files and builds the site. You can skip it and still edit on GitHub.
