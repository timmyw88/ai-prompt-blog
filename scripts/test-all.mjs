import { spawnSync } from 'node:child_process';
import { readdirSync, unlinkSync } from 'node:fs';

function removeFixture() {
  try {
    unlinkSync('content/posts/post-builder-roundtrip.md');
  } catch {
    // The fixture is only present while the production build is proving the loader.
  }
}

function run(command, args, env = {}) {
  const result = spawnSync(command, args, {
    stdio: 'inherit',
    env: { ...process.env, ...env },
  });
  if (result.status !== 0) {
    removeFixture();
    process.exit(result.status ?? 1);
  }
}

const tests = readdirSync('tests')
  .filter((name) => name.endsWith('.test.ts'))
  .map((name) => `tests/${name}`);

run('node', ['--experimental-strip-types', '--test', ...tests]);
removeFixture();
run('node', ['--experimental-strip-types', 'scripts/write-roundtrip-fixture.ts']);
run('npm', ['run', 'build']);
run('node', ['scripts/verify-dist.mjs', '--base', '/']);
run('npm', ['run', 'build'], {
  BASE_PATH: '/prompt-ledger',
  SITE: 'https://example.github.io',
});
run('node', ['scripts/verify-dist.mjs', '--base', '/prompt-ledger/']);
run('npm', ['run', 'build']);
removeFixture();
