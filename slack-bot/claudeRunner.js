import { spawn } from 'child_process';
import path from 'path';
import { getSession, setSession, touchSession } from './sessionStore.js';

/**
 * claude -p 실행 후 응답 텍스트와 세션 ID 반환
 * @param {string} sessionKey   - 세션 식별자 (channelId 또는 channelId:threadTs)
 * @param {string} prompt       - 사용자 메시지
 * @param {string[]} imagePaths - 첨부 이미지 경로 목록
 * @returns {Promise<string>}   - Claude 응답 텍스트
 */
export async function runClaude(sessionKey, prompt, imagePaths = []) {
  const existingSessionId = getSession(sessionKey);
  const { args } = buildArgs(existingSessionId, prompt, imagePaths);
  const stdout = await spawnClaude(args);

  const result = parseOutput(stdout);

  if (result.sessionId) {
    setSession(sessionKey, result.sessionId);
  } else if (existingSessionId) {
    touchSession(sessionKey);
  }

  return result.text;
}

function spawnClaude(args) {
  return new Promise((resolve, reject) => {
    const workdir = getClaudeWorkdir();
    const proc = spawn('claude', args, {
      cwd: workdir,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (d) => { stdout += d; });
    proc.stderr.on('data', (d) => { stderr += d; });

    const timer = setTimeout(() => {
      proc.kill();
      reject(new Error('Claude 실행 타임아웃 (3600s)'));
    }, 3_600_000);

    proc.on('close', (code) => {
      clearTimeout(timer);
      if (code !== 0 && !stdout) {
        console.error('[Claude stderr]', stderr.slice(0, 500));
        reject(new Error(`Claude 실행 실패 (exit ${code}): ${stderr.slice(0, 300)}`));
      } else {
        resolve(stdout);
      }
    });

    proc.on('error', (err) => {
      clearTimeout(timer);
      reject(new Error(`Claude 실행 실패: ${err.message}`));
    });

  });
}

const SYSTEM_PROMPT = `
You are a Slack bot assistant. Rules:
- Respond only with plain text or markdown that will be posted as a Slack message.
- Do NOT upload files, call Slack APIs, or interact with Slack in any way. File sharing is handled externally.
- You MAY read local files in the configured working directory when needed.
- Keep responses concise and focused on what was asked.
- Always respond in the same language the user used.
`.trim();

function buildArgs(sessionId, prompt, imagePaths) {
  const workdir = getClaudeWorkdir();
  let fullPrompt = prompt;

  if (imagePaths.length > 0) {
    const paths = imagePaths.map(p => p).join('\n');
    fullPrompt = `${prompt}\n\n[첨부 이미지 파일 경로]\n${paths}\n\n위 경로의 이미지를 Read 툴로 읽어서 분석해줘.`;
  }

  const args = [
    '--output-format', 'json',
    '--permission-mode', 'auto',
    '--add-dir', '/tmp',
    '--add-dir', workdir,
    '--system-prompt', SYSTEM_PROMPT,
    '-p', fullPrompt,
  ];
  if (sessionId) args.unshift('--resume', sessionId);
  return { args, stdinData: null };
}

function parseOutput(raw) {
  const lines = raw.trim().split('\n');

  // stream-json 및 json 포맷 모두 처리: type=result 줄 우선 탐색
  for (let i = lines.length - 1; i >= 0; i--) {
    try {
      const parsed = JSON.parse(lines[i]);
      if (parsed.type === 'result') {
        return {
          text: parsed.result ?? raw.trim(),
          sessionId: parsed.session_id ?? null,
        };
      }
    } catch {
      // JSON 아닌 줄은 건너뜀
    }
  }

  // fallback: 마지막 JSON 줄
  for (let i = lines.length - 1; i >= 0; i--) {
    try {
      const parsed = JSON.parse(lines[i]);
      return {
        text: parsed.result ?? parsed.content ?? raw.trim(),
        sessionId: parsed.session_id ?? null,
      };
    } catch { }
  }

  return { text: raw.trim(), sessionId: null };
}

function getClaudeWorkdir() {
  return path.resolve(process.env.CLAUDE_WORKDIR || process.cwd());
}
