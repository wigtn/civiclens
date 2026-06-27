// ConnectionOverlay — 연결 중/재연결/에러 시 카메라 위에 덮는 오버레이.
import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import type { LiveStatus } from '@contract/realtime';
import { colors, fontSize, spacing } from '@/theme';

interface Props {
  status: LiveStatus;
  connectingLabel: string;
  errorLabel: string;
}

export function ConnectionOverlay({ status, connectingLabel, errorLabel }: Props) {
  const show = status === 'connecting' || status === 'reconnecting' || status === 'error';
  if (!show) return null;

  const isError = status === 'error';
  return (
    <View style={styles.overlay} accessibilityRole="alert">
      {isError ? <Text style={styles.icon}>⚠️</Text> : <ActivityIndicator size="large" color={colors.onOverlay} />}
      <Text style={styles.label}>{isError ? errorLabel : connectingLabel}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    backgroundColor: colors.overlay,
    padding: spacing.xl,
  },
  icon: { fontSize: 44 },
  label: { color: colors.onOverlay, fontSize: fontSize.md, fontWeight: '600', textAlign: 'center' },
});
