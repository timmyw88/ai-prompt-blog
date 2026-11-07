import {
  accessibleCopyName,
  copyLabel,
  copyStatusMessage,
  copyWithProviders,
  textToCopy,
  type CopyState,
} from '../lib/copy';

function legacyCopy(text: string): boolean {
  const area = document.createElement('textarea');
  area.value = text;
  area.setAttribute('readonly', '');
  area.style.position = 'fixed';
  area.style.inset = '0';
  area.style.opacity = '0';
  area.style.pointerEvents = 'none';
  document.body.appendChild(area);
  area.focus();
  area.select();
  area.setSelectionRange(0, area.value.length);
  try {
    return document.execCommand('copy');
  } finally {
    area.remove();
  }
}

async function copyText(text: string): Promise<CopyState> {
  const clipboard =
    navigator.clipboard && window.isSecureContext
      ? () => navigator.clipboard.writeText(text)
      : undefined;
  return copyWithProviders(text, {
    clipboard,
    legacy: () => legacyCopy(text),
  });
}

function applyState(button: HTMLButtonElement, status: HTMLElement | null, state: CopyState) {
  const name = button.dataset.copyName || 'prompt';
  button.dataset.state = state;
  button.textContent = copyLabel(state);
  button.setAttribute('aria-label', accessibleCopyName(state, name));
  if (status) {
    status.dataset.state = state;
    status.textContent = copyStatusMessage(state);
  }
}

function labelFor(pre: HTMLElement): string {
  const code = pre.querySelector('code');
  const className = code?.className ?? '';
  if (/(^|\s)language-(text|prompt|txt)(\s|$)/.test(className) || className.trim() === '') {
    return 'Prompt';
  }
  return 'Code';
}

function enhanceFencedBlocks() {
  const blocks = document.querySelectorAll('.prose pre');
  blocks.forEach((node, index) => {
    if (!(node instanceof HTMLElement)) return;
    if (node.closest('.prompt')) return;
    const code = node.querySelector('code');
    const source = code instanceof HTMLElement ? code : node;
    if (!source.id) source.id = `fenced-block-${index + 1}`;
    source.dataset.copyMode = 'fenced';
    const label = labelFor(node);
    const wrapper = document.createElement('div');
    wrapper.className = 'prompt';
    wrapper.dataset.copyReady = 'true';
    const bar = document.createElement('div');
    bar.className = 'prompt-bar';
    const heading = document.createElement('h3');
    heading.id = `${source.id}-label`;
    heading.textContent = label;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'copy-button';
    button.dataset.copyFor = source.id;
    button.dataset.copyName = label.toLowerCase();
    button.dataset.state = 'idle';
    button.textContent = 'Copy';
    button.setAttribute('aria-label', `Copy ${label.toLowerCase()}`);
    bar.append(heading, button);
    const status = document.createElement('p');
    status.className = 'copy-status';
    status.dataset.copyStatusFor = source.id;
    status.setAttribute('role', 'status');
    node.parentNode?.insertBefore(wrapper, node);
    wrapper.append(bar, node, status);
  });
}

function initCopyButtons() {
  if (document.documentElement.dataset.copyBound === 'true') return;
  document.documentElement.dataset.copyBound = 'true';
  enhanceFencedBlocks();
  document.addEventListener('click', async (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const button = target.closest('button[data-copy-for]');
    if (!(button instanceof HTMLButtonElement)) return;
    const id = button.dataset.copyFor;
    const source = id ? document.getElementById(id) : null;
    const statusNode = id
      ? document.querySelector(`[data-copy-status-for="${CSS.escape(id)}"]`)
      : null;
    const status = statusNode instanceof HTMLElement ? statusNode : null;
    if (!(source instanceof HTMLElement)) {
      applyState(button, status, 'failure');
      return;
    }
    const mode = source.dataset.copyMode === 'fenced' ? 'fenced' : 'exact';
    const state = await copyText(textToCopy(source.textContent ?? '', mode));
    applyState(button, status, state);
  });
}

initCopyButtons();
