// 실시간 동행 세션(FR-002·003·004·010·014). states: loading/success/error/no-permission.
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { LangCode } from '@contract/api';
import type { LiveSessionConfig } from '@contract/realtime';
import { useI18n } from '@/i18n/context';
import { isSupportedLang } from '@/i18n';
import { useAgentStrings } from '@/i18n/agent';
import { useLiveSession } from '@/hooks/use-live-session';
import { apiClient, ApiClientError, USE_MOCK } from '@/lib/api-client';
import { captureFrame } from '@/lib/camera';
import { StateView } from '@/components/StateView';
import { ConnectionOverlay } from '@/components/ConnectionOverlay';
import { AudioVisualizer } from '@/components/AudioVisualizer';
import { KnowledgePanel } from '@/components/KnowledgePanel';
import { SuggestionChips } from '@/components/SuggestionChips';
import { JourneyPanel } from '@/components/JourneyPanel';
import { colors, fontSize, radius, spacing } from '@/theme';

export default function SessionScreen() {
  const { t, lang: ctxLang } = useI18n();
  const a = useAgentStrings();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ lang?: string }>();
  const lang: LangCode = params.lang && isSupportedLang(params.lang) ? params.lang : ctxLang;

  const [camPermission, requestCamPermission] = useCameraPermissions();
  const [sessionId, setSessionId] = useState<string>('');
  const [bootError, setBootError] = useState<{ code: string; message: string } | null>(null);
  const [reshoot, setReshoot] = useState(false);
  const [journeyOpen, setJourneyOpen] = useState(false);

  const cameraRef = useRef<CameraView | null>(null);
  const lastFrameRef = useRef<string | null>(null);
  const startedRef = useRef(false);

  const live = useLiveSession({
    language: lang,
    sessionId,
    getFrame: () => lastFrameRef.current,
    onReshoot: () => {
      setReshoot(true);
      setTimeout(() => setReshoot(false), 3500);
    },
  });

  // 세션 부트스트랩: 토큰 발급(B, mock 가능) → WS 연결.
  const boot = useCallback(async () => {
    setBootError(null);
    try {
      const res = await apiClient.createSession({ language: lang, mode: 'document' });
      setSessionId(res.sessionId);
      const config: LiveSessionConfig = {
        clientSecret: res.clientSecret,
        model: res.model,
        voice: res.voice,
        language: lang,
        sessionToken: res.sessionToken,
      };
      await live.start(config);
    } catch (e) {
      const err =
        e instanceof ApiClientError
          ? { code: e.code, message: e.message }
          : { code: 'SESSION_CREATE_FAILED', message: String(e) };
      setBootError(err);
    }
  }, [lang, live]);

  // 카메라 권한 확보 시 1회 부트. mock 모드는 카메라 없이도(시뮬레이터/웹) 부트.
  useEffect(() => {
    if ((camPermission?.granted || USE_MOCK) && !startedRef.current) {
      startedRef.current = true;
      void boot();
    }
  }, [camPermission?.granted, boot]);

  const onCapture = useCallback(async () => {
    const frame = await captureFrame(cameraRef.current);
    if (frame) {
      lastFrameRef.current = frame; // 모델에 즉시 전달 → recognize_document 유도
      live.pushFrame(frame);
    } else if (USE_MOCK) {
      live.pushFrame(''); // mock: 실제 프레임 없이도 인식 플로우 트리거(시뮬레이터/웹)
    }
  }, [live]);

  const onEnd = useCallback(() => {
    live.stop();
    router.replace('/my');
  }, [live, router]);

  // ---- 상태 분기 ----------------------------------------------------------
  if (!camPermission) {
    return <StateView state="loading" message={t('state.loading')} />;
  }
  // mock 모드에서는 카메라 권한 없이도 진행(시뮬레이터/웹 테스트). 실모드만 게이트.
  if (!camPermission.granted && !USE_MOCK) {
    return (
      <StateView
        state="no-permission"
        message={t('session.permissionDenied')}
        actionLabel={t('landing.start')}
        onAction={() => void requestCamPermission()}
      />
    );
  }
  if (bootError) {
    const message =
      bootError.code === 'RATE_LIMITED'
        ? t('error.rateLimited')
        : bootError.code === 'BUDGET_EXCEEDED'
          ? t('error.budgetExceeded')
          : t('state.error');
    return (
      <StateView
        state="error"
        message={message}
        actionLabel={t('landing.start')}
        onAction={() => void boot()}
      />
    );
  }

  return (
    <View style={styles.container}>
      {camPermission.granted ? (
        <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing="back" />
      ) : (
        <View style={[StyleSheet.absoluteFill, styles.cameraPlaceholder]}>
          <Text style={styles.placeholderText}>📄</Text>
        </View>
      )}

      <ConnectionOverlay
        status={live.status}
        connectingLabel={t('session.connecting')}
        errorLabel={t('state.error')}
      />

      <View style={[styles.topBar, { paddingTop: insets.top + spacing.sm }]}>
        <AudioVisualizer status={live.status} />
        <View style={styles.topRight}>
          {USE_MOCK ? (
            <View style={styles.mockBadge}>
              <Text style={styles.mockText}>MOCK</Text>
            </View>
          ) : null}
          <Pressable style={styles.endButton} onPress={onEnd} accessibilityRole="button">
            <Text style={styles.endText}>{t('session.end')}</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.center} pointerEvents="none">
        <Text style={styles.aimHint}>{reshoot ? t('session.reshoot') : t('session.aimAtDocument')}</Text>
      </View>

      <View style={[styles.bottom, { paddingBottom: insets.bottom + spacing.md }]}>
        {/* A — 민원 여정: 서류 인식되면 등장 */}
        {live.journey ? (
          <Pressable
            style={styles.journeyBtn}
            onPress={() => setJourneyOpen(true)}
            accessibilityRole="button"
          >
            <Text style={styles.journeyBtnText}>🧭 {a.viewJourney}</Text>
            <Text style={styles.journeyBtnCount}>{live.journey.steps.length}</Text>
          </Pressable>
        ) : null}

        <SuggestionChips onAsk={live.sendText} />
        <KnowledgePanel transcripts={live.transcripts} hint={t('session.aimAtDocument')} />
        <Pressable style={styles.shutter} onPress={() => void onCapture()} accessibilityRole="button">
          <View style={styles.shutterInner} />
        </Pressable>
      </View>

      <JourneyPanel journey={live.journey} visible={journeyOpen} onClose={() => setJourneyOpen(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  cameraPlaceholder: { backgroundColor: colors.text, alignItems: 'center', justifyContent: 'center' },
  placeholderText: { fontSize: 80, opacity: 0.35 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
  },
  topRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  mockBadge: {
    backgroundColor: 'rgba(255,255,255,0.92)',
    paddingVertical: 4,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.sm,
  },
  mockText: { color: colors.text, fontSize: fontSize.sm, fontWeight: '800', letterSpacing: 1 },
  endButton: {
    backgroundColor: colors.overlay,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
  },
  endText: { color: colors.onOverlay, fontSize: fontSize.md, fontWeight: '700' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  aimHint: {
    color: colors.onOverlay,
    fontSize: fontSize.md,
    fontWeight: '600',
    backgroundColor: colors.overlay,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    overflow: 'hidden',
    textAlign: 'center',
  },
  bottom: { gap: spacing.sm, alignItems: 'stretch' },
  journeyBtn: {
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
  },
  journeyBtnText: { color: colors.primaryText, fontSize: fontSize.md, fontWeight: '800' },
  journeyBtnCount: {
    color: colors.primary,
    backgroundColor: colors.onOverlay,
    fontSize: fontSize.sm,
    fontWeight: '800',
    minWidth: 20,
    textAlign: 'center',
    borderRadius: radius.pill,
    paddingHorizontal: 6,
    overflow: 'hidden',
  },
  shutter: {
    alignSelf: 'center',
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 4,
    borderColor: colors.onOverlay,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterInner: { width: 58, height: 58, borderRadius: 29, backgroundColor: colors.onOverlay },
});
