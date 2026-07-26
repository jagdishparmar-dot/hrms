import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Link } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
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

import { toErrorMessage, useAuth } from '@/src/hooks/AuthProvider';
import { Colors } from '@/src/theme/colors';
import { Fonts } from '@/src/theme/typography';

type FieldKey = 'email' | 'password' | null;

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [focused, setFocused] = useState<FieldKey>(null);

  const brandOpacity = useRef(new Animated.Value(0)).current;
  const brandLift = useRef(new Animated.Value(18)).current;
  const formOpacity = useRef(new Animated.Value(0)).current;
  const formLift = useRef(new Animated.Value(28)).current;

  useEffect(() => {
    Animated.stagger(90, [
      Animated.parallel([
        Animated.timing(brandOpacity, { toValue: 1, duration: 420, useNativeDriver: true }),
        Animated.timing(brandLift, { toValue: 0, duration: 420, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(formOpacity, { toValue: 1, duration: 460, useNativeDriver: true }),
        Animated.timing(formLift, { toValue: 0, duration: 460, useNativeDriver: true }),
      ]),
    ]).start();
  }, [brandOpacity, brandLift, formOpacity, formLift]);

  const fieldBorder = (key: FieldKey) => {
    if (error) return Colors.destructive;
    if (focused === key) return Colors.secondary;
    return Colors.border;
  };

  const onSubmit = async () => {
    if (!email.trim() || !password) {
      setError('Email and password are required.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      try {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      } catch {
        /* optional */
      }
      await login(email, password);
      try {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {
        /* optional */
      }
    } catch (err) {
      try {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      } catch {
        /* optional */
      }
      setError(toErrorMessage(err, 'Unable to sign in.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={[...Colors.authGradient]}
        locations={[0, 0.55, 1]}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.glowTop} />
      <View style={styles.glowBottom} />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          contentContainerStyle={[
            styles.scroll,
            { paddingTop: insets.top + 36, paddingBottom: insets.bottom + 36 },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <Animated.View
            style={[
              styles.brandBlock,
              { opacity: brandOpacity, transform: [{ translateY: brandLift }] },
            ]}>
            <View style={styles.logoPlate}>
              <MaterialIcons name="fingerprint" size={28} color={Colors.primary} />
              <Text style={styles.logoWord}>CheckIn</Text>
            </View>
            <Text style={styles.brandName}>CheckIn</Text>
            <Text style={styles.brandTagline}>Employee attendance & site verification</Text>
          </Animated.View>

          <Animated.View
            style={[
              styles.card,
              { opacity: formOpacity, transform: [{ translateY: formLift }] },
            ]}>
            <Text style={styles.cardTitle}>Welcome back</Text>
            <Text style={styles.cardSubtitle}>Sign in with your work email and password</Text>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Email</Text>
              <View
                style={[
                  styles.inputWrap,
                  {
                    borderColor: fieldBorder('email'),
                    backgroundColor: focused === 'email' ? Colors.inputFocusBg : Colors.inputBg,
                  },
                ]}>
                <MaterialIcons
                  name="mail-outline"
                  size={20}
                  color={focused === 'email' ? Colors.secondary : Colors.iconMuted}
                />
                <TextInput
                  style={styles.input}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  autoComplete="email"
                  value={email}
                  onChangeText={(t) => {
                    setEmail(t);
                    if (error) setError(null);
                  }}
                  onFocus={() => setFocused('email')}
                  onBlur={() => setFocused(null)}
                  placeholder="you@company.com"
                  placeholderTextColor={Colors.placeholder}
                />
              </View>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Password</Text>
              <View
                style={[
                  styles.inputWrap,
                  {
                    borderColor: fieldBorder('password'),
                    backgroundColor: focused === 'password' ? Colors.inputFocusBg : Colors.inputBg,
                  },
                ]}>
                <MaterialIcons
                  name="lock-outline"
                  size={20}
                  color={focused === 'password' ? Colors.secondary : Colors.iconMuted}
                />
                <TextInput
                  style={styles.input}
                  secureTextEntry={!showPassword}
                  value={password}
                  onChangeText={(t) => {
                    setPassword(t);
                    if (error) setError(null);
                  }}
                  onFocus={() => setFocused('password')}
                  onBlur={() => setFocused(null)}
                  placeholder="Enter your password"
                  placeholderTextColor={Colors.placeholder}
                  onSubmitEditing={onSubmit}
                />
                <Pressable onPress={() => setShowPassword((v) => !v)} hitSlop={10}>
                  <MaterialIcons
                    name={showPassword ? 'visibility-off' : 'visibility'}
                    size={20}
                    color={Colors.iconMuted}
                  />
                </Pressable>
              </View>
            </View>

            {error ? (
              <View style={styles.errorBox}>
                <MaterialIcons name="error-outline" size={16} color={Colors.destructive} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            <Pressable
              style={({ pressed }) => [styles.signInBtn, (loading || pressed) && { opacity: 0.88 }]}
              onPress={onSubmit}
              disabled={loading}
              android_ripple={{ color: 'rgba(255,255,255,0.16)' }}>
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Text style={styles.signInBtnText}>Sign in</Text>
                  <MaterialIcons name="arrow-forward" size={18} color="#FFFFFF" />
                </>
              )}
            </Pressable>

            <Text style={styles.footer}>
              Accounts are provisioned by your HR admin. Self-registration is disabled.
            </Text>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.splash },
  flex: { flex: 1 },
  glowTop: {
    position: 'absolute',
    top: -140,
    right: -90,
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: Colors.secondary,
    opacity: 0.18,
  },
  glowBottom: {
    position: 'absolute',
    bottom: -120,
    left: -100,
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: Colors.primary,
    opacity: 0.45,
  },
  scroll: {
    paddingHorizontal: 22,
    flexGrow: 1,
    justifyContent: 'center',
  },
  brandBlock: {
    alignItems: 'center',
    marginBottom: 28,
  },
  logoPlate: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginBottom: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.18,
        shadowRadius: 16,
      },
      android: { elevation: 6 },
    }),
  },
  logoWord: {
    fontSize: 18,
    fontFamily: Fonts.bold,
    color: Colors.primary,
  },
  brandName: {
    color: '#FFFFFF',
    fontSize: 28,
    fontFamily: Fonts.bold,
    letterSpacing: 0.2,
  },
  brandTagline: {
    marginTop: 6,
    color: Colors.headerSubtitle,
    fontSize: 14,
    fontFamily: Fonts.regular,
    textAlign: 'center',
  },
  card: {
    backgroundColor: Colors.card,
    borderRadius: 22,
    paddingHorizontal: 22,
    paddingTop: 24,
    paddingBottom: 18,
    ...Platform.select({
      ios: {
        shadowColor: '#04101F',
        shadowOffset: { width: 0, height: 14 },
        shadowOpacity: 0.22,
        shadowRadius: 28,
      },
      android: { elevation: 10 },
    }),
  },
  cardTitle: {
    fontSize: 22,
    fontFamily: Fonts.bold,
    color: Colors.foreground,
    letterSpacing: -0.2,
  },
  cardSubtitle: {
    marginTop: 4,
    marginBottom: 22,
    fontSize: 13,
    lineHeight: 18,
    fontFamily: Fonts.regular,
    color: Colors.mutedForeground,
  },
  fieldGroup: { marginBottom: 14 },
  fieldLabel: {
    fontSize: 12,
    fontFamily: Fonts.semibold,
    color: Colors.label,
    marginBottom: 7,
    letterSpacing: 0.2,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1.5,
    borderRadius: 14,
    paddingHorizontal: 14,
    minHeight: 52,
  },
  input: {
    flex: 1,
    fontSize: 15,
    fontFamily: Fonts.medium,
    color: Colors.foreground,
    paddingVertical: Platform.OS === 'ios' ? 14 : 10,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.destructiveLight,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
  },
  errorText: {
    flex: 1,
    fontSize: 13,
    fontFamily: Fonts.medium,
    color: Colors.destructive,
  },
  signInBtn: {
    marginTop: 8,
    minHeight: 52,
    borderRadius: 14,
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: Colors.primary,
    shadowOpacity: 0.28,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 4,
  },
  signInBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: Fonts.bold,
  },
  footer: {
    marginTop: 18,
    textAlign: 'center',
    color: Colors.mutedForeground,
    fontSize: 14,
    fontFamily: Fonts.regular,
  },
  link: {
    color: Colors.secondary,
    fontFamily: Fonts.bold,
  },
});
