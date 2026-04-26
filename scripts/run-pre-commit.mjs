import { spawnSync } from 'node:child_process';

function runStep(label, args) {
  console.log(`${label}...`);

  const result = process.platform === 'win32'
    ? spawnSync(process.env.comspec || 'cmd.exe', ['/d', '/s', '/c', ['npm.cmd', ...args].join(' ')], {
        stdio: 'inherit',
        shell: false,
      })
    : spawnSync('npm', args, {
        stdio: 'inherit',
        shell: false,
      });

  if (result.error) {
    throw result.error;
  }

  if (typeof result.status === 'number' && result.status !== 0) {
    process.exit(result.status);
  }

  if (result.signal) {
    process.kill(process.pid, result.signal);
  }
}

runStep('Running unit tests', ['run', 'test']);
runStep('Running UI tests', ['run', 'test:ui']);
