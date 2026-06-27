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
- [x] `openai` SDK 설치 + 환경변수(`OPENAI_API_KEY` 서버 전용) — [B] `server/`
- [x] `server/lib/openai/{client,realtime-token}.ts` — ephemeral client secret 발급 (FR-001) — [B]
- [x] `POST /api/v1/realtime/session` 라우트 (FR-001) — [B]
- [ ] WebRTC 카메라+음성 세션 UI 재활용 (`/session`) (FR-002) — [A]
- [ ] `src/shared/openai/tools.ts` — `recognize_document`, `explain_field` 선언 + 시스템 프롬프트 (FR-003, FR-004) — [C]
- [x] 환각 가드(confidence<0.5 단정 금지) (FR-014) — [B] `/recognize` 라우트 LOW_CONFIDENCE 가드
- [x] **비용/남용 가드**: 토큰 발급 레이트리밋 + 세션 시간·토큰·턴 상한 + 일일 비용 캡(503) + CORS 화이트리스트 (FR-016, C-1) — [B]
- [ ] i18n: 한국어 + 데모 후보 1개 언어 (FR-007 부분)

### Phase 2: AI Hub Grounding & 벤치마크
- [ ] `scripts/ingest-aihub.ts` — 적재·정규화·임베딩·벡터스토어 upsert (FR-013)
- [ ] `src/back/lib/rag/{retriever,embed}.ts` (FR-005)
- [ ] `POST /api/v1/rag/query` + `lookup_admin_term`/`translate_notice` 연결 (FR-005, FR-006)
- [ ] `scripts/build-eval-set.ts` + `scripts/run-benchmark.ts` (FR-012)
- [ ] `GET /api/v1/benchmark` + `/benchmark` 대시보드 (FR-012)
- [~] `POST /api/v1/recognize` gpt-4o 비전 폴백 (FR-003 폴백) — [B] 라우트·가드 완료, C 도메인(`recognize-document`) stub 통합 대기
- [ ] 5개 언어 전체 i18n + 데모 언어 벤치마크 확정 (FR-007)

### Phase 3: 기록 & 보조 기능
- [x] `create_record` + `POST /api/v1/records`, Record 비식별 구조화 스키마 (FR-008) — [B] (GET 목록·상세 포함)
- [x] **서버측 PII 마스킹 파이프라인**(정규식+NER, 422 PII_DETECTED) + 저장 데이터 PII 스캔 테스트 (FR-015, C-2) — [B]
- [ ] `/my`, `/record/[id]` 페이지 (FR-009) — [A]
- [ ] kiosk 모드(무인민원발급기 버튼 안내) (FR-010) — [A]/[C]
- [x] `discover_office` + `GET /api/v1/offices/nearby` (FR-011, P2) — [B] (로컬 목 데이터)

### Phase 4: 마무리 & 데모
- [ ] 폴백 전략 검증(Realtime 실패→텍스트+gpt-4o) (§6.5)
- [ ] PII 마스킹 정책 적용(프레임/음성 미저장) (FR-014, §4.5)
- [ ] 데모 스크립트 3종 E2E 리허설 (§9)
- [ ] README + 제출물 + 벤치마크 숫자 캡처

## Progress

| Metric | Value |
|--------|-------|
| Total Tasks | 8/26 (+1 부분) |
| Current Phase | [B] feat/b-backend 백엔드 코어 완료 |
| Status | in_progress |

> **[B] 스트림 메모**: `server/` 는 `PARALLEL_WORK_PLAN.md` 디렉터리 규약을 따른다
> (PLAN 의 `src/back/*` 표기 = 실제 `server/lib/*`). 로컬 전용 실행(배포 없음),
> 기본 mock 모드(OpenAI 미호출), 인메모리 저장소. 검증: vitest 21/21, tsc 0, next build OK,
> 라이브 종단(session·recognize·records·offices·CORS·rate-limit 429) 확인.

## Execution Log

| Timestamp | Phase | Task | Status |
|-----------|-------|------|--------|
| 2026-06-27 | P1 | [B] `server/` 부트스트랩(Next.js API-only + shared alias) | ✅ |
| 2026-06-27 | P1 | [B] `POST /realtime/session` + ek 발급(mock 폴백) (FR-001) | ✅ |
| 2026-06-27 | P1 | [B] 보안 가드: rate-limit·budget-guard·cors·session-token (FR-016) | ✅ |
| 2026-06-27 | P2 | [B] `POST /recognize` 라우트 + 환각 가드(FR-014), C 도메인 stub | ✅ (통합 대기) |
| 2026-06-27 | P3 | [B] `POST/GET /records` + 인메모리 저장소 (FR-008) | ✅ |
| 2026-06-27 | P3 | [B] PII 마스킹 파이프라인 + 저장 PII 스캔 테스트 (FR-015) | ✅ |
| 2026-06-27 | P3 | [B] `GET /offices/nearby`, `GET /health` (FR-011) | ✅ |
| 2026-06-27 | - | [B] 검증: vitest 21/21, tsc, next build, 라이브 종단 | ✅ |
