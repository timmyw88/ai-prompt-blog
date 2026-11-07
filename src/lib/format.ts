export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('en', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(date);
}

export function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function categoryLabel(category: string): string {
  if (category === 'video') return 'Video';
  if (category === 'image') return 'Image';
  return category;
}
