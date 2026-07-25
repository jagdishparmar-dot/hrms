import { MaterialIcons } from '@expo/vector-icons';
import { useEffect } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { Colors } from '@/src/theme/colors';
import { Fonts } from '@/src/theme/typography';

interface CheckInSuccessDialogProps {
  visible: boolean;
  timeFormatted: string;
  locationName: string;
  userName: string;
  onDismiss: () => void;
}

export function CheckInSuccessDialog({
  visible,
  timeFormatted,
  locationName,
  userName,
  onDismiss,
}: CheckInSuccessDialogProps) {
  const badgeScale = useSharedValue(0.2);
  const checkScale = useSharedValue(0);
  const ringScale = useSharedValue(1);
  const ringOpacity = useSharedValue(0.6);

  useEffect(() => {
    if (!visible) {
      cancelAnimation(badgeScale);
      cancelAnimation(checkScale);
      cancelAnimation(ringScale);
      cancelAnimation(ringOpacity);
      badgeScale.value = 0.2;
      checkScale.value = 0;
      ringScale.value = 1;
      ringOpacity.value = 0.6;
      return;
    }

    badgeScale.value = withSpring(1, { damping: 12, stiffness: 120 });
    checkScale.value = withSequence(withTiming(0, { duration: 150 }), withSpring(1));
    ringScale.value = withRepeat(withTiming(1.45, { duration: 1200 }), -1, false);
    ringOpacity.value = withRepeat(withTiming(0, { duration: 1200 }), -1, false);

    const timer = setTimeout(onDismiss, 3200);
    return () => {
      clearTimeout(timer);
      cancelAnimation(badgeScale);
      cancelAnimation(checkScale);
      cancelAnimation(ringScale);
      cancelAnimation(ringOpacity);
    };
  }, [visible, badgeScale, checkScale, onDismiss, ringOpacity, ringScale]);

  const badgeStyle = useAnimatedStyle(() => ({
    transform: [{ scale: badgeScale.value }],
  }));

  const checkStyle = useAnimatedStyle(() => ({
    transform: [{ scale: checkScale.value }],
  }));

  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ scale: ringScale.value }],
    opacity: ringOpacity.value,
  }));

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDismiss}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.badgeArea}>
            <Animated.View style={[styles.ring, ringStyle]} />
            <Animated.View style={[styles.badge, badgeStyle]}>
              <Animated.View style={checkStyle}>
                <MaterialIcons name="check" size={54} color="#fff" />
              </Animated.View>
            </Animated.View>
          </View>

          <Text style={styles.title}>Check-in Successful!</Text>
          <Text style={styles.subtitle}>Great job, {userName}!</Text>

          <View style={styles.details}>
            <View style={styles.detailRow}>
              <View style={[styles.detailIcon, { backgroundColor: Colors.successLight }]}>
                <MaterialIcons name="schedule" size={16} color={Colors.success} />
              </View>
              <Text style={styles.detailLabel}>Clock-in Time:</Text>
              <Text style={styles.detailValue}>{timeFormatted}</Text>
            </View>
            <View style={styles.detailRow}>
              <View style={[styles.detailIcon, { backgroundColor: Colors.inTransitLight }]}>
                <MaterialIcons name="location-on" size={16} color={Colors.secondary} />
              </View>
              <Text style={styles.detailLabel}>Location Verified:</Text>
              <Text style={[styles.detailValue, { flexShrink: 1 }]} numberOfLines={1}>
                {locationName}
              </Text>
            </View>
          </View>

          <Pressable style={styles.button} onPress={onDismiss}>
            <Text style={styles.buttonText}>Back to Workspace</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(10,22,40,0.55)',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: Colors.card,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 24,
    paddingVertical: 28,
    alignItems: 'center',
  },
  badgeArea: {
    width: 140,
    height: 140,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.success,
  },
  badge: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: Colors.success,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 22,
    fontFamily: Fonts.bold,
    color: Colors.foreground,
  },
  subtitle: {
    marginTop: 6,
    fontSize: 14,
    fontFamily: Fonts.regular,
    color: Colors.mutedForeground,
  },
  details: {
    width: '100%',
    marginTop: 20,
    backgroundColor: Colors.inputBg,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 16,
    gap: 10,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  detailIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailLabel: {
    fontSize: 13,
    fontFamily: Fonts.regular,
    color: Colors.mutedForeground,
  },
  detailValue: {
    marginLeft: 'auto',
    fontSize: 14,
    fontFamily: Fonts.bold,
    color: Colors.foreground,
  },
  button: {
    marginTop: 24,
    width: '100%',
    height: 48,
    borderRadius: 14,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 15,
    fontFamily: Fonts.bold,
  },
});
