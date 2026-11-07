import assert from 'node:assert/strict';
import test from 'node:test';
import { markdownToHtml } from 'satteri';
import { createSanitizePlugin } from '../src/lib/sanitize-markdown.ts';

async function render(source: string): Promise<string> {
  const rendered = await markdownToHtml(source, {
    hastPlugins: [createSanitizePlugin()],
    features: { gfm: true, smartPunctuation: false },
  });
  return rendered.html;
}

test('raw HTML is escaped and unsafe URLs are removed', async () => {
  const html = await render(`Hello **there**

<script>alert(1)</script>

<img src=x onerror="alert(1)">

[ok](https://example.com)

[bad](javascript:alert(1))

![local](/media/a.svg)

![remote](https://images.example/a.jpg)

<iframe src="https://evil.example"></iframe>

<p onclick="alert(1)">hi</p>

- [x] done

\`\`\`text
  keep

spaces
\`\`\`
`);
  assert.doesNotMatch(html, /<script[\s>]/i);
  assert.doesNotMatch(html, /<\w[^>]*\son(?:error|click)=/i);
  assert.doesNotMatch(html, /javascript:/i);
  assert.doesNotMatch(html, /<iframe/i);
  assert.match(html, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
  assert.match(html, /&lt;img src=x onerror="alert\(1\)"&gt;/);
  assert.match(html, /href="https:\/\/example\.com"/);
  assert.match(html, /src="\/media\/a\.svg"/);
  assert.doesNotMatch(html, /images\.example/);
  assert.match(html, /type="checkbox"/);
  assert.match(html, /keep/);
});
