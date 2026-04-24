import { downloadImages, cleanupImages } from './imageHandler.js';
import { runClaude } from './claudeRunner.js';
import { deleteSession } from './sessionStore.js';
import { enqueue } from './messageQueue.js';
import { getTarget } from './targetStore.js';

const BOT_TOKEN = process.env.SLACK_BOT_TOKEN;

export function registerHandlers(app) {
  // @멘션: 최상위 멘션이면 새 세션 생성, 스레드 안 멘션이면 세션 이어가기
  app.event('app_mention', async ({ event, say, client }) => {
    console.log('[app_mention] 수신:', event.channel, event.text?.slice(0, 50));
    const target = getTarget(event.channel);
    if (!target) return;

    const isTopLevel = !event.thread_ts;
    // 최상위 @멘션이면 세션 키를 message.ts 기준으로 새로 생성
    const sessionKey = isTopLevel
      ? `${event.channel}:${event.ts}`
      : `${event.channel}:${event.thread_ts}`;

    if (isTopLevel) deleteSession(sessionKey); // 항상 새 세션 시작

    enqueue(sessionKey, () => handleMessage({ message: event, sessionKey, say, client, target }));
  });

  // 채널 메시지 및 스레드 답장 처리
  app.message(async ({ message, say, client }) => {
    if (message.subtype && message.subtype !== 'file_share') return;
    if (message.bot_id) return;
    const target = getTarget(message.channel);
    if (!target) return;

    // 최상위 메시지: message.ts 기준 새 세션
    // 스레드 답장: thread_ts 기준 기존 세션 이어가기
    const isTopLevel = !message.thread_ts;
    const sessionKey = isTopLevel
      ? `${message.channel}:${message.ts}`
      : `${message.channel}:${message.thread_ts}`;

    if (isTopLevel) deleteSession(sessionKey);

    console.log(`[message] ${isTopLevel ? '채널' : '스레드'} 수신:`, message.channel, message.text?.slice(0, 50));
    enqueue(sessionKey, () => handleMessage({ message, sessionKey, say, client, target }));
  });
}

async function handleMessage({ message, sessionKey, say, client, target }) {
  if (message.bot_id) return;

  const text = message.text?.trim();
  if (!text && (!message.files || message.files.length === 0)) {
    console.log('[handleMessage] 텍스트/파일 없음, 무시');
    return;
  }

  let imagePaths = [];
  try {
    imagePaths = await downloadImages(message.files, BOT_TOKEN);
    if (imagePaths.length > 0) {
      // 디버그용: /tmp/slack_last_img.png 에 복사 보관
      const { copyFileSync } = await import('fs');
      copyFileSync(imagePaths[0], '/tmp/slack_last_img.png');
      console.log('[이미지 다운로드]', imagePaths);
    }
  } catch (err) {
    console.error('[이미지 다운로드 실패]', err.message);
  }

  // 처리 중 리액션 추가
  try {
    await client.reactions.add({ channel: message.channel, name: 'hourglass_flowing_sand', timestamp: message.ts });
  } catch (err) {
    console.error('[리액션 추가 실패]', err.message);
  }

  let reply;
  try {
    reply = await runClaude(sessionKey, text || '(이미지를 분석해줘)', imagePaths, {
      workdir: target.workdir,
    });
    console.log('[Claude 응답]', reply?.slice(0, 80));
  } catch (err) {
    reply = `오류가 발생했습니다: ${err.message}`;
    console.error('[Claude 실행 오류]', err);
  } finally {
    cleanupImages(imagePaths);
  }

  // 처리 완료 후 리액션 제거
  try {
    await client.reactions.remove({ channel: message.channel, name: 'hourglass_flowing_sand', timestamp: message.ts });
  } catch (err) {
    console.error('[리액션 제거 실패]', err.message);
  }

  await say({ text: reply, thread_ts: message.thread_ts || message.ts });
}
