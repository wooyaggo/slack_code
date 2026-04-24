import 'dotenv/config';
import pkg from '@slack/bolt';
const { App } = pkg;
import { registerHandlers } from './slackHandler.js';
import { getConfigPath, listTargets } from './targetStore.js';

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  // Socket Mode: 별도 서버 포트 없이 WebSocket으로 연결 (개발 편의)
  socketMode: true,
  appToken: process.env.SLACK_APP_TOKEN,
});

// 모든 이벤트 수신 확인용 (디버그)
app.use(async ({ payload, next }) => {
  console.log('[EVENT]', payload?.type, payload?.channel ?? '', payload?.text?.slice(0, 40) ?? '');
  await next();
});

registerHandlers(app);

(async () => {
  await app.start();
  console.log(`Slack Claude Bot 시작됨 (Socket Mode)`);
  console.log(`대상 설정: ${getConfigPath()}`);
  const targets = listTargets();
  if (targets.length === 0) {
    console.log('등록된 관리 포인트가 없습니다. npm start로 채널과 작업 디렉터리를 추가하세요.');
  } else {
    for (const target of targets) {
      console.log(`관리 포인트: ${target.channelId} -> ${target.workdir}`);
    }
  }
})();
