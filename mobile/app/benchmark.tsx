// 정확도 대시보드(FR-012). states: loading/empty/error/no-permission/success.
import React, { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import type { BenchmarkResponse } from '@contract/api';
import { useI18n } from '@/i18n/context';
import { apiClient } from '@/lib/api-client';
import { StateView } from '@/components/StateView';
import { colors, fontSize, radius, spacing } from '@/theme';

// admin 게이트는 B 소유 — 여기서는 true 가정. false 면 no-permission 시연.
const IS_ADMIN = true;

type Load =
  | { state: 'loading' }
  | { state: 'error' }
  | { state: 'ready'; data: BenchmarkResponse };

export default function BenchmarkScreen() {
  const { t } = useI18n();
  const [load, setLoad] = useState<Load>({ state: 'loading' });

  const fetchBenchmark = useCallback(async () => {
    setLoad({ state: 'loading' });
    try {
      const data = await apiClient.benchmark();
      setLoad({ state: 'ready', data });
    } catch {
      setLoad({ state: 'error' });
    }
  }, []);

  useEffect(() => {
    if (IS_ADMIN) void fetchBenchmark();
  }, [fetchBenchmark]);

  if (!IS_ADMIN) return <StateView state="no-permission" message={t('benchmark.noPermission')} />;
  if (load.state === 'loading') return <StateView state="loading" message={t('state.loading')} />;
  if (load.state === 'error') {
    return (
      <StateView state="error" message={t('state.error')} actionLabel={t('landing.start')} onAction={() => void fetchBenchmark()} />
    );
  }
  if (load.data.perDocType.length === 0) return <StateView state="empty" message={t('records.empty')} />;

  const { data } = load;
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.hero}>
        <Text style={styles.heroLabel}>{t('benchmark.accuracy')}</Text>
        <Text style={styles.heroValue}>{(data.overallTop1 * 100).toFixed(1)}%</Text>
        <Text style={styles.heroMeta}>
          {data.datasetVersion} · {new Date(data.evaluatedAt).toLocaleDateString()}
        </Text>
      </View>

      <Text style={styles.sectionTitle}>By document type</Text>
      {data.perDocType.map((row) => (
        <View key={row.docTypeId} style={styles.row}>
          <Text style={styles.rowLabel}>{row.docTypeId}</Text>
          <Text style={styles.rowValue}>{(row.accuracy * 100).toFixed(0)}% · n={row.n}</Text>
        </View>
      ))}

      <Text style={styles.sectionTitle}>Translation BLEU by language</Text>
      {data.perLang.map((row) => (
        <View key={row.lang} style={styles.row}>
          <Text style={styles.rowLabel}>{row.lang.toUpperCase()}</Text>
          <Text style={styles.rowValue}>
            {row.translationBLEU === null ? '—' : row.translationBLEU.toFixed(2)}
          </Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.md, gap: spacing.sm },
  hero: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  heroLabel: { color: colors.textMuted, fontSize: fontSize.md },
  heroValue: { color: colors.success, fontSize: fontSize.xxl, fontWeight: '800' },
  heroMeta: { color: colors.textMuted, fontSize: fontSize.sm },
  sectionTitle: { color: colors.text, fontSize: fontSize.md, fontWeight: '700', marginTop: spacing.md },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  rowLabel: { color: colors.text, fontSize: fontSize.md },
  rowValue: { color: colors.textMuted, fontSize: fontSize.md },
});
