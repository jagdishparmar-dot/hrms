import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useEffect, useMemo } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useScreenInsets } from '@/src/components/ScreenSafeArea';
import { Colors } from '@/src/theme/colors';
import { Fonts } from '@/src/theme/typography';
import type { MainUiState } from '@/src/types';
import { formatDurationLabel } from '@/src/utils/dateTime';

interface HomeScreenProps {
  uiState: MainUiState;
  refreshing?: boolean;
  onRefresh?: () => Promise<void>;
  onClockClick: () => void;
  onLocationClick: () => void;
  onRequestLocationPermission: () => void;
}

function greetingForHour(hour: number) {
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export function HomeScreen({
  uiState,
  refreshing = false,
  onRefresh,
  onClockClick,
  onLocationClick,
  onRequestLocationPermission,
}: HomeScreenProps) {
  const insets = useSafeAreaInsets();
  const { contentPaddingBottom } = useScreenInsets();
  const todayRecord = uiState.todayRecord;
  const isClockedIn = todayRecord != null && todayRecord.clockOutTime == null;
  const isCompleted = todayRecord != null && todayRecord.clockOutTime != null;

  const firstName = uiState.userProfile.name.split(' ')[0] || uiState.userProfile.name;
  const greeting = useMemo(() => greetingForHour(new Date().getHours()), []);

  const status = isCompleted
    ? {
        label: 'Completed',
        hint: 'Shift closed for today',
        color: Colors.headerSubtitle,
        bg: 'rgba(139,175,199,0.22)',
        icon: 'done-all' as const,
      }
    : isClockedIn
      ? {
          label: 'On duty',
          hint: todayRecord?.clockInTime
            ? `Since ${todayRecord.clockInTime}`
            : 'Shift in progress',
          color: '#22C55E',
          bg: 'rgba(34,197,94,0.18)',
          icon: 'verified' as const,
        }
      : {
          label: 'Off duty',
          hint: 'Tap below to clock in',
          color: Colors.accent,
          bg: 'rgba(245,166,35,0.18)',
          icon: 'schedule' as const,
        };

  const withinFence = uiState.userProfile.isWithinGeofence;
  const distanceLabel =
    uiState.userProfile.lastKnownDistanceMeters <= 1
      ? '1m from site'
      : `${uiState.userProfile.lastKnownDistanceMeters}m from site`;

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={styles.headerText}>
          <Text style={styles.greeting}>{greeting}</Text>
          <Text style={styles.name} numberOfLines={1}>
            {firstName}
          </Text>
          <Text style={styles.roleLine} numberOfLines={1}>
            {uiState.userProfile.role}
            {uiState.userProfile.department ? ` · ${uiState.userProfile.department}` : ''}
          </Text>
        </View>
        <View style={[styles.statusChip, { backgroundColor: status.bg }]}>
          {isClockedIn ? <View style={styles.liveDot} /> : null}
          <MaterialIcons name={status.icon} size={14} color={status.color} />
          <Text style={[styles.statusChipText, { color: status.color }]}>{status.label}</Text>
        </View>
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={[styles.content, { paddingBottom: contentPaddingBottom }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          onRefresh ? (
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={Colors.secondary}
              colors={[Colors.secondary]}
            />
          ) : undefined
        }>
        <View style={styles.timeStrip}>
          <View style={styles.timeLeft}>
            <Text style={styles.timeLabel}>Live time</Text>
            <Text style={styles.digitalClock}>{uiState.currentTimeFormatted}</Text>
          </View>
          <View style={styles.dateBlock}>
            <MaterialIcons name="calendar-today" size={16} color={Colors.secondary} />
            <Text style={styles.dateText}>{uiState.currentDateFormatted}</Text>
          </View>
        </View>

        <View style={styles.ctaSection}>
          <Text style={styles.sectionHint}>{status.hint}</Text>
          <ClockActionButton
            isClockedIn={isClockedIn}
            isCompleted={isCompleted}
            isLoading={uiState.isClockInLoading}
            onPress={onClockClick}
          />
        </View>

        <Text style={styles.sectionTitle}>{"Today's shift"}</Text>
        <View style={styles.metricsCard}>
          <MetricCell
            icon="login"
            label="Clock in"
            value={todayRecord?.clockInTime ?? '--:--'}
          />
          <View style={styles.metricDivider} />
          <MetricCell
            icon="logout"
            label="Clock out"
            value={todayRecord?.clockOutTime ?? (isClockedIn ? 'Active' : '--:--')}
            valueColor={isClockedIn && !isCompleted ? Colors.success : undefined}
          />
          <View style={styles.metricDivider} />
          <MetricCell
            icon="schedule"
            label="Total"
            value={
              todayRecord?.totalMinutes
                ? formatDurationLabel(todayRecord.totalMinutes)
                : '0h 0m'
            }
          />
        </View>

        <Text style={styles.sectionTitle}>Site verification</Text>
        {!uiState.hasLocationPermission ? (
          <Pressable
            style={styles.permissionCard}
            onPress={onRequestLocationPermission}
            android_ripple={{ color: 'rgba(26,58,107,0.08)' }}>
            <View style={styles.permissionIcon}>
              <MaterialIcons name="my-location" size={22} color="#fff" />
            </View>
            <View style={styles.cardBody}>
              <Text style={styles.cardTitle}>Enable location</Text>
              <Text style={styles.cardSubtitle}>
                Required to verify you are within the office geofence
              </Text>
            </View>
            <View style={styles.ctaPill}>
              <Text style={styles.ctaPillText}>Grant</Text>
              <MaterialIcons name="chevron-right" size={16} color="#fff" />
            </View>
          </Pressable>
        ) : (
          <Pressable
            style={styles.locationCard}
            onPress={onLocationClick}
            android_ripple={{ color: 'rgba(46,107,230,0.08)' }}>
            <View
              style={[
                styles.locationIcon,
                { backgroundColor: withinFence ? Colors.successLight : Colors.destructiveLight },
              ]}>
              <MaterialIcons
                name={withinFence ? 'gps-fixed' : 'gps-off'}
                size={22}
                color={withinFence ? Colors.success : Colors.destructive}
              />
            </View>
            <View style={styles.cardBody}>
              <View style={styles.locationTitleRow}>
                <Text style={styles.cardTitle} numberOfLines={1}>
                  {uiState.userProfile.officeLocation}
                </Text>
                <View
                  style={[
                    styles.fenceBadge,
                    { backgroundColor: withinFence ? Colors.successLight : Colors.destructiveLight },
                  ]}>
                  <Text
                    style={[
                      styles.fenceBadgeText,
                      { color: withinFence ? Colors.success : Colors.destructive },
                    ]}>
                    {withinFence ? 'Inside' : 'Outside'}
                  </Text>
                </View>
              </View>
              <Text style={styles.cardSubtitle}>{distanceLabel} · tap for details</Text>
            </View>
            <MaterialIcons name="chevron-right" size={22} color={Colors.mutedForeground} />
          </Pressable>
        )}
      </ScrollView>
    </View>
  );
}

function MetricCell({
  icon,
  label,
  value,
  valueColor,
}: {
  icon: keyof typeof MaterialIcons.glyphMap;
  label: string;
  value: string;
  valueColor?: string;
}) {
  return (
    <View style={styles.metricCell}>
      <View style={styles.metricIcon}>
        <MaterialIcons name={icon} size={18} color={Colors.secondary} />
      </View>
      <Text style={[styles.metricValue, valueColor ? { color: valueColor } : null]}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

function ClockActionButton({
  isClockedIn,
  isCompleted,
  isLoading,
  onPress,
}: {
  isClockedIn: boolean;
  isCompleted: boolean;
  isLoading: boolean;
  onPress: () => void;
}) {
  const scale = useSharedValue(1);
  const pulseScale = useSharedValue(1);
  const pulseOpacity = useSharedValue(0.4);

  useEffect(() => {
    if (isCompleted) {
      cancelAnimation(pulseScale);
      cancelAnimation(pulseOpacity);
      pulseScale.value = 1;
      pulseOpacity.value = 0;
      return;
    }

    pulseScale.value = withRepeat(withTiming(1.16, { duration: 1400 }), -1, false);
    pulseOpacity.value = withRepeat(withTiming(0, { duration: 1400 }), -1, false);

    return () => {
      cancelAnimation(pulseScale);
      cancelAnimation(pulseOpacity);
    };
  }, [isCompleted, pulseOpacity, pulseScale]);

  const buttonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
    opacity: pulseOpacity.value,
  }));

  const colors: [string, string] = isCompleted
    ? [Colors.clockDoneStart, Colors.clockDoneEnd]
    : isClockedIn
      ? [Colors.clockOutStart, Colors.clockOutEnd]
      : [Colors.primary, Colors.secondary];

  const ringColor = isClockedIn ? Colors.clockOutStart : Colors.secondary;
  const actionLabel = isCompleted ? 'Completed' : isClockedIn ? 'Clock out' : 'Clock in';
  const actionHint = isCompleted
    ? 'See you tomorrow'
    : isClockedIn
      ? 'End your shift'
      : 'Start your shift';

  return (
    <View style={styles.clockButtonWrap}>
      {!isCompleted ? (
        <Animated.View style={[styles.pulseRing, { backgroundColor: ringColor }, ringStyle]} />
      ) : null}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={actionLabel}
        onPressIn={() => {
          scale.value = withSpring(0.94);
        }}
        onPressOut={() => {
          scale.value = withSpring(1);
        }}
        onPress={() => {
          try {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          } catch {
            /* optional */
          }
          onPress();
        }}>
        <Animated.View style={buttonStyle}>
          <LinearGradient colors={colors} style={styles.clockButton}>
            {isLoading ? (
              <ActivityIndicator color="#fff" size="large" />
            ) : (
              <>
                <MaterialIcons
                  name={isCompleted ? 'check' : isClockedIn ? 'logout' : 'fingerprint'}
                  size={52}
                  color="#fff"
                />
                <Text style={styles.clockButtonTitle}>{actionLabel}</Text>
                <Text style={styles.clockButtonSubtitle}>{actionHint}</Text>
              </>
            )}
          </LinearGradient>
        </Animated.View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  header: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 16,
    paddingBottom: 18,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 12,
  },
  headerText: { flex: 1, minWidth: 0 },
  greeting: {
    color: Colors.headerSubtitle,
    fontSize: 13,
    fontFamily: Fonts.medium,
  },
  name: {
    marginTop: 2,
    color: Colors.primaryForeground,
    fontSize: 26,
    fontFamily: Fonts.bold,
    letterSpacing: -0.3,
  },
  roleLine: {
    marginTop: 4,
    color: 'rgba(139,175,199,0.95)',
    fontSize: 13,
    fontFamily: Fonts.regular,
  },
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
    marginBottom: 2,
  },
  statusChipText: {
    fontSize: 12,
    fontFamily: Fonts.semibold,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#22C55E',
  },
  container: { flex: 1 },
  content: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  timeStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  timeLeft: { flex: 1 },
  timeLabel: {
    fontSize: 11,
    fontFamily: Fonts.semibold,
    color: Colors.mutedForeground,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  digitalClock: {
    marginTop: 2,
    fontSize: 28,
    fontFamily: Fonts.bold,
    color: Colors.foreground,
    fontVariant: ['tabular-nums'],
  },
  dateBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.muted,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    maxWidth: '48%',
  },
  dateText: {
    flexShrink: 1,
    fontSize: 12,
    fontFamily: Fonts.semibold,
    color: Colors.mutedForeground,
  },
  ctaSection: {
    marginTop: 20,
    alignItems: 'center',
  },
  sectionHint: {
    fontSize: 13,
    fontFamily: Fonts.medium,
    color: Colors.mutedForeground,
    marginBottom: 10,
  },
  sectionTitle: {
    marginTop: 22,
    marginBottom: 10,
    fontSize: 15,
    fontFamily: Fonts.bold,
    color: Colors.foreground,
  },
  metricsCard: {
    flexDirection: 'row',
    alignItems: 'stretch',
    backgroundColor: Colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingVertical: 14,
    paddingHorizontal: 6,
  },
  metricCell: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  metricIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: Colors.muted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricValue: {
    marginTop: 8,
    fontSize: 15,
    fontFamily: Fonts.bold,
    color: Colors.foreground,
    fontVariant: ['tabular-nums'],
  },
  metricLabel: {
    marginTop: 2,
    fontSize: 11,
    fontFamily: Fonts.medium,
    color: Colors.mutedForeground,
  },
  metricDivider: {
    width: StyleSheet.hairlineWidth,
    backgroundColor: Colors.border,
    marginVertical: 4,
  },
  permissionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: Colors.warningLight,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 14,
  },
  permissionIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  locationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: Colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 14,
  },
  locationIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBody: { flex: 1, minWidth: 0 },
  locationTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardTitle: {
    flexShrink: 1,
    fontSize: 14,
    fontFamily: Fonts.bold,
    color: Colors.foreground,
  },
  cardSubtitle: {
    marginTop: 3,
    fontSize: 12,
    fontFamily: Fonts.regular,
    color: Colors.mutedForeground,
  },
  fenceBadge: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  fenceBadgeText: {
    fontSize: 10,
    fontFamily: Fonts.bold,
  },
  ctaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: Colors.primary,
    borderRadius: 999,
    paddingLeft: 12,
    paddingRight: 6,
    paddingVertical: 8,
  },
  ctaPillText: {
    color: '#fff',
    fontSize: 12,
    fontFamily: Fonts.bold,
  },
  clockButtonWrap: {
    width: 196,
    height: 196,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulseRing: {
    position: 'absolute',
    width: 168,
    height: 168,
    borderRadius: 84,
  },
  clockButton: {
    width: 168,
    height: 168,
    borderRadius: 84,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 10,
    shadowColor: Colors.primary,
    shadowOpacity: 0.3,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
  },
  clockButtonTitle: {
    marginTop: 8,
    fontSize: 18,
    fontFamily: Fonts.bold,
    color: '#fff',
  },
  clockButtonSubtitle: {
    marginTop: 2,
    fontSize: 12,
    color: 'rgba(255,255,255,0.85)',
    fontFamily: Fonts.medium,
  },
});
