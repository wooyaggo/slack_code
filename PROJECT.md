# Slack Claude Bot — 프로젝트 문서

## 개요

Slack 채널에서 Claude CLI를 호출하는 일반 목적 봇이다. 특정 데이터 소스에 묶이지 않고, 지정한 작업 디렉터리의 파일을 읽거나 이미지를 분석하는 용도로 사용한다.

## 구성 요소

| 컴포넌트 | 경로 | 설명 |
|----------|------|------|
| Slack Bot | `slack-bot/` | Slack 이벤트 수신, 세션 관리, Claude 실행 |
| Scripts | `scripts/` | PM2 시작과 개발 실행 래퍼 |
| Data | `data/` | 세션 DB 저장 위치 |

## 환경 변수

| 변수명 | 설명 |
|--------|------|
| `SLACK_BOT_TOKEN` | 봇 API 토큰 |
| `SLACK_SIGNING_SECRET` | 요청 서명 검증값 |
| `SLACK_APP_TOKEN` | Socket Mode 연결 토큰 |

## 실행

```bash
cd /path/to/slack_code
npm install

npm start

npm run list
npm run logs -- C12345678
npm run stop -- C12345678
npm run restart -- C12345678

npm run dev
npm run dev -- ~/works/naverse/main/project/client
```

`npm start`는 실행 시 다음 값을 입력받는다.

1. Claude 작업 디렉터리
2. Slack 채널 ID

채널별로 PM2 프로세스 이름을 분리해서 여러 개를 동시에 실행할 수 있다.
작업 디렉터리, 채널 ID, 세션 DB 경로는 시작 시 런타임에 자동 주입된다.

## 동작 방식

1. 채널 메시지나 `@멘션`을 수신한다.
2. 스레드 기준으로 세션 키를 정한다.
3. Claude CLI를 실행하고 같은 스레드면 `--resume`으로 이어간다.
4. 이미지가 있으면 `/tmp`에 다운로드한 뒤 Claude가 읽게 한다.
5. 세션은 SQLite에 저장하고 1시간 후 만료한다.
