# CivicLens 병렬 작업 계획 (개발자 3인 동시)

> **목표**: 3명이 **충돌 없이 동시에** 개발한다. 핵심 원리는 단 하나 —
> **"공유 계약(`shared/contract`)을 Day 0에 동결하고, 각자 자기 디렉터리 안에서만 작업한다."**
> 모든 스트림은 *구현*이 아니라 *인터페이스(타입·스키마)* 에 의존하므로, 서로의 코드가 없어도 목(mock)으로 끝까지 진행할 수 있다.

관련 문서: PRD `docs/prd/PRD_civic-companion.md` · 작업 규약 `AGENTS.md` · 단일 Task Plan `docs/todo_plan/PLAN_civic-companion.md`

---

## 0. 모노레포 구조 & 소유권 (디렉터리 = 경계)

```
civiclens/
├─ shared/                       # 🔒 공유 계약 (Day 0 동결, 변경은 합의)
│   └─ contract/
│       ├─ api.ts                #   REST 요청/응답 타입 + ApiResponse<T> + 에러코드
│       ├─ tools.ts              #   Realtime Function Calling 도구 스키마 + 결과 타입
│       ├─ realtime.ts           #   클라이언트↔Realtime 메시지/이벤트 프로토콜
│       └─ i18n-keys.ts          #   i18n 키 목록(문자열 키만, 번역은 각 스트림)
│
├─ mobile/        ← 👤 A (Mobile Frontend)
│   ├─ app/                      # expo-router 화면 (index/session/my/record/[id]/benchmark)
│   ├─ components/               # AudioVisualizer, ConnectionOverlay, KnowledgePanel, ...
│   ├─ hooks/use-live-session.ts # Realtime WS 세션 라이프사이클
│   ├─ lib/openai/realtime-ws.ts # WebSocket 전송 (ek_ 토큰)
│   ├─ lib/{audio,camera}/       # expo-audio / expo-camera 캡처·재생
│   ├─ lib/api-client.ts         # server REST 호출 (contract/api.ts 기반)
│   ├─ lib/tool-dispatch.ts      # 모델 tool-call → api-client 라우팅
│   └─ i18n/                     # ko/en/zh/vi/th 번역값
│
├─ server/        ← 👤 B (Backend Platform & Security)
│   ├─ api/v1/realtime/session/  # ek_ 발급 + limits + 레이트리밋 + budget cap
│   ├─ api/v1/recognize/         # gpt-4o 비전 폴백 라우트(도메인 함수는 C 제공)
│   ├─ api/v1/records/           # Record CRUD + PII 마스킹 파이프라인
│   ├─ api/v1/offices/nearby/    # 인근 창구
│   ├─ api/v1/health/
│   ├─ lib/openai/               # 서버 OpenAI 클라이언트, 토큰 발급
│   ├─ lib/security/             # rate-limit, budget-guard, pii-scrub, cors
│   └─ lib/db/                   # Record 저장소
│
└─ scripts/ + server/api/v1/{rag,benchmark}/  ← 👤 C (AI Hub Data & Intelligence)
    ├─ shared/contract/tools.ts  #   도구 선언 + 시스템 프롬프트 작성 주체(계약 일부)
    ├─ server/lib/rag/           #   retriever.ts, embed.ts, vector-store.ts
    ├─ server/lib/domain/        #   recognize-document.ts(분류 프롬프트/라벨) — B 라우트가 호출
    ├─ server/api/v1/rag/query/  #   RAG 검색 엔드포인트
    ├─ server/api/v1/benchmark/  #   정확도 집계 엔드포인트
    └─ scripts/                  #   ingest-aihub.ts, build-eval-set.ts, run-benchmark.ts
```

**철칙**: 본인 스트림 디렉터리 밖의 파일을 수정하지 않는다. 다른 스트림이 필요로 하는 것은 **전부 `shared/contract`에 타입으로 존재**해야 한다. 계약을 바꿔야 하면 **3인 합의 후** 한 번에 반영(아래 §4).

---

## 스트림 요약

| | 👤 A — Mobile Frontend | 👤 B — Backend Platform & Security | 👤 C — AI Hub Data & Intelligence |
|---|---|---|---|
| **소유** | `mobile/` 전체 | `server/api/v1/{realtime,recognize,records,offices,health}`, `server/lib/{openai,security,db}` | `shared/contract/tools.ts`, `server/lib/{rag,domain}`, `server/api/v1/{rag,benchmark}`, `scripts/` |
| **책임 FR** | FR-002, FR-004, FR-007, FR-009, FR-010(UI), FR-014(UX) | FR-001, FR-008, FR-015(PII), FR-016(비용가드), §4.5 보안 | FR-003(분류), FR-005, FR-006, FR-012(벤치마크), FR-013(적재) |
| **한 줄** | "카메라·음성으로 말하면 음성으로 답하는 앱" | "안전하게 토큰 발급하고 기록을 PII 없이 저장" | "AI Hub로 인식을 grounding하고 정확도를 증명" |
| **외부 의존** | contract만 (B/C는 mock) | contract만 | contract만 (+ AI Hub 원천 데이터) |

---

## 1. Day 0 — 계약 동결 (3인 공동, 반나절)

병렬 작업 시작 **전에** 반드시 함께 끝낸다. 이게 안 되면 병렬화가 무너진다.

- [ ] `shared/contract/api.ts` — 모든 `/api/v1/*`의 Request/Response/Error 타입 (PRD §5.1과 1:1)
- [ ] `shared/contract/tools.ts` — 6개 도구의 입력 스키마 + 결과 타입 (PRD §5.1 도구표)
- [ ] `shared/contract/realtime.ts` — WS 연결/세션설정/오디오·이미지 전송/tool-call 이벤트 메시지 타입
- [ ] `shared/contract/i18n-keys.ts` — 화면별 i18n 키 enum
- [ ] 모노레포 부트스트랩: `mobile/`(Expo) + `server/`(Next.js API only) + `shared/` 경로 alias, Metro `watchFolders`에 `shared` 추가
- [ ] **계약 동결 선언** → 이후 변경은 §4 절차로만

> 산출물은 "스켈레톤 + 타입"이면 충분하다. 구현은 비워두고 각자 채운다.

---

## 2. 스트림별 작업 (병렬, mock 기반)

### 👤 A — Mobile Frontend (`mobile/`)
- [ ] Expo 부트스트랩 + expo-router 5화면 라우팅 골격
- [ ] `lib/openai/realtime-ws.ts` — ek_ 토큰으로 WS 연결, 세션 config 전송
- [ ] `lib/{audio,camera}` 재배선 — expo-audio 마이크 PCM, expo-camera 프레임
- [ ] `use-live-session.ts` — 연결/말하기/듣기/tool-call 수신 상태머신
- [ ] `lib/tool-dispatch.ts` — tool-call → `api-client` 호출 → 결과 주입
- [ ] `lib/api-client.ts` — contract 기반 typed fetch (**B 없을 땐 mock 서버/MSW**)
- [ ] 화면 5종 + 상태(loading/empty/error/success/no-permission) — PRD §5.4.1
- [ ] i18n 5개 언어 번역값 채우기
- **언블락 전략**: B/C가 없어도 `contract` 목 응답으로 전 화면·전 플로우 완성.

### 👤 B — Backend Platform & Security (`server/api`, `server/lib/{openai,security,db}`)
- [ ] `POST /api/v1/realtime/session` — OpenAI ek_ 발급 + `limits`(300s/4000tok/40turn) + `sessionToken`
- [ ] `lib/security/rate-limit.ts`(IP 6/min·60/day) + `budget-guard.ts`(일일 캡→503) + `cors.ts`(화이트리스트)
- [ ] `lib/security/pii-scrub.ts` — 정규식(외국인등록번호/주민번호/전화/이메일) + NER, `422 PII_DETECTED`
- [ ] `POST/GET /api/v1/records` + `lib/db` — 비식별 구조화 스키마 저장(`piiScrubbed`)
- [ ] `POST /api/v1/recognize` 라우트 — **C의 `lib/domain/recognize-document.ts` 호출**(라우트만 소유)
- [ ] `GET /api/v1/offices/nearby`, `GET /api/v1/health`
- [ ] PII 스캔 테스트(저장 데이터에 PII 없음)
- **언블락 전략**: C의 `recognize-document`/`rag`는 contract 시그니처로 **stub** 두고 진행, 통합 시 교체.

### 👤 C — AI Hub Data & Intelligence (`shared/contract/tools.ts`, `server/lib/{rag,domain}`, `scripts/`)
- [ ] `shared/contract/tools.ts` 도구 선언 + **시스템 프롬프트**(민원 도우미 페르소나, 환각 가드 규칙 FR-014)
- [ ] `scripts/ingest-aihub.ts` — 적재·정규화·`text-embedding-3-small` 임베딩·벡터 upsert (FR-013)
- [ ] `lib/rag/{retriever,embed,vector-store}.ts` + `POST /api/v1/rag/query` (FR-005/006)
- [ ] `lib/domain/recognize-document.ts` — gpt-4o 분류 프롬프트·라벨·confidence (B 라우트가 호출)
- [ ] `scripts/build-eval-set.ts`(hold-out 분리, 누수 방지) + `run-benchmark.ts`(top-1, chrF/BLEU)
- [ ] `GET /api/v1/benchmark` — 집계 응답
- **언블락 전략**: 엔드포인트는 contract 응답을 먼저 하드코딩→실데이터로 교체. A는 즉시 화면 연동 가능.

---

## 3. 통합 순서 (의존성 최소화 설계)

병렬로 가다가 **합류 지점만** 순서가 있다:

```
Day0  계약 동결 ───────────────────────────────────┐ (3인 공동)
        │                                            │
A ──────┼─ 화면·세션·tool-dispatch (mock) ──┐        │
B ──────┼─ session 토큰·records·security ───┼─ 통합1 ─┼─ 통합2 ── 데모
C ──────┴─ tools/prompt·rag·recognize·bench ┘        │
                                                     │
통합1(중반): A↔B realtime/session 실연결 + A↔C tools.ts 실연결
통합2(후반): recognize·rag·records·benchmark 실데이터 종단 연결 + PII/비용가드 검증
```

- **A↔B 합류점**: `realtime/session` 응답(ek_, limits, sessionToken). 이거 하나면 A가 실세션 연결.
- **A↔C 합류점**: `tools.ts` 도구 스키마/시스템 프롬프트. A의 tool-dispatch가 그대로 사용.
- **B↔C 합류점**: B의 `recognize` 라우트가 C의 `recognize-document()` 호출(시그니처는 contract). 그 외 B·C는 독립.

---

## 4. 충돌 방지 규칙

1. **디렉터리 소유권 절대 준수.** 남의 디렉터리 파일을 고치지 않는다. 필요하면 그 스트림에 PR/이슈로 요청.
2. **`shared/contract`는 공유지.** 변경 제안은 PR로 올리고 **3인 리뷰 후** 머지. 머지 즉시 전원 rebase. 계약 변경은 하루 1회 "동기화 윈도우"에 몰아서.
3. **브랜치 전략**: `main` 보호. `feat/a-*`, `feat/b-*`, `feat/c-*` 접두로 충돌 영역 시각화. 1인 1스트림 = 파일 충돌 거의 0.
4. **mock 우선.** 다른 스트림 미완성은 핑계가 안 된다 — contract 목으로 끝까지 만든다.
5. **i18n 키는 계약, 값은 자유.** 키 추가는 `i18n-keys.ts`(공유)에, 번역값은 각 스트림 파일에.
6. **에러코드 단일 출처**: `shared/contract/api.ts`의 enum만 사용(하드코딩 금지). PRD §5.1과 일치.
7. **데일리 5분 싱크**: 각자 "계약 바꿀 일 있나?"만 확인. 없으면 그대로 병렬.

---

## 5. Definition of Done (스트림 공통)

- 본인 소유 디렉터리만 변경 / `shared/contract` 변경은 합의 머지
- `npm run type-check`(각 패키지) 통과, contract 타입과 불일치 0
- 보안 규칙(비밀키 서버 전용, PII 비저장, 토큰·레이트·budget 가드) 위반 0 — B 검증
- 신규 사용자 문자열은 `i18n-keys.ts` 키 + 5개 언어 값(미번역 en 폴백 + TODO)
- 통합2 후 데모 시나리오 3종(§PRD 9) E2E 그린
