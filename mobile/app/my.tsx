// 기록 목록(FR-009). states: loading/empty/error/no-permission/success.
import React, { useCallback, useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import type { RecordEntry } from '@contract/api';
import { useI18n } from '@/i18n/context';
import { apiClient, ApiClientError } from '@/lib/api-client';
import { StateView } from '@/components/StateView';
import { colors, fontSize, radius, spacing } from '@/theme';

// 로그인/인증은 B 소유 — 여기서는 author 권한이 있다고 가정. false 면 no-permission 경로 시연.
const HAS_ACCESS = true;

type Load = { state: 'loading' | 'error' | 'ready'; records: RecordEntry[]; code?: string };

export default function MyRecordsScreen() {
  const { t } = useI18n();
  const router = useRouter();
  const [load, setLoad] = useState<Load>({ state: 'loading', records: [] });

  const fetchRecords = useCallback(async () => {
    setLoad({ state: 'loading', records: [] });
    try {
      const records = await apiClient.listRecords();
      setLoad({ state: 'ready', records });
    } catch (e) {
      const code = e instanceof ApiClientError ? e.code : 'RECORD_FAILED';
      setLoad({ state: 'error', records: [], code });
    }
  }, []);

  useEffect(() => {
    if (HAS_ACCESS) void fetchRecords();
  }, [fetchRecords]);

  if (!HAS_ACCESS) return <StateView state="no-permission" message={t('state.noPermission')} />;
  if (load.state === 'loading') return <StateView state="loading" message={t('state.loading')} />;
  if (load.state === 'error') {
    return (
      <StateView state="error" message={t('state.error')} actionLabel={t('landing.start')} onAction={() => void fetchRecords()} />
    );
  }
  if (load.records.length === 0) return <StateView state="empty" message={t('records.empty')} />;

  return (
    <FlatList
      style={styles.list}
      contentContainerStyle={styles.content}
      data={load.records}
      keyExtractor={(r) => r.recordId}
      renderItem={({ item }) => (
        <Pressable
          style={styles.card}
          onPress={() => router.push({ pathname: '/record/[id]', params: { id: item.recordId } })}
          accessibilityRole="button"
        >
          <Text style={styles.cardTitle}>{item.visits[0]?.docTypeId ?? '—'}</Text>
          <Text style={styles.cardMeta}>
            {new Date(item.createdAt).toLocaleDateString()} · {item.language.toUpperCase()} ·{' '}
            {item.visits.length} visit(s)
          </Text>
        </Pressable>
      )}
    />
  );
}

const styles = StyleSheet.create({
  list: { backgroundColor: colors.bg },
  content: { padding: spacing.md, gap: spacing.sm },
  card: { backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md, gap: spacing.xs },
  cardTitle: { color: colors.text, fontSize: fontSize.lg, fontWeight: '700' },
  cardMeta: { color: colors.textMuted, fontSize: fontSize.sm },
});
