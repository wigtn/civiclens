// KnowledgePanel — 전사 + grounding 결과를 보여주는 하단 패널.
// 모델 음성과 별개로, RAG 출처 라벨을 노출해 "환각 대신 공인 데이터" 를 시각화.
import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import type { TranscriptLine } from '@/hooks/use-live-session';
import { useAgentStrings } from '@/i18n/agent';
import { colors, fontSize, radius, spacing } from '@/theme';

interface Props {
  transcripts: TranscriptLine[];
  hint: string;
}

export function KnowledgePanel({ transcripts, hint }: Props) {
  const a = useAgentStrings();
  return (
    <View style={styles.panel}>
      {transcripts.length === 0 ? (
        <Text style={styles.hint}>{hint}</Text>
      ) : (
        <ScrollView contentContainerStyle={styles.list}>
          {transcripts.map((line) => {
            const isUser = line.role === 'user';
            const g = line.grounding;
            return (
              <View key={line.id} style={[styles.bubble, isUser ? styles.user : styles.assistant]}>
                <Text style={[styles.role, isUser ? styles.roleUser : styles.roleAi]}>
                  {isUser ? '나' : 'AI'}
                </Text>
                <Text style={[styles.text, isUser ? styles.textUser : styles.textAi]}>{line.text}</Text>
                {/* B — Grounding Sentinel: 근거 ✓ / 추정 ⚠ */}
                {g ? (
                  <>
                    <View style={[styles.badge, g.grounded ? styles.badgeOk : styles.badgeWarn]}>
                      <Text style={[styles.badgeText, g.grounded ? styles.badgeTextOk : styles.badgeTextWarn]}>
                        {g.grounded ? `✓ ${a.grounded}` : `⚠ ${a.estimated}`}
                        {g.grounded && g.sourceLabel ? ` · ${g.sourceLabel}` : ''}
                      </Text>
                    </View>
                    {!g.grounded ? <Text style={styles.guard}>{a.notInOfficialData}</Text> : null}
                  </>
                ) : null}
              </View>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    maxHeight: 220,
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  hint: { color: colors.textMuted, fontSize: fontSize.md, textAlign: 'center', padding: spacing.md },
  list: { gap: spacing.sm },
  bubble: { borderRadius: radius.md, padding: spacing.sm, maxWidth: '92%' },
  user: { alignSelf: 'flex-end', backgroundColor: colors.surfaceAlt },
  assistant: { alignSelf: 'flex-start', backgroundColor: colors.primary },
  role: { fontSize: fontSize.sm, fontWeight: '700', marginBottom: 2 },
  roleUser: { color: colors.textMuted },
  roleAi: { color: 'rgba(255,255,255,0.85)' },
  text: { fontSize: fontSize.md, lineHeight: fontSize.md * 1.4 },
  textUser: { color: colors.text },
  textAi: { color: colors.primaryText },
  badge: {
    alignSelf: 'flex-start',
    marginTop: 6,
    borderRadius: radius.sm,
    borderWidth: 1,
    paddingVertical: 2,
    paddingHorizontal: 7,
  },
  badgeOk: { backgroundColor: 'rgba(30,125,52,0.12)', borderColor: colors.success },
  badgeWarn: { backgroundColor: 'rgba(154,106,0,0.12)', borderColor: colors.warning },
  badgeText: { fontSize: 11, fontWeight: '700' },
  badgeTextOk: { color: colors.success },
  badgeTextWarn: { color: colors.warning },
  guard: { color: colors.textMuted, fontSize: 11, marginTop: 4, lineHeight: 15 },
});
