# Slack Claude Bot

## 응답 원칙

- 지정된 작업 디렉터리와 현재 대화 맥락을 기준으로 답변한다.
- 확인하지 않은 내용은 단정하지 않는다.
- Slack에 바로 게시될 수 있는 평문 또는 mrkdwn 형식으로 답변한다.

## Slack 응답 포맷

- 굵게: `*텍스트*`
- 기울임: `_텍스트_`
- 인라인 코드: `` `코드` ``
- 코드 블록: `````코드`````
- 링크: `<URL|표시텍스트>`
- 표 대신 목록 사용

## 프로젝트 구조

```text
/path/to/slack_code/
├── slack-bot/
│   ├── index.js
│   ├── slackHandler.js
│   ├── claudeRunner.js
│   ├── sessionStore.js
│   └── imageHandler.js
├── scripts/
│   ├── start.js
│   └── dev.js
└── data/
    └── sessions.db
```

## 실행

```bash
cd /path/to/slack_code
npm start
npm run logs -- C12345678
npm run stop -- C12345678
npm run restart -- C12345678
```

## 메모

- `npm start` 실행 시 작업 디렉터리와 Slack 채널 ID를 입력받는다.
- 각 채널은 별도 PM2 프로세스 이름으로 실행된다.
- 세션은 스레드 기준으로 유지되며 1시간 후 만료된다.
- 이미지 첨부 시 `/tmp`에 내려받은 뒤 Claude가 읽는다.
