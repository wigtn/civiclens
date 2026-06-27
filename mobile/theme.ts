// 디자인 토큰 — 고대비·큰 글자(디지털약자 접근성, FR-014 UX 지향).
export const colors = {
  bg: '#0B1020',
  surface: '#151B2E',
  surfaceAlt: '#1E2740',
  primary: '#3B82F6',
  primaryText: '#FFFFFF',
  text: '#F4F6FB',
  textMuted: '#9AA4BF',
  success: '#22C55E',
  warning: '#F59E0B',
  danger: '#EF4444',
  border: '#2A3454',
  overlay: 'rgba(8, 12, 24, 0.82)',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
} as const;

export const radius = {
  sm: 8,
  md: 14,
  lg: 22,
  pill: 999,
} as const;

export const fontSize = {
  sm: 14,
  md: 17,
  lg: 22,
  xl: 30,
  xxl: 40,
} as const;
