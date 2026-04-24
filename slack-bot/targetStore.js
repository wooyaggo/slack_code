import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');

const CONFIG_PATH = path.resolve(
  process.env.TARGETS_CONFIG_PATH || path.join(repoRoot, 'data', 'targets.json'),
);

let cache = null;
let cacheMtimeMs = null;

export function getConfigPath() {
  return CONFIG_PATH;
}

export function listTargets() {
  return Object.values(loadConfig().targets);
}

export function getTarget(channelId) {
  const target = loadConfig().targets[channelId];
  if (target) return target;

  if (process.env.TARGET_CHANNEL_ID && process.env.TARGET_CHANNEL_ID !== channelId) {
    return null;
  }

  if (process.env.CLAUDE_WORKDIR) {
    return {
      channelId,
      workdir: path.resolve(process.env.CLAUDE_WORKDIR),
      updatedAt: null,
      source: 'env',
    };
  }

  return null;
}

export function upsertTarget({ channelId, workdir }) {
  const config = loadConfig({ force: true });
  config.targets[channelId] = {
    channelId,
    workdir: path.resolve(workdir),
    updatedAt: new Date().toISOString(),
  };

  writeConfig(config);
  return config.targets[channelId];
}

function loadConfig({ force = false } = {}) {
  try {
    const stat = fs.statSync(CONFIG_PATH);
    if (!force && cache && cacheMtimeMs === stat.mtimeMs) return cache;

    const parsed = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
    cache = normalizeConfig(parsed);
    cacheMtimeMs = stat.mtimeMs;
    return cache;
  } catch (error) {
    if (error.code !== 'ENOENT') {
      console.error(`[targetStore] 설정 로드 실패: ${error.message}`);
    }

    cache = { targets: {} };
    cacheMtimeMs = null;
    return cache;
  }
}

function writeConfig(config) {
  fs.mkdirSync(path.dirname(CONFIG_PATH), { recursive: true });

  const normalized = normalizeConfig(config);
  fs.writeFileSync(CONFIG_PATH, `${JSON.stringify(normalized, null, 2)}\n`);

  const stat = fs.statSync(CONFIG_PATH);
  cache = normalized;
  cacheMtimeMs = stat.mtimeMs;
}

function normalizeConfig(config) {
  const targets = {};

  for (const [key, value] of Object.entries(config?.targets ?? {})) {
    const channelId = value?.channelId || key;
    const workdir = value?.workdir;
    if (!channelId || !workdir) continue;

    targets[channelId] = {
      channelId,
      workdir: path.resolve(workdir),
      updatedAt: value.updatedAt ?? null,
    };
  }

  return { targets };
}
