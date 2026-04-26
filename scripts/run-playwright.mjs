import { spawn } from 'node:child_process';
import path from 'node:path';

const env = { ...process.env };

// Some shells export both NO_COLOR and FORCE_COLOR, which makes Node print
// repetitive warnings during Playwright runs. Prefer FORCE_COLOR in tests.
if (env.FORCE_COLOR && env.NO_COLOR) {
  delete env.NO_COLOR;
}

const playwrightCli = path.join(process.cwd(), 'node_modules', 'playwright', 'cli.js');

const child = spawn(process.execPath, [playwrightCli, 'test', ...process.argv.slice(2)], {
  cwd: process.cwd(),
  env,
  stdio: 'inherit',
});

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 1);
});
