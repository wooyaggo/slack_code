import 'dotenv/config';
import pkg from '@slack/bolt';
const { App } = pkg;
import { registerHandlers } from './slackHandler.js';

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
  console.log(`대상 채널: ${process.env.TARGET_CHANNEL_ID || '전체'}`);
  console.log(`Claude 작업 디렉터리: ${process.env.CLAUDE_WORKDIR || process.cwd()}`);
})();
