import { type ReactNode } from 'react';
import { Platform, StyleSheet, View, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors } from '@/src/theme/colors';

interface ScreenSafeAreaProps {
  children: ReactNode;
  style?: ViewStyle;
  /** When true, skip top safe-area strip (screen owns a navy header). */
  edges?: 'all' | 'bottom';
}

export function ScreenSafeArea({ children, style, edges = 'all' }: ScreenSafeAreaProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.root, style]}>
      {edges === 'all' ? (
        <View style={[styles.statusBarBackdrop, { height: insets.top }]} />
      ) : null}
      <View style={styles.content}>{children}</View>
    </View>
  );
}

export function useScreenInsets() {
  const insets = useSafeAreaInsets();
  // Absolute tab bar (56 + bottom inset) — match compass-dms content clearance.
  const tabBarClearance = 100;

  return {
    top: insets.top,
    bottom: insets.bottom,
    contentPaddingBottom: (Platform.OS === 'web' ? 34 : 0) + tabBarClearance,
    tabBarClearance,
  };
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  statusBarBackdrop: {
    backgroundColor: Colors.primary,
  },
  content: {
    flex: 1,
  },
});
