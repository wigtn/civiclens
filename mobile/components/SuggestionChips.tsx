// SuggestionChips — 데모용 빠른 질문(텍스트로 세션에 전송).
// 행정용어 질문 → 근거 ✓, 주관 질문 → 추정 ⚠ 으로 B 대비를 보여준다.
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { useAgentStrings } from '@/i18n/agent';
import { colors, fontSize, radius, spacing } from '@/theme';

interface Props {
  onAsk: (text: string) => void;
}

export function SuggestionChips({ onAsk }: Props) {
  const a = useAgentStrings();
  const items = [a.askTerm, a.askField, a.askOpinion];
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
      keyboardShouldPersistTaps="handled"
    >
      {items.map((q) => (
        <Pressable key={q} style={styles.chip} onPress={() => onAsk(q)} accessibilityRole="button">
          <Text style={styles.chipText}>{q}</Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { gap: spacing.sm, paddingHorizontal: spacing.xs },
  chip: {
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: radius.pill,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipText: { color: colors.text, fontSize: fontSize.sm, fontWeight: '600' },
});
