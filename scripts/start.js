import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { createInterface } from 'readline/promises';
import fs from 'fs';
import os from 'os';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const botEntry = path.join(repoRoot, 'slack-bot', 'index.js');

const { workdir, channelId } = await promptInputs();
const processName = getProcessName(channelId);
const sessionDbPath = path.join(repoRoot, 'data', `sessions.${sanitizeSegment(channelId)}.db`);

console.log(`[start] channel: ${channelId}`);
console.log(`[start] Claude workdir: ${workdir}`);
console.log(`[start] PM2 process: ${processName}`);

const sharedOptions = {
  cwd: repoRoot,
  stdio: 'inherit',
  env: {
    ...process.env,
    CLAUDE_WORKDIR: workdir,
    TARGET_CHANNEL_ID: channelId,
    SESSION_DB_PATH: sessionDbPath,
  },
};

try {
  const restarted = await runPm2(['restart', processName, '--update-env']);
  if (!restarted) {
    await runPm2([
      'start',
      botEntry,
      '--name',
      processName,
      '--interpreter',
      'node',
      '--update-env',
    ], true);
  }
} catch (error) {
  console.error(`[start] pm2 실행 실패: ${error.message}`);
  process.exit(1);
}

async function promptInputs() {
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  try {
    const defaultWorkdir = process.env.CLAUDE_WORKDIR || process.cwd();

    let workdir;
    while (!workdir) {
      const input = (await rl.question(`Working directory [${defaultWorkdir}]: `)).trim();
      const resolved = resolveWorkdir(input || defaultWorkdir);

      if (!fs.existsSync(resolved)) {
        console.error(`[start] 경로가 없습니다: ${resolved}`);
        continue;
      }

      if (!fs.statSync(resolved).isDirectory()) {
        console.error(`[start] 디렉터리가 아닙니다: ${resolved}`);
        continue;
      }

      workdir = resolved;
    }

    let channelId;
    while (!channelId) {
      const input = (await rl.question('Slack channel ID: ')).trim();
      if (!input) {
        console.error('[start] channel ID는 비워둘 수 없습니다.');
        continue;
      }
      channelId = input;
    }

    return { workdir, channelId };
  } finally {
    rl.close();
  }
}

function resolveWorkdir(input) {
  if (input === '~') return os.homedir();
  if (input.startsWith('~/')) return path.join(os.homedir(), input.slice(2));
  return path.resolve(input);
}

function getProcessName(channelId) {
  return `slack-claude-bot-${sanitizeSegment(channelId)}`;
}

function sanitizeSegment(value) {
  return value.replace(/[^a-zA-Z0-9_-]/g, '_');
}

function runPm2(args, required = false) {
  return new Promise((resolve, reject) => {
    const child = spawn('pm2', args, sharedOptions);

    child.on('exit', (code, signal) => {
      if (signal) {
        process.kill(process.pid, signal);
        return;
      }

      if (code === 0) {
        resolve(true);
        return;
      }

      if (required) {
        reject(new Error(`pm2 ${args[0]} 실패 (exit ${code ?? 1})`));
        return;
      }

      resolve(false);
    });

    child.on('error', (error) => {
      if (required) {
        reject(error);
        return;
      }

      resolve(false);
    });
  });
}
