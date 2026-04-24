# Slack Claude Bot — 프로젝트 문서

## 개요

Slack 채널에서 Claude CLI를 호출하는 일반 목적 봇이다. 특정 데이터 소스에 묶이지 않고, 지정한 작업 디렉터리의 파일을 읽거나 이미지를 분석하는 용도로 사용한다.

## 구성 요소

| 컴포넌트 | 경로 | 설명 |
|----------|------|------|
| Slack Bot | `slack-bot/` | Slack 이벤트 수신, 세션 관리, Claude 실행 |
| Scripts | `scripts/` | PM2 시작과 개발 실행 래퍼 |
| Data | `data/` | 세션 DB와 채널별 작업 디렉터리 설정 저장 위치 |

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
npm run logs
npm run stop
npm run restart

npm run dev
npm run dev -- ~/works/naverse/main/project/client
```

`npm start`는 실행 시 다음 값을 입력받는다.

1. Claude 작업 디렉터리
2. Slack 채널 ID

채널별 작업 디렉터리는 `data/targets.json`에 관리 포인트로 저장된다.
Slack Socket Mode 연결은 `slack-code-main` PM2 프로세스 하나만 유지하고, 채널별 메시지는 저장된 설정으로 라우팅한다.

## 동작 방식

1. 채널 메시지나 `@멘션`을 수신한다.
2. 스레드 기준으로 세션 키를 정한다.
3. 채널 ID에 해당하는 작업 디렉터리에서 Claude CLI를 실행하고 같은 스레드면 `--resume`으로 이어간다.
4. 이미지가 있으면 `/tmp`에 다운로드한 뒤 Claude가 읽게 한다.
5. 세션은 SQLite에 저장하고 1시간 후 만료한다.
