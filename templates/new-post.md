---
# Copy this file into content/posts and rename it.
# Use lowercase words and hyphens, then .md. Example: soft-window-portrait.md
# Lines that start with # are notes. They are not shown on the site.
# Leave draft as true until the tutorial is ready.
# A public GitHub repository still shows this file to anyone, even when draft is true.
# Do not put passwords, API keys, or private pictures in the file.

# The title viewers see.
title: "Replace this title"

# One or two sentences for the archive card and for search.
summary: "Say what the viewer will make, in one or two sentences."

# Year-month-day. Use a real date.
date: 2026-11-06

# Optional. Add a line like the next one if you revise the tutorial.
# updated: 2026-11-07

# The app you show in the video.
tool: "Name of the app"

# Optional. The model name, if you want viewers to see it. Leave blank if you do not.
model: ""

# Required. Type image or video. No other word.
category: "image"

# Optional topics for the filter. Keep them short.
tags:
  - "lighting"

# true hides the tutorial from the built site. false shows it.
draft: true

# Leave false for your own lessons. true adds an Example badge.
example: false

# Optional picture. Put the file in public/media, then use a path that starts with /media/
cover: ""
coverAlt: ""

# Optional. A full YouTube link, or leave blank.
videoUrl: ""

steps:
  - title: "First thing the viewer does"
    body: "Write the step in plain sentences."

positivePrompt: |
  Paste the prompt here.
  Line breaks are kept when a viewer copies it.

negativePrompt: |
  Optional. Erase this text if the app has no negative prompt.

settings:
  - label: "Steps"
    value: "30"

tips:
  - "Write a short reminder you actually say in the video."

results: []
# To show a picture, replace the results line with:
# results:
#   - src: "/media/your-result.jpg"
#     alt: "Describe the picture for someone who cannot see it."
#     caption: "Optional caption."
#     kind: "image"
# For a video file you upload yourself, use kind video and an mp4 or webm path:
#   - src: "/media/your-clip.mp4"
#     alt: "Describe what moves."
#     kind: "video"
---

Write extra notes under this line. This part is optional.

You can add another prompt in a fenced block. The site adds a copy button.

```text
another prompt line
the line break stays
```
