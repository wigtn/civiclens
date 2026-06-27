import { describe, it, expect } from 'vitest';
import { scrubPii, containsBlockingPii } from '@/lib/security/pii-scrub';

describe('pii-scrub: 강한 식별자(저장 거부)', () => {
  it('주민등록번호를 탐지하고 차단한다', () => {
    const r = scrubPii('제 번호는 900101-1234567 입니다');
    expect(r.ok).toBe(false);
    expect(r.hits.some((h) => h.category === 'rrn' && h.blocking)).toBe(true);
    expect(r.scrubbed).not.toContain('900101-1234567');
  });

  it('외국인등록번호를 탐지하고 차단한다', () => {
    const r = scrubPii('등록번호 900101-5234567');
    expect(r.ok).toBe(false);
    expect(r.hits.some((h) => h.category === 'frn')).toBe(true);
  });

  it('전화번호를 탐지하고 차단한다', () => {
    const r = scrubPii('연락처 010-1234-5678 로 주세요');
    expect(r.ok).toBe(false);
    expect(r.hits.some((h) => h.category === 'phone')).toBe(true);
    expect(r.scrubbed).not.toContain('010-1234-5678');
  });

  it('이메일을 탐지하고 차단한다', () => {
    const r = scrubPii('메일은 hong@example.com 입니다');
    expect(r.ok).toBe(false);
    expect(r.scrubbed).not.toContain('hong@example.com');
  });

  it('여러 PII 가 섞여 있으면 모두 잡고 차단한다', () => {
    const r = scrubPii('010-1111-2222, test@a.com, 880808-2345678');
    expect(r.ok).toBe(false);
    expect(r.hits.filter((h) => h.blocking).length).toBeGreaterThanOrEqual(3);
  });
});

describe('pii-scrub: 약한 식별자(마스킹 후 통과)', () => {
  it('한국어 인명을 마스킹하되 저장은 허용한다', () => {
    const r = scrubPii('담당자 홍길동 안내');
    expect(r.ok).toBe(true);
    expect(r.scrubbed).not.toContain('홍길동');
  });

  it('상세주소를 마스킹하되 저장은 허용한다', () => {
    const r = scrubPii('세종대로 110 으로 오세요');
    expect(r.ok).toBe(true);
    expect(r.hits.some((h) => h.category === 'address')).toBe(true);
  });
});

describe('pii-scrub: PII 없는 안전 텍스트', () => {
  it('비식별 안내 텍스트는 변경 없이 통과한다', () => {
    const safe = '전입신고서의 세대주 칸 작성법을 안내했습니다';
    const r = scrubPii(safe);
    expect(r.ok).toBe(true);
    expect(containsBlockingPii(safe)).toBe(false);
  });

  it('빈 값은 통과한다', () => {
    expect(scrubPii('').ok).toBe(true);
    expect(scrubPii(null).ok).toBe(true);
    expect(scrubPii(undefined).ok).toBe(true);
  });
});
