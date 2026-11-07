import { isVisible, uniqueLabels, type SearchRecord } from '../lib/search';

type Elements = {
  form: HTMLFormElement;
  query: HTMLInputElement;
  tool: HTMLSelectElement;
  topic: HTMLSelectElement;
  list: HTMLElement;
  count: HTMLElement;
  empty: HTMLElement;
  error: HTMLElement;
  clear: HTMLButtonElement;
};

function readRecords(): SearchRecord[] | null {
  const node = document.getElementById('archive-index');
  if (!node?.textContent?.trim()) return null;
  const parsed = JSON.parse(node.textContent) as unknown;
  if (!Array.isArray(parsed)) throw new Error('Search index is not a list.');
  return parsed as SearchRecord[];
}

function fillSelect(select: HTMLSelectElement, label: string, values: string[], selected: string) {
  const current = select.value;
  select.replaceChildren();
  const all = document.createElement('option');
  all.value = '';
  all.textContent = label;
  select.append(all);
  for (const value of values) {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = value;
    select.append(option);
  }
  const wanted = selected || current;
  if ([...select.options].some((option) => option.value === wanted)) select.value = wanted;
}

function initArchive() {
  const form = document.querySelector('[data-archive-form]');
  const list = document.getElementById('tutorial-list');
  if (!(form instanceof HTMLFormElement) || !(list instanceof HTMLElement)) return;

  const query = form.querySelector('#tutorial-search');
  const tool = form.querySelector('#tool-filter');
  const topic = form.querySelector('#topic-filter');
  const count = document.getElementById('result-count');
  const empty = document.getElementById('empty-results');
  const error = document.getElementById('search-error');
  const clear = document.getElementById('clear-filters');
  if (
    !(query instanceof HTMLInputElement) ||
    !(tool instanceof HTMLSelectElement) ||
    !(topic instanceof HTMLSelectElement) ||
    !(count instanceof HTMLElement) ||
    !(empty instanceof HTMLElement) ||
    !(error instanceof HTMLElement) ||
    !(clear instanceof HTMLButtonElement)
  ) {
    return;
  }

  const ui: Elements = { form, query, tool, topic, list, count, empty, error, clear };
  let records: SearchRecord[] = [];
  try {
    const inline = readRecords();
    if (!inline) throw new Error('Missing inline index.');
    records = inline;
    error.hidden = true;
  } catch {
    error.hidden = false;
    return;
  }

  const params = new URLSearchParams(location.search);
  ui.query.value = params.get('q') ?? '';
  const category = params.get('category') ?? '';
  const toolValue = params.get('tool') ?? '';
  const topicValue = params.get('topic') ?? '';
  fillSelect(ui.tool, 'All tools', uniqueLabels(records.map((record) => record.tool)), toolValue);
  fillSelect(
    ui.topic,
    'All topics',
    uniqueLabels(records.flatMap((record) => record.tags)),
    topicValue,
  );
  setCategory(ui.form, category === 'image' || category === 'video' ? category : '');
  apply(ui, records);

  ui.form.addEventListener('submit', (event) => {
    event.preventDefault();
    apply(ui, records);
  });
  ui.query.addEventListener('input', () => apply(ui, records));
  ui.tool.addEventListener('change', () => apply(ui, records));
  ui.topic.addEventListener('change', () => apply(ui, records));
  ui.form.querySelectorAll('[data-category]').forEach((button) => {
    button.addEventListener('click', () => {
      if (!(button instanceof HTMLButtonElement)) return;
      setCategory(ui.form, button.dataset.category ?? '');
      apply(ui, records);
    });
  });
  ui.clear.addEventListener('click', () => {
    ui.query.value = '';
    ui.tool.value = '';
    ui.topic.value = '';
    setCategory(ui.form, '');
    apply(ui, records);
    ui.query.focus();
  });
}

function setCategory(form: HTMLFormElement, category: string) {
  form.querySelectorAll('[data-category]').forEach((button) => {
    if (!(button instanceof HTMLButtonElement)) return;
    const active = (button.dataset.category ?? '') === category;
    button.setAttribute('aria-pressed', active ? 'true' : 'false');
  });
}

function selectedCategory(form: HTMLFormElement): string {
  const active = form.querySelector('[data-category][aria-pressed="true"]');
  return active instanceof HTMLButtonElement ? active.dataset.category ?? '' : '';
}

function apply(ui: Elements, records: SearchRecord[]) {
  const filters = {
    query: ui.query.value,
    category: selectedCategory(ui.form),
    tool: ui.tool.value,
    topic: ui.topic.value,
  };
  const visible = new Set(
    records.filter((record) => isVisible(record, filters)).map((record) => record.id),
  );
  let shown = 0;
  ui.list.querySelectorAll(':scope > li[data-id]').forEach((item) => {
    if (!(item instanceof HTMLElement)) return;
    const match = visible.has(item.dataset.id ?? '');
    item.hidden = !match;
    if (match) shown += 1;
  });
  ui.count.textContent = shown === 1 ? '1 tutorial' : `${shown} tutorials`;
  ui.empty.hidden = shown !== 0;
  const url = new URL(location.href);
  setParam(url, 'q', filters.query.trim());
  setParam(url, 'category', filters.category);
  setParam(url, 'tool', filters.tool);
  setParam(url, 'topic', filters.topic);
  history.replaceState(null, '', url);
}

function setParam(url: URL, key: string, value: string) {
  if (value) url.searchParams.set(key, value);
  else url.searchParams.delete(key);
}

initArchive();
