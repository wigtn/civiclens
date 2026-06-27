// ============================================================
// server/lib/security/rate-limit.ts — IP 기반 슬라이딩 카운터(FR-016)
// 로컬 전용: 인메모리 저장소. 분/일 윈도우 동시 체크.
// 정책 값은 config.RATE_LIMITS 참조(session: 6/min·60/day 등).
// ============================================================

type WindowState = { count: number; resetAt: number };

const MIN_MS = 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

// key("scope:ip") -> per-min / per-day 상태.
// 라우트별 모듈 분리 환경 대비 globalThis 싱글턴.
const g = globalThis as typeof globalThis & {
  __civiclensRlMin?: Map<string, WindowState>;
  __civiclensRlDay?: Map<string, WindowState>;
};
const minStore: Map<string, WindowState> = (g.__civiclensRlMin ??= new Map());
const dayStore: Map<string, WindowState> = (g.__civiclensRlDay ??= new Map());

function nowMs(): number {
  return Date.now();
}

function tick(store: Map<string, WindowState>, key: string, windowMs: number, limit: number) {
  const now = nowMs();
  const cur = store.get(key);
  if (!cur || now >= cur.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1, resetAt: now + windowMs };
  }
  if (cur.count >= limit) {
    return { allowed: false, remaining: 0, resetAt: cur.resetAt };
  }
  cur.count += 1;
  return { allowed: true, remaining: limit - cur.count, resetAt: cur.resetAt };
}

export interface RateLimitResult {
  allowed: boolean;
  /** 차단된 윈도우('min' | 'day') — 허용 시 null */
  blockedBy: 'min' | 'day' | null;
  retryAfterSec: number;
}

/**
 * 분/일 윈도우를 함께 검사한다. 분 한도부터 확인.
 * @param scope  레이트리밋 버킷 이름(예: 'session', 'recognize')
 * @param ip     클라이언트 IP
 * @param policy { perMin, perDay }
 */
export function checkRateLimit(
  scope: string,
  ip: string,
  policy: { perMin: number; perDay: number },
): RateLimitResult {
  const key = `${scope}:${ip}`;

  // 분 윈도우 먼저 (소비 전 일 윈도우와 독립 카운트지만, 분 초과면 일 카운트는 올리지 않음)
  const min = tick(minStore, key, MIN_MS, policy.perMin);
  if (!min.allowed) {
    return {
      allowed: false,
      blockedBy: 'min',
      retryAfterSec: Math.max(1, Math.ceil((min.resetAt - nowMs()) / 1000)),
    };
  }

  const day = tick(dayStore, key, DAY_MS, policy.perDay);
  if (!day.allowed) {
    // 분 카운트를 롤백해 일 한도 차단이 분 한도를 소진시키지 않게 한다.
    const cur = minStore.get(key);
    if (cur && cur.count > 0) cur.count -= 1;
    return {
      allowed: false,
      blockedBy: 'day',
      retryAfterSec: Math.max(1, Math.ceil((day.resetAt - nowMs()) / 1000)),
    };
  }

  return { allowed: true, blockedBy: null, retryAfterSec: 0 };
}

/** 요청에서 클라이언트 IP 추출(로컬/프록시 환경 모두 커버). */
export function clientIp(req: Request): string {
  const xff = req.headers.get('x-forwarded-for');
  if (xff) return xff.split(',')[0].trim();
  return (
    req.headers.get('x-real-ip') ??
    req.headers.get('cf-connecting-ip') ??
    '127.0.0.1'
  );
}

/** 테스트용: 모든 카운터 초기화. */
export function __resetRateLimit(): void {
  minStore.clear();
  dayStore.clear();
}
