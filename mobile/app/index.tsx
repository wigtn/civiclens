// 랜딩 + 언어 선택(FR-007). Primary state: success.
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useI18n } from '@/i18n/context';
import { LanguagePicker } from '@/components/LanguagePicker';
import { colors, fontSize, radius, spacing } from '@/theme';

export default function LandingScreen() {
  const { t, lang, setLang } = useI18n();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top + spacing.xl }]}>
      <View style={styles.header}>
        <Text style={styles.logo}>CivicLens</Text>
        <Text style={styles.title}>{t('landing.title')}</Text>
        <Text style={styles.subtitle}>{t('landing.subtitle')}</Text>
      </View>

      <View style={styles.pickerBlock}>
        <Text style={styles.pickerLabel}>{t('landing.selectLanguage')}</Text>
        <LanguagePicker value={lang} onChange={setLang} />
      </View>

      <Pressable
        style={[styles.cta, { marginBottom: insets.bottom + spacing.lg }]}
        accessibilityRole="button"
        onPress={() => router.push({ pathname: '/session', params: { lang } })}
      >
        <Text style={styles.ctaText}>{t('landing.start')}</Text>
      </Pressable>

      <View style={styles.links}>
        <Pressable onPress={() => router.push('/my')} accessibilityRole="link">
          <Text style={styles.link}>{t('records.title')}</Text>
        </Pressable>
        <Pressable onPress={() => router.push('/benchmark')} accessibilityRole="link">
          <Text style={styles.link}>{t('benchmark.accuracy')}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, paddingHorizontal: spacing.lg },
  header: { gap: spacing.sm, marginTop: spacing.xl },
  logo: { color: colors.primary, fontSize: fontSize.md, fontWeight: '800', letterSpacing: 1 },
  title: { color: colors.text, fontSize: fontSize.xxl, fontWeight: '800', lineHeight: fontSize.xxl * 1.1 },
  subtitle: { color: colors.textMuted, fontSize: fontSize.md, lineHeight: fontSize.md * 1.5 },
  pickerBlock: { flex: 1, justifyContent: 'center', gap: spacing.md },
  pickerLabel: { color: colors.text, fontSize: fontSize.lg, fontWeight: '700', textAlign: 'center' },
  cta: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.lg,
    borderRadius: radius.pill,
    alignItems: 'center',
  },
  ctaText: { color: colors.primaryText, fontSize: fontSize.lg, fontWeight: '800' },
  links: { flexDirection: 'row', justifyContent: 'center', gap: spacing.xl, paddingBottom: spacing.md },
  link: { color: colors.textMuted, fontSize: fontSize.sm, textDecorationLine: 'underline' },
});
