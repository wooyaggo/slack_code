import { fileURLToPath } from 'url';
import os from 'os';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const requestedDir = process.argv[2];
const claudeWorkdir = resolveWorkdir(requestedDir);

process.env.CLAUDE_WORKDIR = claudeWorkdir;

console.log(`[dev] Claude workdir: ${claudeWorkdir}`);

await import(path.join(repoRoot, 'slack-bot', 'index.js'));

function resolveWorkdir(input) {
  if (!input) return process.cwd();
  if (input === '~') return os.homedir();
  if (input.startsWith('~/')) return path.join(os.homedir(), input.slice(2));
  return path.resolve(input);
}
