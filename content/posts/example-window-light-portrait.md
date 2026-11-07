---
title: "Example: Window-light portrait"
summary: "A three-step still-image workflow for soft window light. Sample content shipped with the template, not a lesson from the site owner."
date: 2026-02-12
updated: 2026-02-18
tool: "Example Image App"
model: "Example Model XL"
category: "image"
tags:
  - portrait
  - lighting
  - beginner
draft: false
example: true
cover: "/media/examples/portrait-cover.svg"
coverAlt: "Example illustration of a person seated beside a bright window."
videoUrl: ""
steps:
  - title: "Start a square canvas"
    body: "Create a new image at 1024 by 1024. The square frame keeps the face centered while you practice."
  - title: "Paste both prompts"
    body: "Copy the positive prompt into the prompt box. If the app has a negative box, paste the negative prompt there too. If it does not, skip that box."
  - title: "Match the sample settings"
    body: "Set the values in the settings table, generate four images, and keep one. The seed below is a sample, not a required number."
positivePrompt: |
  portrait of a person seated beside a tall window,
  overcast daylight,
  brown knitted sweater,
  calm expression,
  natural skin texture,
  soft shadows,
  50mm lens
negativePrompt: |
  extra fingers, distorted face, watermark, logo, text, harsh flash, plastic skin
settings:
  - label: "Steps"
    value: "28"
  - label: "Guidance"
    value: "4.5"
  - label: "Size"
    value: "1024 x 1024"
  - label: "Seed"
    value: "sample-seed-1842"
tips:
  - "If the face looks waxy, lower the guidance a little and generate again."
  - "Keep the hands out of frame while you are teaching this simple portrait."
results:
  - src: "/media/examples/portrait-result.svg"
    alt: "Example result illustration of the same window-light portrait, shown a little closer."
    caption: "Example illustration for the template. Replace it with your own result."
    kind: "image"
---

Use this lower area for context that does not fit a step. The picture below is the same kind of example illustration, linked from the site files.

![Example illustration of the window-light portrait, repeated in the notes](/media/examples/portrait-result.svg)

This fenced block is another example prompt. The copy button is added in the browser and keeps the line breaks.

```text
same person, same window,
now turned slightly toward the light,
hands out of frame
```
