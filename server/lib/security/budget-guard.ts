// ============================================================
// server/lib/security/budget-guard.ts — 일일 비용 캡(FR-016, C-1)
// ephemeral 토큰은 발급 후 클라이언트가 OpenAI와 직접 통신하므로
// "발급 빈도 제한"만으로 부족 → 토큰당 상한(config.SESSION_LIMITS) +
// 발급 건수 기반 일일 추정 비용 누적으로 신규 발급을 차단한다.
// 로컬 전용: 인메모리 누적(자정 UTC 리셋).
// ============================================================

import { DAILY_BUDGET_USD, EST_SESSION_COST_USD } from '@/lib/config';

interface BudgetState {
  dayKey: string;
  spentUsd: number;
}

function currentDayKey(): string {
  // UTC 날짜 기준 (로컬 데모에서 충분)
  return new Date().toISOString().slice(0, 10);
}

// 라우트별 모듈 분리 환경 대비 globalThis 싱글턴.
const g = globalThis as typeof globalThis & { __civiclensBudget?: BudgetState };
let state: BudgetState = (g.__civiclensBudget ??= { dayKey: currentDayKey(), spentUsd: 0 });

function rollIfNeeded(): void {
  const today = currentDayKey();
  if (state.dayKey !== today) {
    // 공유 참조 유지를 위해 제자리 변경
    state.dayKey = today;
    state.spentUsd = 0;
  }
}

export interface BudgetStatus {
  allowed: boolean;
  spentUsd: number;
  capUsd: number;
  remainingUsd: number;
}

/** 현재 일일 예산 여유가 있는지 확인(소비하지 않음). */
export function checkBudget(estCostUsd: number = EST_SESSION_COST_USD): BudgetStatus {
  rollIfNeeded();
  const remaining = DAILY_BUDGET_USD - state.spentUsd;
  return {
    allowed: state.spentUsd + estCostUsd <= DAILY_BUDGET_USD,
    spentUsd: state.spentUsd,
    capUsd: DAILY_BUDGET_USD,
    remainingUsd: Math.max(0, remaining),
  };
}

/** 발급 성공 시 추정 비용을 누적한다. */
export function recordSpend(estCostUsd: number = EST_SESSION_COST_USD): void {
  rollIfNeeded();
  state.spentUsd += estCostUsd;
}

/** 테스트용: 누적 초기화. */
export function __resetBudget(): void {
  state.dayKey = currentDayKey();
  state.spentUsd = 0;
}
