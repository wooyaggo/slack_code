import { spawn } from 'child_process';

const action = process.argv[2];
const processName = 'slack-code-main';

if (!action) {
  console.error('사용법: node scripts/manage.js <stop|restart|logs>');
  process.exit(1);
}

const args = ['logs'].includes(action)
  ? ['logs', processName]
  : [action, processName];

const child = spawn('pm2', args, {
  stdio: 'inherit',
});

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 1);
});

child.on('error', (error) => {
  console.error(`[manage] pm2 실행 실패: ${error.message}`);
  process.exit(1);
});
