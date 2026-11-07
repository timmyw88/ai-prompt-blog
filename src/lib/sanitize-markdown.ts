import { isSafeLink, isSitePath } from './paths.ts';
import { joinBase } from './urls.ts';

type HastNode = {
  type?: string;
  tagName?: string;
  value?: string;
  properties?: Record<string, unknown>;
};

type Ctx = {
  removeNode: (node: HastNode) => void;
  replaceNode: (node: HastNode, next: HastNode | HastNode[]) => void;
  setProperty: (node: HastNode, key: string, value: unknown) => void;
  textContent?: (node: HastNode) => string;
};

const DROP = new Set([
  'script',
  'style',
  'iframe',
  'object',
  'embed',
  'link',
  'meta',
  'base',
  'form',
  'svg',
  'math',
  'noscript',
  'canvas',
  'video',
  'audio',
  'textarea',
  'select',
  'button',
  'frame',
  'frameset',
  'applet',
  'foreignobject',
]);

const ALLOWED = new Set([
  'p',
  'br',
  'hr',
  'blockquote',
  'strong',
  'em',
  'del',
  's',
  'a',
  'ul',
  'ol',
  'li',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'pre',
  'code',
  'img',
  'table',
  'thead',
  'tbody',
  'tfoot',
  'tr',
  'th',
  'td',
  'input',
  'span',
  'sup',
  'sub',
  'kbd',
  'mark',
  'abbr',
]);

const ALLOWED_PROPS: Record<string, Set<string>> = {
  a: new Set(['href']),
  img: new Set(['src', 'alt']),
  code: new Set(['className']),
  pre: new Set(['className']),
  span: new Set(['className']),
  ul: new Set(['className']),
  ol: new Set(['className']),
  li: new Set(['className']),
  input: new Set(['type', 'checked', 'disabled']),
  th: new Set(['colSpan', 'rowSpan']),
  td: new Set(['colSpan', 'rowSpan']),
  h1: new Set(['id']),
  h2: new Set(['id']),
  h3: new Set(['id']),
  h4: new Set(['id']),
  h5: new Set(['id']),
  h6: new Set(['id']),
};

function visitElement(node: HastNode, ctx: Ctx, base: string) {
  const tag = String(node.tagName || '').toLowerCase();
  if (DROP.has(tag)) {
    ctx.removeNode(node);
    return;
  }
  if (!ALLOWED.has(tag)) {
    const text = ctx.textContent?.(node) ?? '';
    if (text) ctx.replaceNode(node, { type: 'text', value: text });
    else ctx.removeNode(node);
    return;
  }

  const props = node.properties ?? {};
  const allowed = ALLOWED_PROPS[tag] ?? new Set<string>();
  for (const key of Object.keys(props)) {
    if (!allowed.has(key) || key.toLowerCase().startsWith('on')) {
      ctx.setProperty(node, key, null);
    }
  }

  if (tag === 'a') {
    const href = props.href;
    if (!isSafeLink(href)) ctx.setProperty(node, 'href', null);
    else if (typeof href === 'string' && isSitePath(href)) {
      ctx.setProperty(node, 'href', joinBase(base, href));
    }
  }

  if (tag === 'img') {
    if (!isSitePath(props.src)) {
      ctx.removeNode(node);
      return;
    }
    ctx.setProperty(node, 'src', joinBase(base, String(props.src)));
    if (typeof props.alt !== 'string') ctx.setProperty(node, 'alt', '');
  }

  if (tag === 'input') {
    const type = String(props.type ?? '').toLowerCase();
    if (type !== 'checkbox') {
      ctx.removeNode(node);
      return;
    }
    const checked = Boolean(props.checked);
    for (const key of Object.keys(props)) ctx.setProperty(node, key, null);
    ctx.setProperty(node, 'type', 'checkbox');
    ctx.setProperty(node, 'disabled', true);
    if (checked) ctx.setProperty(node, 'checked', true);
  }
}

function escapeRaw(node: HastNode, ctx: Ctx) {
  ctx.replaceNode(node, { type: 'text', value: typeof node.value === 'string' ? node.value : '' });
}

function remove(node: HastNode, ctx: Ctx) {
  ctx.removeNode(node);
}

export function createSanitizePlugin(base = '/') {
  const activeBase = base || '/';
  return {
    name: 'sanitize-markdown',
    raw: escapeRaw,
    comment: remove,
    doctype: remove,
    mdxJsxFlowElement: { filter: [] as string[], visit: remove },
    mdxJsxTextElement: { filter: [] as string[], visit: remove },
    mdxFlowExpression: remove,
    mdxTextExpression: remove,
    mdxjsEsm: remove,
    element: {
      filter: [] as string[],
      visit(node: HastNode, ctx: Ctx) {
        visitElement(node, ctx, activeBase);
      },
    },
  };
}
