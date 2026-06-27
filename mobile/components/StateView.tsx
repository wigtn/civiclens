// StateView — loading/empty/error/no-permission 공통 상태 표현(PRD §5.4.1).
import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fontSize, radius, spacing } from '@/theme';

export type ViewState = 'loading' | 'empty' | 'error' | 'no-permission' | 'success';

const ICON: Record<Exclude<ViewState, 'success'>, string> = {
  loading: '⏳',
  empty: '🗂️',
  error: '⚠️',
  'no-permission': '🔒',
};

interface Props {
  state: Exclude<ViewState, 'success'>;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function StateView({ state, message, actionLabel, onAction }: Props) {
  return (
    <View style={styles.container} accessibilityRole="summary">
      {state === 'loading' ? (
        <ActivityIndicator size="large" color={colors.primary} />
      ) : (
        <Text style={styles.icon}>{ICON[state]}</Text>
      )}
      <Text style={styles.message}>{message}</Text>
      {actionLabel && onAction ? (
        <Pressable style={styles.button} onPress={onAction} accessibilityRole="button">
          <Text style={styles.buttonText}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.md,
    backgroundColor: colors.bg,
  },
  icon: { fontSize: 48 },
  message: {
    color: colors.textMuted,
    fontSize: fontSize.md,
    textAlign: 'center',
    lineHeight: fontSize.md * 1.5,
  },
  button: {
    marginTop: spacing.sm,
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.pill,
  },
  buttonText: { color: colors.primaryText, fontSize: fontSize.md, fontWeight: '700' },
});
