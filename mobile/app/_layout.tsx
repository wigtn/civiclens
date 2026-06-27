// 루트 레이아웃 — i18n 컨텍스트 + 네비게이션 스택.
import React from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { I18nProvider } from '@/i18n/context';
import { colors } from '@/theme';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <I18nProvider>
        <StatusBar style="light" />
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: colors.surface },
            headerTintColor: colors.text,
            contentStyle: { backgroundColor: colors.bg },
          }}
        >
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="session" options={{ headerShown: false }} />
          <Stack.Screen name="my" options={{ title: 'My' }} />
          <Stack.Screen name="record/[id]" options={{ title: 'Record' }} />
          <Stack.Screen name="benchmark" options={{ title: 'Benchmark' }} />
        </Stack>
      </I18nProvider>
    </SafeAreaProvider>
  );
}
