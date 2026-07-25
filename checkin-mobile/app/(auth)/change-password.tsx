import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';

import { toErrorMessage, useAuth } from '@/src/hooks/AuthProvider';
import { Colors } from '@/src/theme/colors';
import { Fonts } from '@/src/theme/typography';

export default function ChangePasswordScreen() {
  const insets = useSafeAreaInsets();
  const { changePassword } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async () => {
    if (!currentPassword || !newPassword) {
      setError('All fields are required.');
      return;
    }
    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('New passwords do not match.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await changePassword(currentPassword, newPassword);
      Toast.show({
        type: 'success',
        text1: 'Password updated',
        text2: 'You can continue using the app.',
      });
    } catch (err) {
      setError(toErrorMessage(err, 'Unable to change password.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.root}>
      <LinearGradient colors={[...Colors.authGradient]} style={StyleSheet.absoluteFill} />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          contentContainerStyle={[
            styles.scroll,
            { paddingTop: insets.top + 36, paddingBottom: insets.bottom + 36 },
          ]}
          keyboardShouldPersistTaps="handled">
          <View style={styles.brandBlock}>
            <MaterialIcons name="lock-reset" size={36} color="#FFFFFF" />
            <Text style={styles.title}>Change password</Text>
            <Text style={styles.subtitle}>
              Your HR admin requires a new password before you can continue.
            </Text>
          </View>

          <View style={styles.card}>
            <Field
              label="Current password"
              value={currentPassword}
              onChangeText={setCurrentPassword}
              secure
            />
            <Field
              label="New password"
              value={newPassword}
              onChangeText={setNewPassword}
              secure
            />
            <Field
              label="Confirm new password"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secure
            />

            {error ? (
              <View style={styles.errorBox}>
                <MaterialIcons name="error-outline" size={16} color={Colors.destructive} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            <Pressable
              style={({ pressed }) => [styles.primaryBtn, (loading || pressed) && { opacity: 0.88 }]}
              onPress={onSubmit}
              disabled={loading}>
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.primaryBtnText}>Update password</Text>
              )}
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

function Field({
  label,
  value,
  onChangeText,
  secure,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  secure?: boolean;
}) {
  return (
    <View style={styles.fieldGroup}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={secure}
        autoCapitalize="none"
        placeholderTextColor={Colors.placeholder}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.splash },
  flex: { flex: 1 },
  scroll: { paddingHorizontal: 22, flexGrow: 1, justifyContent: 'center' },
  brandBlock: { alignItems: 'center', marginBottom: 24, gap: 8 },
  title: {
    color: '#FFFFFF',
    fontSize: 26,
    fontFamily: Fonts.bold,
    textAlign: 'center',
  },
  subtitle: {
    color: Colors.headerSubtitle,
    fontSize: 14,
    fontFamily: Fonts.regular,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 12,
  },
  card: {
    backgroundColor: Colors.card,
    borderRadius: 22,
    padding: 22,
  },
  fieldGroup: { marginBottom: 14 },
  fieldLabel: {
    fontSize: 12,
    fontFamily: Fonts.semibold,
    color: Colors.label,
    marginBottom: 7,
  },
  input: {
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: 14,
    paddingHorizontal: 14,
    minHeight: 50,
    fontSize: 15,
    fontFamily: Fonts.medium,
    color: Colors.foreground,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.destructiveLight,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  errorText: {
    flex: 1,
    fontSize: 13,
    fontFamily: Fonts.medium,
    color: Colors.destructive,
  },
  primaryBtn: {
    marginTop: 8,
    minHeight: 52,
    borderRadius: 14,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: Fonts.bold,
  },
});
