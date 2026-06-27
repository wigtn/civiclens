// JourneyPanel — A: 민원 여정 내비게이터. 인식된 서류의 전체 절차를
// 타임라인(지금/다음)으로 보여주고, 단계별 필요서류·방문처를 안내한다.
import React from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { CivicJourney, JourneyStep } from '@/lib/journey';
import { useAgentStrings } from '@/i18n/agent';
import { colors, fontSize, radius, shadows, spacing } from '@/theme';

interface Props {
  journey: CivicJourney | null;
  visible: boolean;
  onClose: () => void;
}

export function JourneyPanel({ journey, visible, onClose }: Props) {
  const a = useAgentStrings();
  const insets = useSafeAreaInsets();
  if (!journey) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={[styles.sheet, { paddingBottom: insets.bottom + spacing.lg }]}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <Text style={styles.title}>{a.journeyTitle}</Text>
            <Pressable onPress={onClose} accessibilityRole="button" hitSlop={10}>
              <Text style={styles.close}>{a.close}</Text>
            </Pressable>
          </View>
          <Text style={styles.subtitle}>{journey.title}</Text>

          <ScrollView contentContainerStyle={styles.steps}>
            {journey.steps.map((step, i) => (
              <StepRow key={step.key} step={step} index={i} last={i === journey.steps.length - 1} a={a} />
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function StepRow({
  step,
  index,
  last,
  a,
}: {
  step: JourneyStep;
  index: number;
  last: boolean;
  a: ReturnType<typeof useAgentStrings>;
}) {
  const isCurrent = step.status === 'current';
  return (
    <View style={styles.stepRow}>
      <View style={styles.rail}>
        <View style={[styles.dot, isCurrent ? styles.dotCurrent : styles.dotUpcoming]}>
          <Text style={[styles.dotNum, isCurrent && styles.dotNumCurrent]}>{index + 1}</Text>
        </View>
        {!last ? <View style={styles.line} /> : null}
      </View>
      <View style={[styles.card, isCurrent && styles.cardCurrent]}>
        {isCurrent ? (
          <View style={styles.nowTag}>
            <Text style={styles.nowTagText}>{a.now}</Text>
          </View>
        ) : null}
        <Text style={styles.stepTitle}>{step.title}</Text>
        <Text style={styles.metaLabel}>
          {a.requiredDocs}: <Text style={styles.metaValue}>{step.requiredDocs.join(', ')}</Text>
        </Text>
        <Text style={styles.metaLabel}>
          {a.office}: <Text style={styles.metaValue}>{step.office}</Text>
        </Text>
        <Text style={styles.source}>· {step.sourceLabel}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.bg,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    maxHeight: '82%',
    ...shadows.card,
  },
  handle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border, marginBottom: spacing.md },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { color: colors.text, fontSize: fontSize.lg, fontWeight: '800' },
  close: { color: colors.textMuted, fontSize: fontSize.md, fontWeight: '700' },
  subtitle: { color: colors.textMuted, fontSize: fontSize.sm, marginTop: 2, marginBottom: spacing.md },
  steps: { paddingBottom: spacing.md },
  stepRow: { flexDirection: 'row', gap: spacing.md },
  rail: { alignItems: 'center', width: 32 },
  dot: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  dotCurrent: { backgroundColor: colors.primary, borderColor: colors.primary },
  dotUpcoming: { backgroundColor: colors.surface, borderColor: colors.border },
  dotNum: { fontSize: fontSize.sm, fontWeight: '800', color: colors.textMuted },
  dotNumCurrent: { color: colors.primaryText },
  line: { flex: 1, width: 2, backgroundColor: colors.border, marginVertical: 2 },
  card: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md,
    gap: 4,
  },
  cardCurrent: { borderColor: colors.text, borderWidth: 1.5 },
  nowTag: {
    alignSelf: 'flex-start',
    backgroundColor: colors.primary,
    borderRadius: radius.sm,
    paddingVertical: 2,
    paddingHorizontal: 8,
    marginBottom: 2,
  },
  nowTagText: { color: colors.primaryText, fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },
  stepTitle: { color: colors.text, fontSize: fontSize.md, fontWeight: '700' },
  metaLabel: { color: colors.textMuted, fontSize: fontSize.sm },
  metaValue: { color: colors.text, fontWeight: '600' },
  source: { color: colors.textMuted, fontSize: 11, marginTop: 2 },
});
