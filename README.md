# Slack Claude Bot

Slack 채널에서 Claude CLI를 실행해 대화하는 봇이다. 채널 메시지, `@멘션`, 스레드 답장을 받아 Claude를 호출하고, 같은 스레드에서는 세션을 이어간다.

## 시작 가이드

1. 의존성을 설치한다.

```bash
npm install
cp .env.example .env
```

2. `.env`에 아래 3개만 채운다.

- `SLACK_BOT_TOKEN`
- `SLACK_SIGNING_SECRET`
- `SLACK_APP_TOKEN`

3. 봇을 시작한다.

```bash
npm start
```

4. 실행 중 아래 두 값을 순서대로 입력한다.

- `Working directory`
  Claude가 실제로 작업할 프로젝트 경로다.
- `Slack channel ID`
  이 봇이 반응할 채널 ID다.

5. 입력이 끝나면 `data/targets.json`에 관리 포인트를 저장하고, PM2가 `slack-code-main` 중앙 프로세스를 하나만 띄운다.

예시:

```text
$ npm start
Working directory [/home/user/slack_code]: ~/works/naverse/main/project/client
Slack channel ID: C12345678

[start] channel: C12345678
[start] Claude workdir: /home/user/works/naverse/main/project/client
[start] target config: /home/user/slack_code/data/targets.json
[start] PM2 process: slack-code-main
```

같은 채널 ID로 다시 `npm start`를 실행하면 해당 채널의 작업 디렉터리 설정을 갱신한다. 다른 채널 ID를 입력하면 중앙 프로세스는 그대로 두고 관리 포인트만 추가한다. Slack Socket Mode 연결은 `slack-code-main` 프로세스 하나가 유지한다.

## 운영 명령어

```bash
npm run list
npm run logs
npm run stop
npm run restart
```

## 주요 기능

- 채널 메시지와 스레드 대화 지원
- 스레드별 Claude 세션 유지
- Slack 첨부 이미지 다운로드 후 Claude 분석
- `npm start` 실행 시 작업 디렉터리와 Slack 채널 ID 입력
- 단일 PM2 프로세스에서 채널별 작업 디렉터리 라우팅
- 처리 중 리액션 표시

## 사전 요구사항

- Node.js 18+
- `claude` CLI 설치 및 로그인
- PM2 설치 (`npm install -g pm2`)

## 환경 변수

| 변수 | 설명 |
|------|------|
| `SLACK_BOT_TOKEN` | Slack Bot 토큰 |
| `SLACK_SIGNING_SECRET` | Slack Signing Secret |
| `SLACK_APP_TOKEN` | Socket Mode App Token |

## Slack 앱 설정

- Bot scopes: `app_mentions:read`, `channels:history`, `chat:write`, `files:read`, `reactions:write`
- Bot events: `app_mention`, `message.channels`, `message.groups`
- Socket Mode 활성화
- App-level token scope: `connections:write`

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
│   ├── sessions.db
│   └── targets.json
├── .env.example
└── package.json
```

## 개발 실행

```bash
npm run dev
npm run dev -- ~/works/naverse/main/project/client
```

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

npm start
  -> 채널 ID와 작업 디렉터리를 data/targets.json에 저장
  -> slack-code-main이 없으면 시작
  -> 이미 실행 중이면 설정만 갱신
```
