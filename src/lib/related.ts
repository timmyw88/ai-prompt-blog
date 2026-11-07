type Relatable = {
  id: string;
  data: {
    date: Date;
    tool: string;
    category: string;
    tags: string[];
  };
};

export function relatedPosts<T extends Relatable>(current: T, all: T[], limit = 3): T[] {
  const tags = new Set(current.data.tags.map((tag) => tag.toLowerCase()));
  return all
    .filter((post) => post.id !== current.id)
    .map((post) => {
      let score = 0;
      if (post.data.tool.toLowerCase() === current.data.tool.toLowerCase()) score += 3;
      if (post.data.category === current.data.category) score += 1;
      for (const tag of post.data.tags) {
        if (tags.has(tag.toLowerCase())) score += 2;
      }
      return { post, score };
    })
    .filter((item) => item.score > 0)
    .sort(
      (a, b) =>
        b.score - a.score || b.post.data.date.getTime() - a.post.data.date.getTime(),
    )
    .slice(0, limit)
    .map((item) => item.post);
}
