// 디자인 토큰 — "Mono / lo-fi": 흰 배경 + 검정 + 그레이, 의미색만 상태에 사용.
// 와이어프레임 미감 그대로. 타깃(외국인·디지털약자): 고대비, 큰 글자/터치, 깔끔.
import type { ViewStyle } from 'react-native';

export const colors = {
  bg: '#FFFFFF', // 흰 배경
  surface: '#FFFFFF', // 카드
  surfaceAlt: '#F3F3F3', // 옅은 그레이(선택·칩·AI 버블)
  primary: '#141414', // 검정 CTA
  primaryText: '#FFFFFF',
  accent: '#141414', // 링크·강조도 검정(모노)
  accentSoft: '#F0F0F0', // 옅은 그레이 배경
  text: '#141414', // 거의 검정
  textMuted: '#6A6A6A', // 회색
  border: '#E2E2E2', // 옅은 보더
  // 의미색 — 상태(에러/성공/경고)에만 사용, 브랜드 아님.
  success: '#1E7D34',
  warning: '#9A6A00',
  danger: '#B3261E',
  overlay: 'rgba(20, 20, 20, 0.78)', // 카메라 위 오버레이(어둡게)
  onOverlay: '#FFFFFF', // 어두운 오버레이/카메라 위 텍스트
} as const;

export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 } as const;
export const radius = { sm: 8, md: 12, lg: 18, xl: 22, pill: 999 } as const;
export const fontSize = { sm: 14, md: 17, lg: 22, xl: 30, xxl: 40 } as const;

// 중성 그림자(은은하게). iOS shadow* / Android elevation 동시 지정.
export const shadows: Record<'card' | 'cta', ViewStyle> = {
  card: {
    shadowColor: '#000000',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  cta: {
    shadowColor: '#000000',
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 },
    elevation: 4,
  },
};
