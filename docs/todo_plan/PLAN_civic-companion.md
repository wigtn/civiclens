# Task Plan: civic-companion (CivicLens)

> **Generated from**: docs/prd/PRD_civic-companion.md
> **Created**: 2026-06-27
> **Status**: pending
> **Platform**: 모바일 (Expo + React Native) + `server/` 백엔드(Next.js API only)
> **Stack**: Expo/RN + OpenAI Realtime API (`gpt-realtime`, 모바일 WebSocket) + `gpt-4o` 비전 + `text-embedding-3-small` RAG + Firebase/Postgres
> **병렬 개발(3인)**: 스트림별 분담·소유권·계약은 `docs/todo_plan/PARALLEL_WORK_PLAN.md` 참조. 아래 Phase는 기능 묶음(스트림 무관) 기준.

## Execution Config

| Option | Value | Description |
|--------|-------|-------------|
| `auto_commit` | true | 완료 시 자동 커밋 |
| `commit_per_phase` | true | Phase별 중간 커밋 (해커톤 단위 진척 관리) |
| `quality_gate` | true | /auto-commit 품질 검사 |

## Phases

### Phase 1: 환경 설정 & 실시간 코어 (MVP)
- [ ] civiclens repo 초기화 (Next.js 15, TS, Tailwind) — TimeLens 구조 차용
- [ ] `openai` SDK 설치 + 환경변수(`OPENAI_API_KEY` 서버 전용)
- [ ] `src/back/lib/openai/{client,realtime-token}.ts` — ephemeral client secret 발급 (FR-001)
- [ ] `POST /api/v1/realtime/session` 라우트 (FR-001)
- [ ] WebRTC 카메라+음성 세션 UI 재활용 (`/session`) (FR-002)
- [ ] `src/shared/openai/tools.ts` — `recognize_document`, `explain_field` 선언 + 시스템 프롬프트 (FR-003, FR-004)
- [ ] 환각 가드(confidence<0.5 단정 금지) (FR-014)
- [ ] **비용/남용 가드**: 토큰 발급 레이트리밋 + 세션 시간·토큰·턴 상한 + 일일 비용 캡(503) + CORS 화이트리스트 (FR-016, C-1)
- [ ] i18n: 한국어 + 데모 후보 1개 언어 (FR-007 부분)

### Phase 2: AI Hub Grounding & 벤치마크
- [ ] `scripts/ingest-aihub.ts` — 적재·정규화·임베딩·벡터스토어 upsert (FR-013)
- [ ] `src/back/lib/rag/{retriever,embed}.ts` (FR-005)
- [ ] `POST /api/v1/rag/query` + `lookup_admin_term`/`translate_notice` 연결 (FR-005, FR-006)
- [ ] `scripts/build-eval-set.ts` + `scripts/run-benchmark.ts` (FR-012)
- [ ] `GET /api/v1/benchmark` + `/benchmark` 대시보드 (FR-012)
- [ ] `POST /api/v1/recognize` gpt-4o 비전 폴백 (FR-003 폴백)
- [ ] 5개 언어 전체 i18n + 데모 언어 벤치마크 확정 (FR-007)

### Phase 3: 기록 & 보조 기능
- [ ] `create_record` + `POST /api/v1/records`, Record 비식별 구조화 스키마 (FR-008)
- [ ] **서버측 PII 마스킹 파이프라인**(정규식+NER, 422 PII_DETECTED) + 저장 데이터 PII 스캔 테스트 (FR-015, C-2)
- [ ] `/my`, `/record/[id]` 페이지 (FR-009)
- [ ] kiosk 모드(무인민원발급기 버튼 안내) (FR-010)
- [ ] `discover_office` + `GET /api/v1/offices/nearby` (FR-011, P2)

### Phase 4: 마무리 & 데모
- [ ] 폴백 전략 검증(Realtime 실패→텍스트+gpt-4o) (§6.5)
- [ ] PII 마스킹 정책 적용(프레임/음성 미저장) (FR-014, §4.5)
- [ ] 데모 스크립트 3종 E2E 리허설 (§9)
- [ ] README + 제출물 + 벤치마크 숫자 캡처

## Progress

| Metric | Value |
|--------|-------|
| Total Tasks | 0/26 |
| Current Phase | - |
| Status | pending |

## Execution Log

| Timestamp | Phase | Task | Status |
|-----------|-------|------|--------|
| - | - | - | - |
