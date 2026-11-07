import type { APIRoute } from 'astro';
import { getPublishedPosts } from '../lib/posts';
import { toSearchRecord } from '../lib/search';

export const GET: APIRoute = async () => {
  const posts = await getPublishedPosts();
  const records = posts.map((post) =>
    toSearchRecord({ id: post.id, body: post.body, data: post.data }),
  );
  return new Response(JSON.stringify(records), {
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
};
