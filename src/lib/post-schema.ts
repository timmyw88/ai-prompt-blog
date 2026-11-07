import { z } from 'astro/zod';
import { isSitePath } from './paths.ts';
import { youtubeId } from './youtube.ts';

const calendarDate = z.preprocess((value) => {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }
  return value;
}, z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).transform((value) => {
  const parts = value.split('-');
  const year = Number(parts[0]);
  const month = Number(parts[1]);
  const day = Number(parts[2]);
  return new Date(Date.UTC(year, month - 1, day));
});

const optionalText = z
  .string()
  .optional()
  .transform((value) => {
    if (typeof value !== 'string') return undefined;
    const trimmed = value.trim();
    return trimmed ? trimmed : undefined;
  });

const promptText = z
  .string()
  .optional()
  .transform((value) => {
    if (typeof value !== 'string') return undefined;
    const stripped = value.replace(/^\n+/, '').replace(/\n+$/, '');
    return stripped.trim() === '' ? undefined : stripped;
  });

const optionalMedia = z
  .string()
  .optional()
  .transform((value) => {
    if (typeof value !== 'string') return undefined;
    const trimmed = value.trim();
    return trimmed ? trimmed : undefined;
  })
  .refine((value) => value === undefined || isSitePath(value), 'Use a path like /media/your-file.jpg');

const optionalVideo = z
  .string()
  .optional()
  .transform((value) => {
    if (typeof value !== 'string') return undefined;
    const trimmed = value.trim();
    return trimmed ? trimmed : undefined;
  })
  .refine(
    (value) => value === undefined || youtubeId(value) !== null,
    'videoUrl must be a YouTube link, or leave it blank.',
  );

const resultSchema = z
  .object({
    src: z.string().refine((value) => isSitePath(value), 'Use a path like /media/your-file.jpg'),
    alt: z.string().min(1),
    caption: optionalText,
    kind: z.enum(['image', 'video']).default('image'),
  })
  .superRefine((result, ctx) => {
    const image = /\.(png|jpe?g|gif|webp|svg|avif)$/i.test(result.src);
    const video = /\.(mp4|webm)$/i.test(result.src);
    const ok = result.kind === 'video' ? video : image;
    if (!ok) {
      ctx.addIssue(
        'Use png, jpg, webp, gif, svg, or avif for an image, or mp4 or webm for a video file.',
      );
    }
  });

export const postSchema = z
  .object({
    title: z.string().min(1),
    summary: z.string().min(1),
    date: calendarDate,
    updated: calendarDate.optional(),
    tool: z.string().min(1),
    model: optionalText,
    category: z.enum(['image', 'video']),
    tags: z
      .array(z.string())
      .default([])
      .transform((tags) => tags.map((tag) => tag.trim()).filter(Boolean)),
    draft: z.boolean().default(false),
    example: z.boolean().default(false),
    cover: optionalMedia,
    coverAlt: optionalText,
    videoUrl: optionalVideo,
    steps: z
      .array(
        z.object({
          title: z.string().min(1),
          body: z.string().min(1),
        }),
      )
      .default([]),
    positivePrompt: promptText,
    negativePrompt: promptText,
    settings: z
      .array(
        z.object({
          label: z.string().min(1),
          value: z.string().min(1),
        }),
      )
      .default([]),
    tips: z
      .array(z.string())
      .default([])
      .transform((tips) => tips.map((tip) => tip.trim()).filter(Boolean)),
    results: z.array(resultSchema).default([]),
  })
  .strict()
  .superRefine((post, ctx) => {
    if (post.cover && !post.coverAlt) {
      ctx.addIssue('Add coverAlt describing the cover image.');
    }
  });

export type PostData = z.infer<typeof postSchema>;
