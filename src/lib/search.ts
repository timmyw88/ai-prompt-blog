export type SearchRecord = {
  id: string;
  title: string;
  category: string;
  tool: string;
  tags: string[];
  text: string;
};

export type SearchFilters = {
  query: string;
  category: string;
  tool: string;
  topic: string;
};

export type SearchablePost = {
  id: string;
  body?: string;
  data: {
    title: string;
    summary: string;
    tool: string;
    model?: string;
    category: string;
    tags: string[];
    steps: Array<{ title: string; body: string }>;
    positivePrompt?: string;
    negativePrompt?: string;
    settings: Array<{ label: string; value: string }>;
    tips: string[];
  };
};

export function toSearchRecord(post: SearchablePost): SearchRecord {
  const data = post.data;
  const parts = [
    data.title,
    data.summary,
    data.tool,
    data.model ?? '',
    data.category,
    ...data.tags,
    ...data.steps.flatMap((step) => [step.title, step.body]),
    data.positivePrompt ?? '',
    data.negativePrompt ?? '',
    ...data.settings.flatMap((item) => [item.label, item.value]),
    ...data.tips,
    post.body ?? '',
  ];
  return {
    id: post.id,
    title: data.title,
    category: data.category,
    tool: data.tool,
    tags: data.tags,
    text: parts.join('\n'),
  };
}

export function matchesQuery(text: string, query: string): boolean {
  const terms = query.toLowerCase().replace(/-/g, ' ').split(/\s+/).filter(Boolean);
  if (terms.length === 0) return true;
  const haystack = text.toLowerCase().replace(/-/g, ' ');
  return terms.every((term) => haystack.includes(term));
}

export function isVisible(record: SearchRecord, filters: SearchFilters): boolean {
  if (filters.category && record.category !== filters.category) return false;
  if (filters.tool && record.tool.toLowerCase() !== filters.tool.toLowerCase()) return false;
  if (
    filters.topic &&
    !record.tags.some((tag) => tag.toLowerCase() === filters.topic.toLowerCase())
  ) {
    return false;
  }
  return matchesQuery(record.text, filters.query);
}

export function uniqueLabels(values: string[]): string[] {
  const seen = new Set<string>();
  const labels: string[] = [];
  for (const value of [...values].sort((a, b) => a.localeCompare(b))) {
    const key = value.trim().toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    labels.push(value.trim());
  }
  return labels;
}
