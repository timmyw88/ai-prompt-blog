import { getCollection, type CollectionEntry } from 'astro:content';
import { relatedPosts } from './related';

export type Post = CollectionEntry<'posts'>;

export async function getPublishedPosts(): Promise<Post[]> {
  const posts = await getCollection('posts', ({ data }) => data.draft !== true);
  return posts.sort((a, b) => b.data.date.getTime() - a.data.date.getTime());
}

export function relatedTo(post: Post, posts: Post[]): Post[] {
  return relatedPosts(post, posts);
}
