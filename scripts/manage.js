import { spawn } from 'child_process';

const action = process.argv[2];
const channelId = process.argv[3];

if (!action) {
  console.error('사용법: node scripts/manage.js <stop|restart|logs> <channelId>');
  process.exit(1);
}

if (!channelId) {
  console.error('channelId를 지정해야 합니다. 예: npm run logs -- C12345678');
  process.exit(1);
}

const processName = `slack-claude-bot-${channelId.replace(/[^a-zA-Z0-9_-]/g, '_')}`;
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
