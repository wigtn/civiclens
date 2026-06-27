// AudioVisualizer — 듣기/말하기 상태를 바 애니메이션으로 표현.
import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import type { LiveStatus } from '@contract/realtime';
import { colors } from '@/theme';

const BARS = 5;

interface Props {
  status: LiveStatus;
}

export function AudioVisualizer({ status }: Props) {
  const active = status === 'listening' || status === 'speaking';
  const values = useRef(Array.from({ length: BARS }, () => new Animated.Value(0.3))).current;

  useEffect(() => {
    if (!active) {
      values.forEach((v) => v.setValue(0.3));
      return;
    }
    const animations = values.map((v, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(v, { toValue: 1, duration: 320 + i * 80, useNativeDriver: true }),
          Animated.timing(v, { toValue: 0.3, duration: 320 + i * 80, useNativeDriver: true }),
        ]),
      ),
    );
    animations.forEach((a) => a.start());
    return () => animations.forEach((a) => a.stop());
  }, [active, values]);

  const color = status === 'speaking' ? colors.primary : colors.success;

  return (
    <View style={styles.row} accessibilityElementsHidden>
      {values.map((v, i) => (
        <Animated.View
          key={i}
          style={[styles.bar, { backgroundColor: color, transform: [{ scaleY: v }] }]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 48 },
  bar: { width: 8, height: 48, borderRadius: 4 },
});
