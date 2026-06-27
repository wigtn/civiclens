// 기록 상세(FR-009). states: loading/error/no-permission/success.
import React, { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import type { RecordEntry } from '@contract/api';
import { useI18n } from '@/i18n/context';
import { apiClient, ApiClientError } from '@/lib/api-client';
import { StateView } from '@/components/StateView';
import { colors, fontSize, radius, shadows, spacing } from '@/theme';

type Load =
  | { state: 'loading' }
  | { state: 'error'; code: string }
  | { state: 'ready'; record: RecordEntry };

export default function RecordDetailScreen() {
  const { t } = useI18n();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [load, setLoad] = useState<Load>({ state: 'loading' });

  const fetchRecord = useCallback(async () => {
    if (!id) return;
    setLoad({ state: 'loading' });
    try {
      const record = await apiClient.getRecord(id);
      setLoad({ state: 'ready', record });
    } catch (e) {
      const code = e instanceof ApiClientError ? e.code : 'RECORD_FAILED';
      setLoad({ state: 'error', code });
    }
  }, [id]);

  useEffect(() => {
    void fetchRecord();
  }, [fetchRecord]);

  if (load.state === 'loading') return <StateView state="loading" message={t('state.loading')} />;
  if (load.state === 'error') {
    // 타인 기록 접근(FORBIDDEN/403) → no-permission, 그 외 → error.
    if (load.code === 'FORBIDDEN' || load.code === 'UNAUTHORIZED') {
      return <StateView state="no-permission" message={t('state.noPermission')} />;
    }
    return (
      <StateView state="error" message={t('state.error')} actionLabel={t('landing.start')} onAction={() => void fetchRecord()} />
    );
  }

  const { record } = load;
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.meta}>
        {new Date(record.createdAt).toLocaleString()} · {record.language.toUpperCase()}
      </Text>
      {record.visits.map((visit, i) => (
        <View key={i} style={styles.card}>
          <Text style={styles.docType}>{visit.docTypeId}</Text>
          {visit.guidedFieldKeys && visit.guidedFieldKeys.length > 0 ? (
            <View style={styles.fields}>
              <Text style={styles.fieldsLabel}>{t('record.guidedFields')}</Text>
              {visit.guidedFieldKeys.map((key) => (
                <Text key={key} style={styles.fieldItem}>• {key}</Text>
              ))}
            </View>
          ) : null}
          {visit.noteSafe ? <Text style={styles.note}>{visit.noteSafe}</Text> : null}
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.md, gap: spacing.md },
  meta: { color: colors.textMuted, fontSize: fontSize.sm },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.sm,
    ...shadows.card,
  },
  docType: { color: colors.text, fontSize: fontSize.lg, fontWeight: '800' },
  fields: { gap: spacing.xs },
  fieldsLabel: { color: colors.accent, fontSize: fontSize.sm, fontWeight: '700' },
  fieldItem: { color: colors.text, fontSize: fontSize.md },
  note: { color: colors.textMuted, fontSize: fontSize.md, lineHeight: fontSize.md * 1.5 },
});
