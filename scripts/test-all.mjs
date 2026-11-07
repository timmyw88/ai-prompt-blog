import { spawnSync } from 'node:child_process';
import { readdirSync } from 'node:fs';

function run(command, args, env = {}) {
  const result = spawnSync(command, args, {
    stdio: 'inherit',
    env: { ...process.env, ...env },
  });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

const tests = readdirSync('tests')
  .filter((name) => name.endsWith('.test.ts'))
  .map((name) => `tests/${name}`);

run('node', ['--experimental-strip-types', '--test', ...tests]);
run('npm', ['run', 'build']);
run('node', ['scripts/verify-dist.mjs', '--base', '/']);
run('npm', ['run', 'build'], {
  BASE_PATH: '/prompt-ledger',
  SITE: 'https://example.github.io',
});
run('node', ['scripts/verify-dist.mjs', '--base', '/prompt-ledger/']);
run('npm', ['run', 'build']);
