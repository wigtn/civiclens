import type { I18nKey } from '@contract/i18n-keys';

// 한국어 — 기준 UI (FR-007)
export const ko: Record<I18nKey, string> = {
  'landing.title': '민원, 같이 해요',
  'landing.subtitle': '카메라로 서류를 비추고 모국어로 물어보세요. AI가 칸별로 안내해 드려요.',
  'landing.selectLanguage': '언어를 선택하세요',
  'landing.start': '시작하기',

  'session.connecting': '연결 중…',
  'session.permissionDenied': '카메라·마이크 권한이 필요해요. 설정에서 허용해 주세요.',
  'session.aimAtDocument': '서류나 화면을 카메라에 비춰 주세요',
  'session.reshoot': '잘 안 보여요. 다시 한 번 또렷하게 비춰 주세요.',
  'session.end': '종료',

  'records.empty': '아직 기록이 없어요. 첫 민원을 함께 해봐요.',
  'records.title': '내 민원 기록',
  'record.guidedFields': '안내받은 항목',

  'benchmark.accuracy': '서식 인식 정확도',
  'benchmark.noPermission': '이 화면은 관리자만 볼 수 있어요.',

  'state.loading': '불러오는 중…',
  'state.error': '문제가 생겼어요. 잠시 후 다시 시도해 주세요.',
  'state.noPermission': '접근 권한이 없어요.',
  'error.rateLimited': '요청이 너무 많아요. 잠시 후 다시 시도해 주세요.',
  'error.budgetExceeded': '오늘 사용량이 가득 찼어요. 내일 다시 이용해 주세요.',
};
