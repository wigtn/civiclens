// ============================================================
// server/lib/security/pii-scrub.ts — 서버측 결정적 PII 마스킹(FR-015, C-2)
// 모델 생성 텍스트를 신뢰하지 않는다. Record 저장 직전 반드시 통과.
// 1) 정규식: 외국인등록번호/주민번호/전화/이메일/카드/계좌 등 강한 식별자
// 2) 휴리스틱 NER: 한국어 인명(성+이름), 상세주소(번지/동·호수) 패턴
// 정책: 강한 식별자 1건이라도 탐지 시 저장 거부(422 PII_DETECTED).
//       약한 식별자(인명/주소 휴리스틱)는 마스킹 후 통과(과탐 허용).
// 로컬 전용: 외부 NER 모델 없이 규칙 기반. 통합 시 NER 모델 훅 가능.
// ============================================================

export type PiiCategory =
  | 'rrn' // 주민등록번호
  | 'frn' // 외국인등록번호
  | 'phone'
  | 'email'
  | 'card'
  | 'account' // 계좌번호
  | 'passport'
  | 'name' // 인명(휴리스틱)
  | 'address'; // 상세주소(휴리스틱)

export interface PiiHit {
  category: PiiCategory;
  /** true면 저장 거부 트리거(강한 식별자). false면 마스킹 후 통과. */
  blocking: boolean;
  sample: string; // 로그용 마스킹된 일부(원문 미보존)
}

export interface PiiScrubResult {
  /** 강한 식별자가 하나라도 있으면 false → 422 PII_DETECTED */
  ok: boolean;
  /** 마스킹 적용된 텍스트(ok=false여도 디버그용으로 채워짐) */
  scrubbed: string;
  hits: PiiHit[];
}

// --- 강한 식별자: 정규식 ---------------------------------------------------
// 주민등록번호: YYMMDD-NPPPPPP (N: 1~4,9,0 등)
const RE_RRN = /\b\d{6}[-\s]?[1-4]\d{6}\b/g;
// 외국인등록번호: 동일 포맷이나 뒷자리 5~8로 시작 — RRN 패턴과 함께 광범위 커버
const RE_FRN = /\b\d{6}[-\s]?[5-8]\d{6}\b/g;
// 전화: 010-1234-5678, +82 10 ..., 02-123-4567 등
const RE_PHONE = /(?:\+?\d{1,3}[-\s]?)?(?:0\d{1,2}|\d{2,3})[-\s]?\d{3,4}[-\s]?\d{4}\b/g;
// 이메일
const RE_EMAIL = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;
// 카드번호: 13~16자리(공백/하이픈 구분 허용)
const RE_CARD = /\b(?:\d[ -]?){13,16}\b/g;
// 계좌번호: 숫자 그룹이 하이픈으로 3개 이상 (예: 110-123-456789)
const RE_ACCOUNT = /\b\d{2,6}-\d{2,6}-\d{2,7}(?:-\d{1,6})?\b/g;
// 여권번호: 영문1~2 + 숫자7~8
const RE_PASSPORT = /\b[A-Z]{1,2}\d{7,8}\b/g;

// --- 약한 식별자: 휴리스틱 NER --------------------------------------------
// 한국어 상세주소: "...로/길 + 숫자" 또는 "...동/호" 번지
const RE_ADDR_KO = /[가-힣]+(?:로|길)\s?\d+(?:[-\s]?\d+)?(?:번길)?|\d+동\s?\d+호|\b\d+번지\b/g;
// 한국어 인명: 흔한 성 + 1~2자 이름 (과탐 가능 → 마스킹만)
const RE_NAME_KO =
  /(?<![가-힣])(김|이|박|최|정|강|조|윤|장|임|한|오|서|신|권|황|안|송|류|전|홍|고|문|양|손|배|백|허|유|남|심|노|하|곽|성|차|주|우|구|민|진|지|엄|채|원|천|방|공|현|함|변|염|여|추|도|소|석|선|마|길|연|위|표|명|기|반|왕|금|옥|육|인|맹|제|모|탁|국|어|은|편|용)[가-힣]{1,2}(?:\s?(?:씨|님))?/g;

function maskRange(s: string): string {
  if (s.length <= 2) return '*'.repeat(s.length);
  return s[0] + '*'.repeat(Math.max(1, s.length - 2)) + s[s.length - 1];
}

function scanStrong(
  text: string,
  re: RegExp,
  category: PiiCategory,
  guard?: (m: string) => boolean,
): { text: string; hits: PiiHit[] } {
  const hits: PiiHit[] = [];
  const out = text.replace(re, (m) => {
    if (guard && !guard(m)) return m;
    hits.push({ category, blocking: true, sample: maskRange(m.replace(/\s|-/g, '')) });
    return '[REDACTED]';
  });
  return { text: out, hits };
}

function scanWeak(text: string, re: RegExp, category: PiiCategory) {
  const hits: PiiHit[] = [];
  const out = text.replace(re, (m) => {
    hits.push({ category, blocking: false, sample: maskRange(m) });
    return maskRange(m);
  });
  return { text: out, hits };
}

// 카드/계좌 과탐 방지: 구분자 제거 후 길이 검증
function isLikelyCard(m: string): boolean {
  const digits = m.replace(/\D/g, '');
  return digits.length >= 13 && digits.length <= 16;
}

/**
 * 텍스트에 PII 파이프라인을 적용한다.
 * 순서 중요: 이메일·계좌·카드 → 식별번호 → 전화 → 약한 식별자.
 */
export function scrubPii(input: string | null | undefined): PiiScrubResult {
  if (!input || input.trim().length === 0) {
    return { ok: true, scrubbed: input ?? '', hits: [] };
  }

  let text = input;
  const hits: PiiHit[] = [];

  const push = (r: { text: string; hits: PiiHit[] }) => {
    text = r.text;
    hits.push(...r.hits);
  };

  // 강한 식별자 (구체적인 것부터)
  // 주의: RRN/FRN(6+7 고정 포맷) → 전화(3-4-4) → 계좌/카드 순.
  //       전화를 계좌/카드보다 먼저 처리해 휴대폰 번호가 account 로 오분류되지 않게 한다.
  push(scanStrong(text, RE_EMAIL, 'email'));
  push(scanStrong(text, RE_RRN, 'rrn'));
  push(scanStrong(text, RE_FRN, 'frn'));
  push(scanStrong(text, RE_PHONE, 'phone'));
  push(scanStrong(text, RE_PASSPORT, 'passport'));
  push(scanStrong(text, RE_ACCOUNT, 'account'));
  push(scanStrong(text, RE_CARD, 'card', isLikelyCard));

  // 약한 식별자(마스킹 후 통과)
  push(scanWeak(text, RE_ADDR_KO, 'address'));
  push(scanWeak(text, RE_NAME_KO, 'name'));

  const hasBlocking = hits.some((h) => h.blocking);
  return { ok: !hasBlocking, scrubbed: text, hits };
}

/** 저장 가능 여부만 빠르게 판정(강한 식별자 유무). */
export function containsBlockingPii(input: string | null | undefined): boolean {
  return !scrubPii(input).ok;
}
