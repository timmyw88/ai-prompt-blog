import type { APIRoute } from 'astro';
import { getPublishedPosts } from '../lib/posts';
import { site } from '../lib/site';
import { absoluteUrl } from '../lib/urls';
import { escapeXml } from '../lib/xml';

export const GET: APIRoute = async () => {
  const posts = await getPublishedPosts();
  const items = posts
    .map((post) => {
      const link = absoluteUrl(`posts/${post.id}/`);
      return `    <item>
      <title>${escapeXml(post.data.title)}</title>
      <link>${escapeXml(link)}</link>
      <guid>${escapeXml(link)}</guid>
      <pubDate>${post.data.date.toUTCString()}</pubDate>
      <description>${escapeXml(post.data.summary)}</description>
    </item>`;
    })
    .join('\n');
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>${escapeXml(site.title)}</title>
    <link>${escapeXml(absoluteUrl('/'))}</link>
    <description>${escapeXml(site.description)}</description>
${items}
  </channel>
</rss>
`;
  return new Response(xml, {
    headers: { 'Content-Type': 'application/rss+xml; charset=utf-8' },
  });
};
