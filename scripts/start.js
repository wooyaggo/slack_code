import 'dotenv/config';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { createInterface } from 'readline/promises';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { getConfigPath, upsertTarget } from '../slack-bot/targetStore.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const botEntry = path.join(repoRoot, 'slack-bot', 'index.js');
const processName = 'slack-code-main';

const { workdir, channelId, channelLabel } = await promptInputs();
const target = upsertTarget({ channelId, workdir });

console.log(`[start] channel: ${channelLabel} (${channelId})`);
console.log(`[start] Claude workdir: ${target.workdir}`);
console.log(`[start] target config: ${getConfigPath()}`);
console.log(`[start] PM2 process: ${processName}`);

const sharedOptions = {
  cwd: repoRoot,
  stdio: 'inherit',
  env: {
    ...process.env,
  },
};

try {
  const described = await runPm2(['describe', processName]);
  if (described) {
    console.log('[start] 중앙 봇 프로세스가 이미 실행 중입니다. 설정만 갱신했습니다.');
  } else {
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
    let channelLabel;
    while (!channelId) {
      const input = (await rl.question('Slack channel ID or name: ')).trim();
      if (!input) {
        console.error('[start] channel ID 또는 이름은 비워둘 수 없습니다.');
        continue;
      }

      try {
        const resolved = await resolveChannel(input);
        channelId = resolved.id;
        channelLabel = resolved.label;
      } catch (error) {
        console.error(`[start] 채널 확인 실패: ${error.message}`);
      }
    }

    return { workdir, channelId, channelLabel };
  } finally {
    rl.close();
  }
}

function resolveWorkdir(input) {
  if (input === '~') return os.homedir();
  if (input.startsWith('~/')) return path.join(os.homedir(), input.slice(2));
  return path.resolve(input);
}

async function resolveChannel(input) {
  if (isSlackChannelId(input)) {
    return { id: input, label: input };
  }

  const channelName = normalizeChannelName(input);
  if (!channelName) {
    throw new Error('유효한 채널명을 입력하세요.');
  }

  const token = process.env.SLACK_BOT_TOKEN;
  if (!token) {
    throw new Error('채널명을 ID로 변환하려면 SLACK_BOT_TOKEN이 필요합니다.');
  }

  const channel = await findSlackChannelByName(channelName, token);
  if (!channel) {
    throw new Error(`#${channelName} 채널을 찾지 못했습니다. 봇이 채널에 접근할 수 있는지 확인하세요.`);
  }

  return { id: channel.id, label: `#${channel.name}` };
}

function isSlackChannelId(input) {
  return /^[CGD][A-Z0-9]{8,}$/.test(input);
}

function normalizeChannelName(input) {
  return input.replace(/^#/, '').trim().toLowerCase();
}

async function findSlackChannelByName(channelName, token) {
  let cursor;

  do {
    const params = new URLSearchParams({
      exclude_archived: 'true',
      limit: '1000',
      types: 'public_channel,private_channel',
    });
    if (cursor) params.set('cursor', cursor);

    const response = await fetch(`https://slack.com/api/conversations.list?${params}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Slack API 요청 실패 (${response.status})`);
    }

    const body = await response.json();
    if (!body.ok) {
      throw new Error(`Slack API 오류: ${body.error}`);
    }

    const found = body.channels?.find((channel) => channel.name === channelName);
    if (found) return found;

    cursor = body.response_metadata?.next_cursor;
  } while (cursor);

  return null;
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
