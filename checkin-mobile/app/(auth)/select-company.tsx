import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { toErrorMessage, useAuth } from '@/src/hooks/AuthProvider';
import { Colors } from '@/src/theme/colors';
import { Fonts } from '@/src/theme/typography';

export default function SelectCompanyScreen() {
  const insets = useSafeAreaInsets();
  const { memberships, selectCompany } = useAuth();
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onSelect = async (companyId: string) => {
    setLoadingId(companyId);
    setError(null);
    try {
      await selectCompany(companyId);
    } catch (err) {
      setError(toErrorMessage(err, 'Unable to select company.'));
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <View style={styles.root}>
      <LinearGradient colors={[...Colors.authGradient]} style={StyleSheet.absoluteFill} />
      <View style={[styles.content, { paddingTop: insets.top + 36, paddingBottom: insets.bottom + 24 }]}>
        <View style={styles.header}>
          <MaterialIcons name="business" size={32} color="#FFFFFF" />
          <Text style={styles.title}>Select company</Text>
          <Text style={styles.subtitle}>
            Your account is linked to multiple organizations. Choose one to continue.
          </Text>
        </View>

        <View style={styles.card}>
          {error ? <Text style={styles.errorText}>{error}</Text> : null}
          <FlatList
            data={memberships}
            keyExtractor={(item) => item.companyId}
            scrollEnabled={false}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
            renderItem={({ item }) => (
              <Pressable
                style={({ pressed }) => [styles.row, pressed && { opacity: 0.85 }]}
                onPress={() => onSelect(item.companyId)}
                disabled={loadingId != null}>
                <View style={styles.rowIcon}>
                  <MaterialIcons name="domain" size={22} color={Colors.secondary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.companyName}>{item.companyName}</Text>
                  <Text style={styles.companyMeta}>{item.role.replace(/_/g, ' ')}</Text>
                </View>
                {loadingId === item.companyId ? (
                  <ActivityIndicator color={Colors.secondary} />
                ) : (
                  <MaterialIcons name="chevron-right" size={22} color={Colors.mutedForeground} />
                )}
              </Pressable>
            )}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.splash },
  content: { flex: 1, paddingHorizontal: 22, justifyContent: 'center' },
  header: { alignItems: 'center', marginBottom: 24, gap: 8 },
  title: {
    color: '#FFFFFF',
    fontSize: 26,
    fontFamily: Fonts.bold,
  },
  subtitle: {
    color: Colors.headerSubtitle,
    fontSize: 14,
    fontFamily: Fonts.regular,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 8,
  },
  card: {
    backgroundColor: Colors.card,
    borderRadius: 22,
    padding: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 8,
  },
  rowIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: Colors.secondaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  companyName: {
    fontSize: 16,
    fontFamily: Fonts.semibold,
    color: Colors.foreground,
  },
  companyMeta: {
    marginTop: 2,
    fontSize: 12,
    fontFamily: Fonts.medium,
    color: Colors.mutedForeground,
    textTransform: 'capitalize',
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: Colors.border,
    marginHorizontal: 8,
  },
  errorText: {
    color: Colors.destructive,
    fontFamily: Fonts.medium,
    fontSize: 13,
    paddingHorizontal: 8,
    paddingBottom: 8,
  },
});
