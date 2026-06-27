// 랜딩 + 언어 선택(FR-007). Warm Civic — 크림 배경·따뜻한 히어로·코랄 CTA.
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useI18n } from '@/i18n/context';
import { LanguagePicker } from '@/components/LanguagePicker';
import { colors, fontSize, radius, shadows, spacing } from '@/theme';

export default function LandingScreen() {
  const { t, lang, setLang } = useI18n();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top + spacing.lg }]}>
      <View style={styles.header}>
        <View style={styles.brand}>
          <View style={styles.brandDot} />
          <Text style={styles.brandName}>CivicLens</Text>
        </View>
        <Text style={styles.title}>{t('landing.title')}</Text>
        <Text style={styles.subtitle}>{t('landing.subtitle')}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.pickerLabel}>{t('landing.selectLanguage')}</Text>
        <LanguagePicker value={lang} onChange={setLang} />
      </View>

      <View style={styles.spacer} />

      <Pressable
        style={({ pressed }) => [styles.cta, shadows.cta, pressed && styles.ctaPressed]}
        accessibilityRole="button"
        onPress={() => router.push({ pathname: '/session', params: { lang } })}
      >
        <Text style={styles.ctaText}>{t('landing.start')}</Text>
        <Text style={styles.ctaArrow}>→</Text>
      </Pressable>

      <View style={[styles.links, { marginBottom: insets.bottom + spacing.md }]}>
        <Pressable style={styles.linkPill} onPress={() => router.push('/my')} accessibilityRole="link">
          <Text style={styles.linkText}>{t('records.title')}</Text>
        </Pressable>
        <Pressable
          style={styles.linkPill}
          onPress={() => router.push('/benchmark')}
          accessibilityRole="link"
        >
          <Text style={styles.linkText}>{t('benchmark.accuracy')}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, paddingHorizontal: spacing.lg },
  header: { gap: spacing.sm, marginTop: spacing.md },
  brand: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  brandDot: { width: 14, height: 14, borderRadius: 7, backgroundColor: colors.primary },
  brandName: { color: colors.accent, fontSize: fontSize.md, fontWeight: '800', letterSpacing: 0.5 },
  title: {
    color: colors.text,
    fontSize: fontSize.xxl,
    fontWeight: '800',
    lineHeight: fontSize.xxl * 1.08,
    marginTop: spacing.sm,
  },
  subtitle: { color: colors.textMuted, fontSize: fontSize.md, lineHeight: fontSize.md * 1.5 },
  card: {
    marginTop: spacing.xl,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.md,
    ...shadows.card,
  },
  pickerLabel: { color: colors.text, fontSize: fontSize.lg, fontWeight: '700', textAlign: 'center' },
  spacer: { flex: 1 },
  cta: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.lg,
    borderRadius: radius.pill,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  ctaPressed: { opacity: 0.9, transform: [{ scale: 0.99 }] },
  ctaText: { color: colors.primaryText, fontSize: fontSize.lg, fontWeight: '800' },
  ctaArrow: { color: colors.primaryText, fontSize: fontSize.lg, fontWeight: '800' },
  links: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  linkPill: {
    backgroundColor: colors.accentSoft,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
  },
  linkText: { color: colors.accent, fontSize: fontSize.sm, fontWeight: '700' },
});
