import type { APIRoute } from 'astro';
import { getPublishedPosts } from '../lib/posts';
import { absoluteUrl } from '../lib/urls';
import { escapeXml } from '../lib/xml';
import { isoDate } from '../lib/format';

export const GET: APIRoute = async () => {
  const posts = await getPublishedPosts();
  const urls = [
    absoluteUrl('/'),
    absoluteUrl('guide/'),
    absoluteUrl('about/'),
    absoluteUrl('privacy/'),
    ...posts.map((post) => absoluteUrl(`posts/${post.id}/`)),
  ];
  const dates = new Map(posts.map((post) => [absoluteUrl(`posts/${post.id}/`), isoDate(post.data.updated ?? post.data.date)]));
  const body = urls
    .map((url) => {
      const lastmod = dates.get(url);
      return `  <url><loc>${escapeXml(url)}</loc>${lastmod ? `<lastmod>${lastmod}</lastmod>` : ''}</url>`;
    })
    .join('\n');
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${body}
</urlset>
`;
  return new Response(xml, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
};
