// 세션 키별 순차 처리 큐
// 처리 중일 때 새 메시지가 오면 대기열에 추가하고 순서대로 실행

const queues = new Map(); // sessionKey → Promise chain

/**
 * sessionKey 단위로 직렬화된 큐에 작업 추가
 * @param {string} sessionKey
 * @param {() => Promise<void>} task
 */
export function enqueue(sessionKey, task) {
  const current = queues.get(sessionKey) ?? Promise.resolve();

  const next = current.then(() => task()).catch((err) => {
    console.error(`[queue error] ${sessionKey}:`, err.message);
  });

  queues.set(sessionKey, next);

  // 큐가 끝나면 정리
  next.finally(() => {
    if (queues.get(sessionKey) === next) {
      queues.delete(sessionKey);
    }
  });
}

/**
 * 현재 해당 세션 키가 처리 중인지 여부
 */
export function isBusy(sessionKey) {
  return queues.has(sessionKey);
}
