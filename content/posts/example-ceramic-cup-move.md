---
title: "Example: Short push-in on a ceramic cup"
summary: "A three-second camera move that starts from a still. Sample content shipped with the template, not a lesson from the site owner."
date: 2026-06-18
tool: "Example Video App"
model: "Example Video Model"
category: "video"
tags:
  - motion
  - beginner
  - camera
draft: false
example: true
cover: "/media/examples/cup-move.svg"
coverAlt: "Example illustration of a ceramic cup with a suggested slow camera push-in."
videoUrl: "https://www.youtube.com/watch?v=aqz-KE-bpKQ"
steps:
  - title: "Begin with one still"
    body: "Generate or photograph a single cup on linen. The video tool should start from that picture, not from a blank prompt only."
  - title: "Describe the camera, not a new object"
    body: "Say that the cup stays put and the camera moves closer. Ask for no cuts."
  - title: "Keep the clip short"
    body: "Export about three seconds. If the cup warps, shorten the move and try again."
positivePrompt: |
  slow push-in toward a ceramic cup,
  cup stays still,
  linen-covered table,
  soft morning light,
  no cuts,
  three seconds
negativePrompt: |
  flicker, warped cup, extra objects, text, logo, jump cut
settings:
  - label: "Duration"
    value: "3 seconds"
  - label: "Motion"
    value: "Slow push-in"
  - label: "Start frame"
    value: "The still from the image step"
tips:
  - "Describe what must not move before you describe the camera."
  - "The player on this page is only a sample embed. Point videoUrl at your own video."
results:
  - src: "/media/examples/cup-move.svg"
    alt: "Example illustration suggesting a camera move toward a ceramic cup."
    caption: "Example storyboard frame, not a captured viewer result."
    kind: "image"
---

The embed on this page plays a public Blender Foundation short, [Big Buck Bunny](https://studio.blender.org/projects/big-buck-bunny/), so you can see the player. It is not a tutorial by the site owner. Replace `videoUrl` with your own YouTube link, or leave it blank.
