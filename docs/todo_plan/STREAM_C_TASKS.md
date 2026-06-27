# Stream C — AI Hub Data & Intelligence (작업 체크리스트)

> 브랜치 `feat/c-ai-hub` · 소유 영역: `shared/contract/tools.ts`(선언/프롬프트), `server/lib/{ai,rag,domain}`, `server/api/v1/{rag,benchmark}`, `scripts/`
> 의존: `shared/contract`(import type만) · AI Hub 원천 데이터(`data/aihub/`, gitignore)

## 스캐폴드 현황 (이미 생성됨)

- [x] Node 빌드 설정: `package.json`, `tsconfig.json`(NodeNext), `.env.example`
- [x] `server/lib/ai/openai.ts` — OpenAI 클라이언트 + 모델 상수
- [x] `server/lib/ai/realtime-tools.ts` — 6개 도구 선언 + 민원 도우미 시스템 프롬프트(환각 가드)
- [x] `server/lib/rag/{embed,vector-store,retriever}.ts` — 임베딩·in-memory 코사인·검색
- [x] `server/lib/domain/recognize-document.ts` — gpt-4o 비전 분류 + FR-014 가드
- [x] `server/lib/domain/benchmark-store.ts` — BenchmarkRun 저장/조회
- [x] `server/api/v1/rag/query/handler.ts`, `server/api/v1/benchmark/handler.ts` — 순수 핸들러(B가 마운트)
- [x] `scripts/{ingest-aihub,build-eval-set,run-benchmark}.ts` — 파이프라인 골격

## 실데이터 연결 (핵심 TODO)

- [ ] `scripts/ingest-aihub.ts > loadNormalized()` — AI Hub 원천 파서 구현
  - [ ] 공공행정문서 OCR 용어 → `source:'admin_term'`
  - [ ] 국내 법률 다국어 번역(5개국어) → `source:'legal_translation'`
  - [ ] `sourceLabel`(데이터셋 출처) 보존, 비영리·연구 범위 준수
- [ ] `scripts/build-eval-set.ts > loadLabeled()` — OCR 라벨에서 (이미지, 문서종류) 쌍 로드
- [ ] `server/lib/domain/recognize-document.ts > DOC_TYPES` — AI Hub 문서종류로 확장
- [ ] 벤치마크 실행 → `overallTop1` 데모 숫자 확보(목표 ≥90%)

## 품질/통합

- [ ] `npm install` 후 `npm run type-check` 그린
- [ ] in-memory 벡터스토어 → (선택) pgvector 전환
- [ ] 번역 chrF/BLEU 평가(`perLang`) 추가 — hold-out 쌍 기준
- [ ] 데이터 누수 점검: hold-out이 RAG 인덱스/few-shot에 섞이지 않음(`datasetVersion` 기록)

## 합류점(다른 스트림과)

- **→ B**: `recognize-document.ts`의 `recognizeDocument()`를 B의 `/api/v1/recognize` 라우트가 호출 / 두 핸들러(`rag/query`, `benchmark`)를 B가 라우터에 마운트(+인증·레이트리밋)
- **→ A**: `realtime-tools.ts`의 `REALTIME_TOOLS`·`getSystemInstruction()`을 B의 session route가 세션 config로 내려주면 A의 tool-dispatch가 사용
- **계약 변경 필요 시**: `shared/contract/*` 수정은 3인 합의 PR(임의 변경 금지)

## 실행 명령

```bash
cp .env.example .env        # OPENAI_API_KEY 채우기
npm install
npm run ingest              # AI Hub 적재·임베딩(현재 시드 2건)
npm run eval:build          # 평가셋 hold-out 분리
npm run benchmark           # top-1 정확도 산출 → /api/v1/benchmark
npm run type-check
```
