# Slack Claude Bot

Slack 채널에서 Claude CLI를 실행해 대화하는 봇이다. 채널 메시지, `@멘션`, 스레드 답장을 받아 Claude를 호출하고, 같은 스레드에서는 세션을 이어간다.

## 주요 기능

- 채널 메시지와 스레드 대화 지원
- 스레드별 Claude 세션 유지
- Slack 첨부 이미지 다운로드 후 Claude 분석
- `npm start` 실행 시 작업 디렉터리와 Slack 채널 ID 입력
- 채널 ID별 PM2 멀티 인스턴스 실행
- 처리 중 리액션 표시

## 프로젝트 구조

```text
slack_code/
├── slack-bot/
│   ├── index.js
│   ├── slackHandler.js
│   ├── claudeRunner.js
│   ├── sessionStore.js
│   ├── imageHandler.js
│   └── messageQueue.js
├── scripts/
│   ├── start.js
│   └── dev.js
├── data/
│   └── sessions.db
├── .env.example
└── package.json
```

## 사전 요구사항

- Node.js 18+
- `claude` CLI 설치 및 로그인
- PM2 설치 (`npm install -g pm2`)

## 설치

```bash
git clone https://github.com/wooyaggo/slack_code.git
cd slack_code
npm install
cp .env.example .env
```

## 환경 변수

| 변수 | 설명 |
|------|------|
| `SLACK_BOT_TOKEN` | Slack Bot 토큰 |
| `SLACK_SIGNING_SECRET` | Slack Signing Secret |
| `SLACK_APP_TOKEN` | Socket Mode App Token |
| `TARGET_CHANNEL_ID` | 반응할 채널 ID. 비우면 전체 |
| `CLAUDE_WORKDIR` | Claude 기본 작업 디렉터리 |
| `SESSION_DB_PATH` | SQLite 세션 DB 경로 |

## Slack 앱 설정

- Bot scopes: `app_mentions:read`, `channels:history`, `chat:write`, `files:read`, `reactions:write`
- Bot events: `app_mention`, `message.channels`, `message.groups`
- Socket Mode 활성화
- App-level token scope: `connections:write`

## 실행

```bash
npm start

npm run list
npm run logs -- C12345678
npm run stop -- C12345678
npm run restart -- C12345678

npm run dev
npm run dev -- ~/works/naverse/main/project/client
```

`npm start`를 실행하면 다음 두 값을 순서대로 입력받는다.

- Working directory
- Slack channel ID

각 채널은 `slack-claude-bot-<channelId>` 이름의 PM2 프로세스로 실행된다.

## 동작 방식

```text
사용자 메시지 수신
  -> hourglass 리액션 추가
  -> claude -p 실행
  -> 스레드에 답변
  -> 리액션 제거

같은 스레드의 후속 메시지
  -> 이전 session_id로 --resume
  -> 1시간 후 세션 만료
```
