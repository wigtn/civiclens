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
import { useLiveSession } from '@/hooks/use-live-session';
import { apiClient, ApiClientError } from '@/lib/api-client';
import { captureFrame } from '@/lib/camera';
import { StateView } from '@/components/StateView';
import { ConnectionOverlay } from '@/components/ConnectionOverlay';
import { AudioVisualizer } from '@/components/AudioVisualizer';
import { KnowledgePanel } from '@/components/KnowledgePanel';
import { colors, fontSize, radius, spacing } from '@/theme';

export default function SessionScreen() {
  const { t, lang: ctxLang } = useI18n();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ lang?: string }>();
  const lang: LangCode = params.lang && isSupportedLang(params.lang) ? params.lang : ctxLang;

  const [camPermission, requestCamPermission] = useCameraPermissions();
  const [sessionId, setSessionId] = useState<string>('');
  const [bootError, setBootError] = useState<{ code: string; message: string } | null>(null);
  const [reshoot, setReshoot] = useState(false);

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

  // 카메라 권한 확보되면 1회 부트.
  useEffect(() => {
    if (camPermission?.granted && !startedRef.current) {
      startedRef.current = true;
      void boot();
    }
  }, [camPermission?.granted, boot]);

  const onCapture = useCallback(async () => {
    const frame = await captureFrame(cameraRef.current);
    if (frame) {
      lastFrameRef.current = frame;
      live.pushFrame(frame); // 모델에 즉시 전달 → recognize_document 유도
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
  if (!camPermission.granted) {
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
      <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing="back" />

      <ConnectionOverlay
        status={live.status}
        connectingLabel={t('session.connecting')}
        errorLabel={t('state.error')}
      />

      <View style={[styles.topBar, { paddingTop: insets.top + spacing.sm }]}>
        <AudioVisualizer status={live.status} />
        <Pressable style={styles.endButton} onPress={onEnd} accessibilityRole="button">
          <Text style={styles.endText}>{t('session.end')}</Text>
        </Pressable>
      </View>

      <View style={styles.center} pointerEvents="none">
        <Text style={styles.aimHint}>{reshoot ? t('session.reshoot') : t('session.aimAtDocument')}</Text>
      </View>

      <View style={[styles.bottom, { paddingBottom: insets.bottom + spacing.md }]}>
        <KnowledgePanel transcripts={live.transcripts} hint={t('session.aimAtDocument')} />
        <Pressable style={styles.shutter} onPress={() => void onCapture()} accessibilityRole="button">
          <View style={styles.shutterInner} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
  },
  endButton: {
    backgroundColor: colors.overlay,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
  },
  endText: { color: colors.text, fontSize: fontSize.md, fontWeight: '700' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  aimHint: {
    color: colors.text,
    fontSize: fontSize.md,
    backgroundColor: colors.overlay,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    overflow: 'hidden',
    textAlign: 'center',
  },
  bottom: { gap: spacing.md, alignItems: 'center' },
  shutter: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 4,
    borderColor: colors.text,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterInner: { width: 54, height: 54, borderRadius: 27, backgroundColor: colors.text },
});
