# CivicLens — server (B: Backend Platform & Security)

`feat/b-backend` 스트림. Next.js(App Router) **API-only** 백엔드. 책임 FR: **FR-001**(ephemeral 토큰), **FR-008**(records), **FR-015**(PII 마스킹), **FR-016**(비용·남용 가드), §4.5 보안.

타입 계약은 `../shared/contract`(동결)에 의존하며, C 소유 도메인(`recognize-document`, RAG)은 통합 전까지 stub 으로 둔다.

## 로컬 실행 (배포 없음)

```bash
cd server
npm install
cp .env.example .env          # 선택: 비워두면 mock 모드(OpenAI 미호출)
npm run dev                    # http://localhost:3001  (포트 충돌 시 -p 변경)
npm test                      # vitest (PII/레이트리밋/records 21 케이스)
npm run type-check            # tsc --noEmit
npm run build                 # next build
```

> **기본은 mock 모드**: `CIVICLENS_USE_OPENAI=1` + `OPENAI_API_KEY` 가 모두 설정될 때만
> 실제 OpenAI Realtime ephemeral 토큰을 발급한다. 그 외에는 가짜 `ek_mock_*` 토큰으로
> 전체 플로우가 로컬에서 동작한다. 데이터(Record/레이트리밋/버짓)는 **인메모리**(재시작 시 휘발).

## API (`/api/v1/*`)

| 메서드 | 경로 | 설명 | 가드 |
|--------|------|------|------|
| POST | `/realtime/session` | ek_ 발급 + limits + sessionToken | 레이트리밋(6/min·60/day) → 버짓캡(503) |
| POST | `/recognize` | gpt-4o 비전 폴백(도메인=C stub) | 레이트리밋(20/min), ≤4MB, conf<0.5→422 |
| POST | `/records` | 민원 기록 생성(create_record) | 세션토큰, PII 파이프라인(422) |
| GET | `/records` | 본인 세션 기록 목록 | 세션토큰 |
| GET | `/records/:id` | 기록 상세 | 세션토큰 + 소유검증(403) |
| GET | `/offices/nearby` | 인근 창구(목 데이터) | 좌표검증(400) |
| GET | `/health` | 헬스체크 | - |

모든 응답은 `{ success, data }` / `{ success, error{code,message,retryable} }` 엔벨로프(§5.1).
에러코드는 `shared/contract/api.ts` 의 `ApiErrorCode` 만 사용.

## 디렉터리

```
server/
├─ app/api/v1/{realtime/session,recognize,records,records/[id],offices/nearby,health}/route.ts
├─ lib/
│  ├─ config.ts                 # env·상한·가드 상수
│  ├─ http/{respond,validate}.ts
│  ├─ openai/{client,realtime-token}.ts   # 서버 OpenAI + ek 발급(mock 폴백)
│  ├─ security/{rate-limit,budget-guard,cors,session-token,pii-scrub}.ts
│  ├─ db/record-store.ts        # 인메모리(globalThis 싱글턴)
│  └─ domain/recognize-document.ts        # ⚠️ C 소유 stub (통합 시 교체)
└─ tests/{pii-scrub,rate-limit,records}.test.ts
```

> **인메모리 상태는 `globalThis` 싱글턴**으로 둔다. Next.js 가 라우트별로 모듈을
> 분리하므로(dev/serverless), 그래야 세션토큰 서명키와 Record 저장소가
> 라우트 간(예: `POST /records` ↔ `GET /records/:id`)에 공유된다.
