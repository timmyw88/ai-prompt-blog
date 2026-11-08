# Tutorial file builder

`/post-builder/` is a form that fills in the fields from `templates/new-post.md` and downloads a Markdown file. It does not publish the tutorial.

The page is not linked in the header or footer. It sends `noindex` and it is not in the sitemap. Anyone who knows the address can open it. There is no login. That is not privacy: do not type passwords, API keys, or private photos.

Nothing in the form is uploaded. The browser does not save the form unless you press **Save in this browser**. On a shared computer, press **Forget saved form** when you are done. Leaving the page asks for confirmation when the form has changed.

## Make a file

1. Open `/post-builder/` on the site, or `http://127.0.0.1:4731/post-builder/` from `npm run dev`.
2. Fill in the title, summary, date, and app. The date starts as today on your computer.
3. Leave **Draft** selected until the tutorial should appear on the site. **List it on the site** only writes `draft: false`. You still commit the file yourself.
4. Choose Image or Video for the result the prompt makes. A YouTube lesson, including a Short, is separate. Paste that link under YouTube lesson link. Shorts and youtu.be links are stored as a normal watch link.
5. Add steps, the exact prompts, settings, tips, and notes if you have them.
6. Check the preview and the Markdown source. Copy either one, or press **Download Markdown**.
7. Put the file in `content/posts` and commit it to `main`. The site rebuilds from that commit.

The file name follows the title until you edit it. The download uses a single `.md` name made of letters, numbers, and hyphens.

## Pictures and clips

The form does not upload files. Add the picture or clip in `public/media` on GitHub, then type the path with the same spelling and capitalization, such as `/media/your-file.png`. Cover images need a description. A result clip must be `.mp4` or `.webm`.

## Import

**Import an existing Markdown file** reads a tutorial you already have and fills the form. Download the file again before you commit it. `example` is always written as `false`.
