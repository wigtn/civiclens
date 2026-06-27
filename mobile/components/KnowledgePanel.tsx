// KnowledgePanel — 전사 + grounding 결과를 보여주는 하단 패널.
// 모델 음성과 별개로, RAG 출처 라벨을 노출해 "환각 대신 공인 데이터" 를 시각화.
import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import type { TranscriptLine } from '@/hooks/use-live-session';
import { colors, fontSize, radius, spacing } from '@/theme';

interface Props {
  transcripts: TranscriptLine[];
  hint: string;
}

export function KnowledgePanel({ transcripts, hint }: Props) {
  return (
    <View style={styles.panel}>
      {transcripts.length === 0 ? (
        <Text style={styles.hint}>{hint}</Text>
      ) : (
        <ScrollView contentContainerStyle={styles.list}>
          {transcripts.map((line) => (
            <View
              key={line.id}
              style={[styles.bubble, line.role === 'user' ? styles.user : styles.assistant]}
            >
              <Text style={styles.role}>{line.role === 'user' ? '나' : 'AI'}</Text>
              <Text style={styles.text}>{line.text}</Text>
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    maxHeight: 220,
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    padding: spacing.md,
  },
  hint: { color: colors.textMuted, fontSize: fontSize.md, textAlign: 'center', padding: spacing.md },
  list: { gap: spacing.sm },
  bubble: { borderRadius: radius.md, padding: spacing.sm, maxWidth: '92%' },
  user: { alignSelf: 'flex-end', backgroundColor: colors.surfaceAlt },
  assistant: { alignSelf: 'flex-start', backgroundColor: colors.primary },
  role: { color: colors.textMuted, fontSize: fontSize.sm, marginBottom: 2 },
  text: { color: colors.text, fontSize: fontSize.md, lineHeight: fontSize.md * 1.4 },
});
