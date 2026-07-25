import { type ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors } from '@/src/theme/colors';
import { Fonts } from '@/src/theme/typography';

interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  right?: ReactNode;
}

export function ScreenHeader({ title, subtitle, right }: ScreenHeaderProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
      <View style={styles.textBlock}>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      {right ? <View style={styles.right}>{right}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 16,
    paddingBottom: 16,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 12,
  },
  textBlock: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    color: Colors.primaryForeground,
    fontSize: 20,
    fontFamily: Fonts.bold,
    letterSpacing: -0.2,
  },
  subtitle: {
    marginTop: 4,
    color: Colors.headerSubtitle,
    fontSize: 13,
    fontFamily: Fonts.regular,
  },
  right: {
    flexShrink: 0,
  },
});
