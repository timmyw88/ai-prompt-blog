import {
  accessibleCopyName,
  copyLabel,
  copyStatusMessage,
  copyWithProviders,
  type CopyState,
} from '../lib/copy';
import {
  buildPostFile,
  formatLocalDate,
  parsePostMarkdown,
  previewPlainText,
  safeMarkdownBasename,
  safeMediaSrc,
  slugFromTitle,
  type PostInput,
  type ResultKind,
} from '../lib/post-markdown';
import { canonicalYoutubeUrl, youtubeEmbedUrl, youtubeId } from '../lib/youtube';

const STORAGE_KEY = 'ethan-prompts-post-builder-v1';

type Step = { title: string; body: string };
type Setting = { label: string; value: string };
type Tip = { text: string };
type Result = { src: string; alt: string; caption: string; kind: ResultKind };

function must<T extends HTMLElement>(id: string): T {
  const node = document.getElementById(id);
  if (!(node instanceof HTMLElement)) throw new Error(`Missing #${id}`);
  return node as T;
}

function field(id: string): HTMLInputElement | HTMLTextAreaElement {
  const node = must<HTMLInputElement | HTMLTextAreaElement>(id);
  return node;
}

function legacyCopy(text: string): boolean {
  const area = document.createElement('textarea');
  area.value = text;
  area.setAttribute('readonly', '');
  area.style.position = 'fixed';
  area.style.opacity = '0';
  document.body.append(area);
  area.focus();
  area.select();
  try {
    return document.execCommand('copy');
  } finally {
    area.remove();
  }
}

async function copyText(text: string): Promise<CopyState> {
  const clipboard =
    navigator.clipboard && window.isSecureContext ? () => navigator.clipboard.writeText(text) : undefined;
  return copyWithProviders(text, { clipboard, legacy: () => legacyCopy(text) });
}

function button(label: string, action: string, disabled = false): HTMLButtonElement {
  const node = document.createElement('button');
  node.type = 'button';
  node.className = action === 'remove' ? 'text-button' : 'builder-secondary';
  node.dataset.move = action;
  node.textContent = label;
  node.disabled = disabled;
  return node;
}

function textInput(value: string, name: string, multiline: boolean): HTMLInputElement | HTMLTextAreaElement {
  const node = multiline ? document.createElement('textarea') : document.createElement('input');
  if (node instanceof HTMLInputElement) node.type = 'text';
  if (node instanceof HTMLTextAreaElement) node.rows = 3;
  node.dataset.field = name;
  node.value = value;
  node.spellcheck = false;
  return node;
}

function labeled(label: string, control: HTMLElement): HTMLLabelElement {
  const wrap = document.createElement('label');
  wrap.className = 'field';
  wrap.append(document.createTextNode(label), control);
  return wrap;
}

function itemBar(title: string, index: number, total: number): HTMLDivElement {
  const bar = document.createElement('div');
  bar.className = 'builder-item-bar';
  const heading = document.createElement('h3');
  heading.textContent = title;
  const up = button('Move up', 'up', index === 0);
  const down = button('Move down', 'down', index === total - 1);
  const remove = button('Remove', 'remove');
  up.setAttribute('aria-label', `Move ${title} up`);
  down.setAttribute('aria-label', `Move ${title} down`);
  remove.setAttribute('aria-label', `Remove ${title}`);
  bar.append(heading, up, down, remove);
  return bar;
}

function emptyMessage(text: string): HTMLParagraphElement {
  const node = document.createElement('p');
  node.className = 'meta';
  node.textContent = text;
  return node;
}

function readRows<T>(container: HTMLElement, map: (item: HTMLElement) => T): T[] {
  return [...container.querySelectorAll<HTMLElement>('[data-item]')].map(map);
}

function valueIn(item: HTMLElement, name: string): string {
  const node = item.querySelector(`[data-field="${name}"]`);
  if (node instanceof HTMLInputElement || node instanceof HTMLTextAreaElement || node instanceof HTMLSelectElement) {
    return node.value;
  }
  return '';
}

function blankInput(date: string): PostInput {
  return {
    title: '',
    summary: '',
    date,
    updated: '',
    tool: '',
    model: '',
    category: 'image',
    tags: [],
    draft: true,
    cover: '',
    coverAlt: '',
    videoUrl: '',
    steps: [{ title: '', body: '' }],
    positivePrompt: '',
    negativePrompt: '',
    settings: [],
    tips: [],
    results: [],
    notes: '',
  };
}

function coerceStoredInput(value: Partial<PostInput> | undefined): PostInput {
  const base = blankInput(formatLocalDate(new Date()));
  if (!value) return base;
  const steps = Array.isArray(value.steps)
    ? value.steps.map((step) => ({ title: String(step?.title ?? ''), body: String(step?.body ?? '') }))
    : base.steps;
  const settings = Array.isArray(value.settings)
    ? value.settings.map((setting) => ({ label: String(setting?.label ?? ''), value: String(setting?.value ?? '') }))
    : [];
  const tips = Array.isArray(value.tips) ? value.tips.map((tip) => String(tip ?? '')) : [];
  const results = Array.isArray(value.results)
    ? value.results.map((result) => ({
        src: String(result?.src ?? ''),
        alt: String(result?.alt ?? ''),
        caption: String(result?.caption ?? ''),
        kind: result?.kind === 'video' ? 'video' : 'image',
      }))
    : [];
  return {
    ...base,
    title: String(value.title ?? ''),
    summary: String(value.summary ?? ''),
    date: typeof value.date === 'string' ? value.date : base.date,
    updated: typeof value.updated === 'string' ? value.updated : '',
    tool: String(value.tool ?? ''),
    model: String(value.model ?? ''),
    category: value.category === 'video' ? 'video' : 'image',
    tags: Array.isArray(value.tags) ? value.tags.map((tag) => String(tag ?? '')) : [],
    draft: value.draft !== false,
    cover: String(value.cover ?? ''),
    coverAlt: String(value.coverAlt ?? ''),
    videoUrl: String(value.videoUrl ?? ''),
    steps,
    positivePrompt: String(value.positivePrompt ?? ''),
    negativePrompt: String(value.negativePrompt ?? ''),
    settings,
    tips,
    results,
    notes: String(value.notes ?? ''),
  };
}

export function mountPostBuilder() {
  const form = must<HTMLFormElement>('post-builder');
  const status = must<HTMLParagraphElement>('builder-status');
  const errors = must<HTMLDivElement>('builder-errors');
  const preview = must<HTMLDivElement>('builder-preview');
  const source = must<HTMLPreElement>('builder-source');
  const filenamePreview = must<HTMLParagraphElement>('filename-preview');
  const videoHelp = must<HTMLParagraphElement>('video-help');
  const visibilityLive = must<HTMLParagraphElement>('visibility-live');
  const stepsField = must<HTMLDivElement>('steps-field');
  const settingsField = must<HTMLDivElement>('settings-field');
  const tipsField = must<HTMLDivElement>('tips-field');
  const resultsField = must<HTMLDivElement>('results-field');
  const restoreButton = must<HTMLButtonElement>('restore-local');
  let filenameEdited = false;
  let cleanSnapshot = '';
  let showErrors = false;
  let latestMarkdown = '';
  let latestPreview = '';

  function readSteps(): Step[] {
    return readRows(stepsField, (item) => ({ title: valueIn(item, 'title'), body: valueIn(item, 'body') }));
  }

  function readSettings(): Setting[] {
    return readRows(settingsField, (item) => ({ label: valueIn(item, 'label'), value: valueIn(item, 'value') }));
  }

  function readTips(): string[] {
    return readRows(tipsField, (item) => valueIn(item, 'text'));
  }

  function readResults(): Result[] {
    return readRows(resultsField, (item) => ({
      src: valueIn(item, 'src'),
      alt: valueIn(item, 'alt'),
      caption: valueIn(item, 'caption'),
      kind: valueIn(item, 'kind') === 'video' ? 'video' : 'image',
    }));
  }

  function renderSteps(steps: Step[]) {
    stepsField.replaceChildren();
    if (steps.length === 0) stepsField.append(emptyMessage('No steps yet.'));
    steps.forEach((step, index) => {
      const item = document.createElement('div');
      item.className = 'builder-item';
      item.dataset.item = 'step';
      const title = textInput(step.title, 'title', false);
      const body = textInput(step.body, 'body', true);
      item.append(itemBar(`Step ${index + 1}`, index, steps.length), labeled('Step title', title), labeled('What the viewer does', body));
      stepsField.append(item);
    });
  }

  function renderSettings(settings: Setting[]) {
    settingsField.replaceChildren();
    if (settings.length === 0) settingsField.append(emptyMessage('No settings yet.'));
    settings.forEach((setting, index) => {
      const item = document.createElement('div');
      item.className = 'builder-item';
      item.dataset.item = 'setting';
      item.append(
        itemBar(`Setting ${index + 1}`, index, settings.length),
        labeled('Label', textInput(setting.label, 'label', false)),
        labeled('Value', textInput(setting.value, 'value', false)),
      );
      settingsField.append(item);
    });
  }

  function renderTips(tips: string[]) {
    tipsField.replaceChildren();
    if (tips.length === 0) tipsField.append(emptyMessage('No tips yet.'));
    tips.forEach((tip, index) => {
      const item = document.createElement('div');
      item.className = 'builder-item';
      item.dataset.item = 'tip';
      const input = textInput(tip, 'text', true);
      item.append(itemBar(`Tip ${index + 1}`, index, tips.length), labeled('Tip', input));
      tipsField.append(item);
    });
  }

  function renderResults(results: Result[]) {
    resultsField.replaceChildren();
    if (results.length === 0) resultsField.append(emptyMessage('No result files yet.'));
    results.forEach((result, index) => {
      const item = document.createElement('div');
      item.className = 'builder-item';
      item.dataset.item = 'result';
      const kind = document.createElement('select');
      kind.dataset.field = 'kind';
      for (const optionKind of ['image', 'video'] as const) {
        const option = document.createElement('option');
        option.value = optionKind;
        option.textContent = optionKind === 'image' ? 'Image file' : 'Video file';
        option.selected = result.kind === optionKind;
        kind.append(option);
      }
      const kindLabel = labeled('File type', kind);
      item.append(
        itemBar(`Result ${index + 1}`, index, results.length),
        labeled('Path', textInput(result.src, 'src', false)),
        labeled('Description', textInput(result.alt, 'alt', false)),
        labeled('Caption', textInput(result.caption, 'caption', false)),
        kindLabel,
      );
      resultsField.append(item);
    });
  }

  function selectedCategory(): ResultKind {
    const selected = form.querySelector('input[name="category"]:checked');
    return selected instanceof HTMLInputElement && selected.value === 'video' ? 'video' : 'image';
  }

  function selectedDraft(): boolean {
    const selected = form.querySelector('input[name="draft"]:checked');
    return !(selected instanceof HTMLInputElement && selected.value === 'false');
  }

  function readInput(): PostInput {
    return {
      title: field('title').value,
      summary: field('summary').value,
      date: field('date').value,
      updated: field('updated').value,
      tool: field('tool').value,
      model: field('model').value,
      category: selectedCategory(),
      tags: field('tags').value.split('\n'),
      draft: selectedDraft(),
      cover: field('cover').value,
      coverAlt: field('cover-alt').value,
      videoUrl: field('video-url').value,
      steps: readSteps(),
      positivePrompt: field('positive-prompt').value,
      negativePrompt: field('negative-prompt').value,
      settings: readSettings(),
      tips: readTips(),
      results: readResults(),
      notes: field('notes').value,
    };
  }

  function filenameValue(): string {
    if (!filenameEdited) return slugFromTitle(field('title').value);
    return field('filename').value.trim() || slugFromTitle(field('title').value);
  }

  function applyInput(input: PostInput, filename: string, edited: boolean) {
    field('title').value = input.title;
    field('summary').value = input.summary;
    field('date').value = input.date;
    field('updated').value = input.updated;
    field('tool').value = input.tool;
    field('model').value = input.model;
    field('tags').value = input.tags.join('\n');
    field('cover').value = input.cover;
    field('cover-alt').value = input.coverAlt;
    field('video-url').value = input.videoUrl;
    field('positive-prompt').value = input.positivePrompt;
    field('negative-prompt').value = input.negativePrompt;
    field('notes').value = input.notes;
    const category = form.querySelector(`input[name="category"][value="${input.category}"]`);
    if (category instanceof HTMLInputElement) category.checked = true;
    const draft = form.querySelector(`input[name="draft"][value="${input.draft ? 'true' : 'false'}"]`);
    if (draft instanceof HTMLInputElement) draft.checked = true;
    filenameEdited = edited;
    field('filename').value = edited ? filename : slugFromTitle(input.title);
    renderSteps(input.steps.length ? input.steps : [{ title: '', body: '' }]);
    renderSettings(input.settings);
    renderTips(input.tips);
    renderResults(input.results);
  }

  function snapshot(): string {
    return JSON.stringify({ input: readInput(), filename: field('filename').value, filenameEdited });
  }

  function dirty(): boolean {
    return snapshot() !== cleanSnapshot;
  }

  function setStatus(message: string, tone: 'ok' | 'warn' | '') {
    status.textContent = message;
    status.dataset.tone = tone;
  }

  function fieldForError(message: string): string | null {
    if (message.startsWith('Enter a title') || message.startsWith('Use a title')) return 'title';
    if (message.startsWith('Enter a summary') || message.startsWith('Use a summary')) return 'summary';
    if (message.startsWith('Enter a date') || message.startsWith('Enter a real date')) return 'date';
    if (message.startsWith('Enter a real updated')) return 'updated';
    if (message.startsWith('Enter the app')) return 'tool';
    if (message.startsWith('Choose Image')) return 'category-field';
    if (message.startsWith('Cover image')) return 'cover';
    if (message.startsWith('Describe the cover')) return 'cover-alt';
    if (message.startsWith('Enter a YouTube')) return 'video-url';
    if (message.startsWith('The positive')) return 'positive-prompt';
    if (message.startsWith('The negative')) return 'negative-prompt';
    if (message.startsWith('The notes')) return 'notes';
    if (message.startsWith('Step')) return 'steps-field';
    if (message.startsWith('Setting')) return 'settings-field';
    if (message.startsWith('Result')) return 'results-field';
    if (message.startsWith('Use 50 topics')) return 'tags';
    return null;
  }

  function renderErrors(messages: string[]) {
    errors.replaceChildren();
    if (!showErrors || messages.length === 0) {
      errors.hidden = true;
      return;
    }
    const heading = document.createElement('h2');
    heading.textContent = messages.length === 1 ? 'Fix this before downloading' : 'Fix these before downloading';
    const list = document.createElement('ul');
    for (const message of messages) {
      const item = document.createElement('li');
      const target = fieldForError(message);
      if (target) {
        const link = document.createElement('a');
        link.href = `#${target}`;
        link.textContent = message;
        item.append(link);
      } else item.textContent = message;
      list.append(item);
    }
    errors.append(heading, list);
    errors.hidden = false;
  }

  function renderPreview(input: PostInput) {
    preview.replaceChildren();
    const article = document.createElement('article');
    const badges = document.createElement('p');
    badges.className = 'badges';
    const category = document.createElement('span');
    category.className = 'badge';
    category.textContent = input.category === 'video' ? 'Video' : 'Image';
    const draft = document.createElement('span');
    draft.className = 'badge';
    draft.textContent = input.draft ? 'Draft' : 'draft: false';
    badges.append(category, draft);
    const title = document.createElement('h3');
    title.textContent = input.title.trim();
    const summary = document.createElement('p');
    summary.textContent = input.summary.trim();
    const meta = document.createElement('p');
    meta.className = 'meta';
    meta.textContent = [input.date.trim(), input.tool.trim(), input.model.trim() ? `Model ${input.model.trim()}` : '']
      .filter(Boolean)
      .join(' · ');
    article.append(badges, title, summary, meta);
    const tags = input.tags.map((tag) => tag.trim()).filter(Boolean);
    if (tags.length) {
      const list = document.createElement('ul');
      list.className = 'tag-list';
      for (const tag of tags) {
        const item = document.createElement('li');
        item.textContent = tag;
        list.append(item);
      }
      article.append(list);
    }
    const cover = safeMediaSrc(input.cover, 'cover');
    if (cover) {
      const figure = document.createElement('figure');
      figure.className = 'post-cover';
      const image = document.createElement('img');
      image.src = cover;
      image.alt = input.coverAlt.trim();
      figure.append(image);
      article.append(figure);
    }
    const video = input.videoUrl.trim();
    const videoEmbed = youtubeId(video);
    if (videoEmbed) {
      const embed = document.createElement('div');
      embed.className = 'embed';
      const frame = document.createElement('iframe');
      frame.src = youtubeEmbedUrl(videoEmbed);
      frame.title = `Video: ${input.title.trim()}`;
      frame.loading = 'lazy';
      frame.referrerPolicy = 'strict-origin-when-cross-origin';
      frame.setAttribute('allowfullscreen', '');
      embed.append(frame);
      article.append(embed);
    }
    const steps = input.steps.filter((step) => step.title.trim() && step.body.trim());
    if (steps.length) {
      const heading = document.createElement('h3');
      heading.textContent = 'Steps';
      const list = document.createElement('ol');
      list.className = 'steps';
      for (const step of steps) {
        const item = document.createElement('li');
        const copy = document.createElement('div');
        const stepTitle = document.createElement('h3');
        stepTitle.textContent = step.title.trim();
        const stepBody = document.createElement('p');
        stepBody.textContent = step.body.trim();
        copy.append(stepTitle, stepBody);
        item.append(copy);
        list.append(item);
      }
      article.append(heading, list);
    }
    for (const [label, text] of [
      ['Positive prompt', input.positivePrompt],
      ['Negative prompt', input.negativePrompt],
    ] as const) {
      if (!text.trim()) continue;
      const block = document.createElement('div');
      block.className = 'prompt';
      const bar = document.createElement('div');
      bar.className = 'prompt-bar';
      const heading = document.createElement('h3');
      heading.textContent = label;
      bar.append(heading);
      const pre = document.createElement('pre');
      pre.textContent = text.replace(/^\n+/, '').replace(/\n+$/, '');
      block.append(bar, pre);
      article.append(block);
    }
    const settings = input.settings.filter((setting) => setting.label.trim() && setting.value.trim());
    if (settings.length) {
      const heading = document.createElement('h3');
      heading.textContent = 'Settings';
      const table = document.createElement('table');
      table.className = 'settings';
      const body = document.createElement('tbody');
      for (const setting of settings) {
        const row = document.createElement('tr');
        const cellLabel = document.createElement('th');
        cellLabel.scope = 'row';
        cellLabel.textContent = setting.label.trim();
        const cellValue = document.createElement('td');
        cellValue.textContent = setting.value.trim();
        row.append(cellLabel, cellValue);
        body.append(row);
      }
      table.append(body);
      article.append(heading, table);
    }
    const tips = input.tips.map((tip) => tip.trim()).filter(Boolean);
    if (tips.length) {
      const heading = document.createElement('h3');
      heading.textContent = 'Tips';
      const list = document.createElement('ul');
      list.className = 'tips';
      for (const tip of tips) {
        const item = document.createElement('li');
        item.textContent = tip;
        list.append(item);
      }
      article.append(heading, list);
    }
    const results = input.results.filter((result) => result.src.trim() || result.alt.trim());
    if (results.length) {
      const heading = document.createElement('h3');
      heading.textContent = 'Result media';
      article.append(heading);
      for (const result of results) {
        const figure = document.createElement('figure');
        const src = safeMediaSrc(result.src, result.kind);
        if (src && result.kind === 'video') {
          const videoNode = document.createElement('video');
          videoNode.controls = true;
          videoNode.preload = 'metadata';
          videoNode.src = src;
          figure.append(videoNode);
        } else if (src) {
          const image = document.createElement('img');
          image.src = src;
          image.alt = result.alt.trim();
          figure.append(image);
        }
        const caption = document.createElement('figcaption');
        caption.textContent = [result.alt.trim(), result.caption.trim()].filter(Boolean).join(' ');
        figure.append(caption);
        article.append(figure);
      }
    }
    if (input.notes.trim()) {
      const heading = document.createElement('h3');
      heading.textContent = 'Notes';
      const pre = document.createElement('pre');
      pre.className = 'builder-source';
      pre.textContent = input.notes;
      article.append(heading, pre);
    }
    preview.append(article);
  }

  function refresh() {
    const input = readInput();
    const name = safeMarkdownBasename(filenameValue());
    filenamePreview.textContent = `Downloads as ${name}. The name uses letters, numbers, and hyphens.`;
    const canonical = canonicalYoutubeUrl(input.videoUrl);
    if (input.videoUrl.trim() && canonical === null) {
      videoHelp.textContent = 'That is not a YouTube link. Paste a watch link, a Short, or a youtu.be link, or clear the field.';
    } else if (canonical && canonical !== input.videoUrl.trim()) {
      videoHelp.textContent = `The file will store ${canonical}. A Short or youtu.be link is rewritten to a watch link.`;
    } else {
      videoHelp.textContent =
        'Optional. Paste a watch link, a Short, or a youtu.be link. The file stores a standard watch link. This is the lesson, not the result category above.';
    }
    visibilityLive.textContent = input.draft
      ? ''
      : 'The file will say draft: false. You still need to commit it before viewers can see it. This page does not publish it.';
    const built = buildPostFile(input, filenameValue());
    renderErrors(built.errors);
    if (built.errors.length > 0) {
      latestMarkdown = '';
      latestPreview = '';
      source.textContent = showErrors ? 'The Markdown file is not ready yet.' : 'The Markdown file appears here after the required fields are filled in.';
      if (!showErrors) preview.replaceChildren(emptyMessage('Fill in the title, summary, date, and app to preview the file.'));
      return;
    }
    latestMarkdown = built.markdown;
    latestPreview = built.preview || previewPlainText(input);
    source.textContent = built.markdown;
    renderPreview(input);
  }

  function markClean() {
    cleanSnapshot = snapshot();
  }

  function download() {
    showErrors = true;
    refresh();
    if (!latestMarkdown) {
      errors.focus();
      setStatus('The file is not ready yet. Fix the messages above. Nothing was downloaded.', 'warn');
      return;
    }
    const name = safeMarkdownBasename(filenameValue());
    const blob = new Blob([latestMarkdown], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = name;
    link.rel = 'noopener';
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    markClean();
    setStatus(`Downloaded ${name}. Commit it to content/posts. This page did not publish it.`, 'ok');
  }

  async function copy(kind: 'source' | 'preview', buttonNode: HTMLButtonElement) {
    showErrors = true;
    refresh();
    const text = kind === 'source' ? latestMarkdown : latestPreview;
    const name = kind === 'source' ? 'markdown file' : 'preview';
    const state = await copyText(text);
    buttonNode.dataset.state = state;
    buttonNode.textContent = state === 'success' ? 'Copied' : copyLabel(state);
    buttonNode.setAttribute('aria-label', accessibleCopyName(state, name));
    if (state === 'success') {
      setStatus(kind === 'source' ? 'Copied the Markdown file.' : 'Copied the preview text.', 'ok');
      if (kind === 'source') markClean();
    } else if (!text) {
      errors.focus();
      setStatus('Nothing was copied. Fix the messages above first.', 'warn');
    } else setStatus(copyStatusMessage('failure'), 'warn');
    window.setTimeout(() => {
      buttonNode.dataset.state = 'idle';
      buttonNode.textContent = kind === 'source' ? 'Copy Markdown' : 'Copy preview';
      buttonNode.setAttribute('aria-label', kind === 'source' ? 'Copy Markdown' : 'Copy preview');
    }, 2000);
  }

  function resetForm() {
    if (dirty() && !window.confirm('Reset the form? The text on this page will be cleared. A file you already downloaded stays on your computer.')) {
      return;
    }
    showErrors = false;
    applyInput(blankInput(formatLocalDate(new Date())), '', false);
    setStatus('The form is clear.', '');
    refresh();
    markClean();
    field('title').focus();
  }

  function storageAvailable(): Storage | null {
    try {
      return window.localStorage;
    } catch {
      return null;
    }
  }

  function refreshRestore() {
    const storage = storageAvailable();
    restoreButton.disabled = !storage || !storage.getItem(STORAGE_KEY);
  }

  function saveLocal() {
    const storage = storageAvailable();
    if (!storage) {
      setStatus('This browser did not allow saving. Download the Markdown file instead.', 'warn');
      return;
    }
    const payload = JSON.stringify({
      version: 1,
      input: readInput(),
      filename: field('filename').value,
      filenameEdited,
    });
    storage.setItem(STORAGE_KEY, payload);
    refreshRestore();
    setStatus('Saved in this browser only. It is not on the site.', 'ok');
  }

  function restoreLocal() {
    const storage = storageAvailable();
    const raw = storage?.getItem(STORAGE_KEY);
    if (!raw) {
      setStatus('There is no saved form in this browser.', 'warn');
      refreshRestore();
      return;
    }
    if (dirty() && !window.confirm('Replace the form with the copy saved in this browser? The text currently in the form will be cleared.')) {
      return;
    }
    try {
      const parsed = JSON.parse(raw) as { input?: PostInput; filename?: string; filenameEdited?: boolean };
      if (!parsed.input || typeof parsed.input !== 'object') throw new Error('empty');
      const input = coerceStoredInput(parsed.input);
      applyInput(
        input,
        typeof parsed.filename === 'string' ? parsed.filename : slugFromTitle(input.title),
        parsed.filenameEdited === true,
      );
      showErrors = false;
      refresh();
      markClean();
      setStatus('Restored the form saved in this browser. It is still not published.', 'ok');
    } catch {
      setStatus('The saved form could not be read. You can forget it and start again.', 'warn');
    }
  }

  function forgetLocal() {
    const storage = storageAvailable();
    storage?.removeItem(STORAGE_KEY);
    refreshRestore();
    setStatus('Forgot the form saved in this browser. The page you are editing is unchanged.', '');
  }

  async function importFile(file: File) {
    if (file.size > 1_000_000) {
      setStatus('That file is too large for this form.', 'warn');
      return;
    }
    const text = await file.text();
    const parsed = parsePostMarkdown(text);
    if (!parsed.ok) {
      setStatus(parsed.error, 'warn');
      return;
    }
    if (dirty() && !window.confirm('Replace the form with this Markdown file? The text currently in the form will be cleared.')) {
      return;
    }
    const name = safeMarkdownBasename(file.name).replace(/\.md$/i, '');
    applyInput(parsed.input, name, true);
    showErrors = false;
    refresh();
    markClean();
    const extra = parsed.warnings.length ? ` ${parsed.warnings.join(' ')}` : '';
    setStatus(`Imported ${file.name}.${extra} Review it, then download. This page did not publish it.`, parsed.warnings.length ? 'warn' : 'ok');
  }

  function onListClick(container: HTMLElement, read: () => unknown[], write: (items: never[]) => void) {
    container.addEventListener('click', (event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const control = target.closest('button[data-move]');
      if (!(control instanceof HTMLButtonElement)) return;
      const item = control.closest('[data-item]');
      if (!(item instanceof HTMLElement)) return;
      const items = read() as unknown[];
      const index = [...container.querySelectorAll('[data-item]')].indexOf(item);
      if (index < 0) return;
      const action = control.dataset.move;
      if (action === 'remove') items.splice(index, 1);
      if (action === 'up' && index > 0) {
        const [row] = items.splice(index, 1);
        items.splice(index - 1, 0, row);
      }
      if (action === 'down' && index < items.length - 1) {
        const [row] = items.splice(index, 1);
        items.splice(index + 1, 0, row);
      }
      write(items as never[]);
      refresh();
    });
  }

  form.addEventListener('submit', (event) => event.preventDefault());
  form.addEventListener('input', (event) => {
    const target = event.target;
    if (target instanceof HTMLInputElement && target.id === 'filename') filenameEdited = true;
    if (target instanceof HTMLInputElement && target.id === 'title' && !filenameEdited) {
      field('filename').value = slugFromTitle(target.value);
    }
    refresh();
  });
  form.addEventListener('change', () => refresh());
  form.addEventListener('click', (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const control = target.closest('button[data-action]');
    if (!(control instanceof HTMLButtonElement)) return;
    const action = control.dataset.action;
    if (action === 'download') download();
    if (action === 'copy-source') void copy('source', control);
    if (action === 'copy-preview') void copy('preview', control);
    if (action === 'reset') resetForm();
    if (action === 'save-local') saveLocal();
    if (action === 'restore-local') restoreLocal();
    if (action === 'forget-local') forgetLocal();
  });
  must<HTMLButtonElement>('add-step').addEventListener('click', () => {
    const steps = readSteps();
    steps.push({ title: '', body: '' });
    renderSteps(steps);
    stepsField.querySelector<HTMLElement>('[data-item]:last-child input')?.focus();
    refresh();
  });
  must<HTMLButtonElement>('add-setting').addEventListener('click', () => {
    const settings = readSettings();
    settings.push({ label: '', value: '' });
    renderSettings(settings);
    settingsField.querySelector<HTMLElement>('[data-item]:last-child input')?.focus();
    refresh();
  });
  must<HTMLButtonElement>('add-tip').addEventListener('click', () => {
    const tips = readTips();
    tips.push('');
    renderTips(tips);
    tipsField.querySelector<HTMLElement>('[data-item]:last-child textarea')?.focus();
    refresh();
  });
  must<HTMLButtonElement>('add-result').addEventListener('click', () => {
    const results = readResults();
    results.push({ src: '', alt: '', caption: '', kind: 'image' });
    renderResults(results);
    resultsField.querySelector<HTMLElement>('[data-item]:last-child input')?.focus();
    refresh();
  });
  onListClick(stepsField, readSteps, renderSteps as (items: never[]) => void);
  onListClick(settingsField, readSettings, renderSettings as (items: never[]) => void);
  onListClick(tipsField, readTips, renderTips as (items: never[]) => void);
  onListClick(resultsField, readResults, renderResults as (items: never[]) => void);
  must<HTMLInputElement>('import-file').addEventListener('change', (event) => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) return;
    const file = target.files?.[0];
    target.value = '';
    if (file) void importFile(file);
  });
  window.addEventListener('beforeunload', (event) => {
    if (!dirty()) return;
    event.preventDefault();
    event.returnValue = '';
  });

  applyInput(blankInput(formatLocalDate(new Date())), '', false);
  refresh();
  markClean();
  refreshRestore();
}
