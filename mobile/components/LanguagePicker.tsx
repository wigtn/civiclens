// LanguagePicker — 5개 언어 선택(FR-007). 큰 터치 타깃·고대비.
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { LangCode } from '@contract/api';
import { SUPPORTED_LANGS, LANG_LABELS } from '@/i18n';
import { colors, fontSize, radius, spacing } from '@/theme';

interface Props {
  value: LangCode;
  onChange: (lang: LangCode) => void;
}

export function LanguagePicker({ value, onChange }: Props) {
  return (
    <View style={styles.grid}>
      {SUPPORTED_LANGS.map((lang) => {
        const selected = lang === value;
        return (
          <Pressable
            key={lang}
            onPress={() => onChange(lang)}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            style={[styles.chip, selected && styles.chipSelected]}
          >
            <Text style={[styles.label, selected && styles.labelSelected]}>{LANG_LABELS[lang]}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, justifyContent: 'center' },
  chip: {
    minWidth: 92,
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.bg,
  },
  chipSelected: { borderColor: colors.primary, backgroundColor: colors.surfaceAlt },
  label: { color: colors.textMuted, fontSize: fontSize.md, fontWeight: '700' },
  labelSelected: { color: colors.primary },
});
