import { describe, it, expect, beforeEach } from 'vitest';
import { checkRateLimit, __resetRateLimit } from '@/lib/security/rate-limit';

beforeEach(() => __resetRateLimit());

describe('rate-limit: 분 윈도우', () => {
  it('분 한도까지 허용하고 초과분을 차단한다', () => {
    const policy = { perMin: 6, perDay: 60 };
    const ip = '1.1.1.1';
    for (let i = 0; i < 6; i++) {
      expect(checkRateLimit('session', ip, policy).allowed).toBe(true);
    }
    const blocked = checkRateLimit('session', ip, policy);
    expect(blocked.allowed).toBe(false);
    expect(blocked.blockedBy).toBe('min');
    expect(blocked.retryAfterSec).toBeGreaterThan(0);
  });

  it('IP 별로 독립 카운트한다', () => {
    const policy = { perMin: 2, perDay: 60 };
    expect(checkRateLimit('session', 'a', policy).allowed).toBe(true);
    expect(checkRateLimit('session', 'a', policy).allowed).toBe(true);
    expect(checkRateLimit('session', 'a', policy).allowed).toBe(false);
    // 다른 IP 는 영향 없음
    expect(checkRateLimit('session', 'b', policy).allowed).toBe(true);
  });

  it('scope(버킷) 별로 독립 카운트한다', () => {
    const policy = { perMin: 1, perDay: 60 };
    expect(checkRateLimit('session', 'x', policy).allowed).toBe(true);
    expect(checkRateLimit('session', 'x', policy).allowed).toBe(false);
    // 다른 scope 는 영향 없음
    expect(checkRateLimit('recognize', 'x', policy).allowed).toBe(true);
  });
});

describe('rate-limit: 일 윈도우', () => {
  it('일 한도 초과 시 day 로 차단하고 분 카운트를 소진하지 않는다', () => {
    const policy = { perMin: 100, perDay: 3 };
    const ip = '2.2.2.2';
    for (let i = 0; i < 3; i++) {
      expect(checkRateLimit('session', ip, policy).allowed).toBe(true);
    }
    const blocked = checkRateLimit('session', ip, policy);
    expect(blocked.allowed).toBe(false);
    expect(blocked.blockedBy).toBe('day');
  });
});
