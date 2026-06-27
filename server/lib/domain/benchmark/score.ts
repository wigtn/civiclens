// ============================================================
// server/lib/domain/benchmark/score.ts — 👤 C
// 인식 텍스트 vs AI Hub 정답 텍스트 매칭 점수.
// 주 지표 = recall(정답 중 올바르게 읽은 비율) — "칸 라벨을 제대로 읽는가".
// ============================================================

/** 공백/구두점 정규화 후 비교(완전 일치 OCR은 비현실적 → 정규화 매칭). */
function norm(s: string): string {
  return s.replace(/\s+/g, '').replace(/[.,·:;()/\\[\]]/g, '').trim();
}

export interface DocScore {
  recall: number; // 정답 중 인식된 비율
  precision: number; // 인식 중 정답에 있는 비율
  matched: number;
  goldN: number;
}

export function scoreDoc(recognized: string[], gold: string[]): DocScore {
  const recSet = new Set(recognized.map(norm).filter(Boolean));
  const goldNorm = gold.map(norm).filter(Boolean);
  const goldSet = new Set(goldNorm);

  let matched = 0;
  for (const g of goldSet) {
    // 정확 일치 또는 인식 토큰이 정답을 포함/피포함(부분 매칭 허용)
    if (recSet.has(g) || [...recSet].some((r) => r.includes(g) || g.includes(r))) matched++;
  }
  const goldN = goldSet.size;
  const recN = recSet.size;
  return {
    recall: goldN ? matched / goldN : 0,
    precision: recN ? matched / recN : 0,
    matched,
    goldN,
  };
}
