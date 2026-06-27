# CivicLens — Mobile (👤 A)

Expo + React Native 앱. **스트림 A** 소유 영역(`mobile/` 전체). B/C 미완성 구간은
`shared/contract` mock(`EXPO_PUBLIC_USE_MOCK=1`)으로 전 화면·전 플로우가 동작한다.

## 실행

```bash
cd mobile
cp .env.example .env          # EXPO_PUBLIC_USE_MOCK=1 (mock), API_BASE_URL 설정
npm install
npx expo install              # 설치된 SDK에 맞춰 패키지 버전 정합화(권장)
npm start                     # Expo Go 로 QR 스캔
npm run type-check            # tsc --noEmit (PR 전 필수)
```

> 카메라/마이크는 실기기 권장. 저수준 PCM 스트리밍/재생은 Expo Go 한계로
> 개발 빌드의 네이티브 브리지가 필요하다(`lib/audio` 의 NATIVE SEAM 주석 참조, PRD §6.1).

## 구조

```
app/                 expo-router 화면 (index·session·my·record/[id]·benchmark)
components/           AudioVisualizer·ConnectionOverlay·KnowledgePanel·LanguagePicker·StateView
hooks/use-live-session.ts   연결/말하기/듣기/tool-call 상태머신(LiveSessionApi)
lib/openai/realtime-ws.ts   OpenAI Realtime WebSocket 전송(ek_ 토큰)
lib/audio · lib/camera      expo-audio PCM · expo-camera 프레임
lib/api-client.ts           contract 기반 typed fetch (+ mock 토글)
lib/tool-dispatch.ts        tool_call → api-client → tool_result
lib/mock/                    B/C 미완성 대비 contract 목 응답
i18n/                        ko·en·zh·vi·th (키는 @contract/i18n-keys, 값은 여기)
```

## 계약 의존 (수정 금지: `shared/contract/*`)

- `api.ts` — REST 타입·`ApiResponse`·`ApiErrorCode`
- `tools.ts` — `ToolName`·`ToolArgMap`·`ToolResultMap`
- `realtime.ts` — `LiveStatus`·`ClientInput`·`ServerEvent`·`LiveSessionApi`
- `i18n-keys.ts` — `I18nKey`·`SUPPORTED_LANGS`

계약을 바꿔야 하면 3인 합의(PARALLEL_WORK_PLAN §4). 본 스트림은 `mobile/` 밖 파일을 수정하지 않는다.

## 인증/권한 스텁

`/my`(author)·`/benchmark`(admin) 게이트는 B 소유. 현재는 `HAS_ACCESS`/`IS_ADMIN`
상수로 `no-permission` 상태를 시연하며, 통합 시 B의 인증으로 교체한다.
