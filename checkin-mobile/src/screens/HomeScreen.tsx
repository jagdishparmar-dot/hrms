import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Toast from 'react-native-toast-message';
import Animated, {
  cancelAnimation,
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ShiftChangeDialog } from '@/src/components/ShiftChangeDialog';
import { useScreenInsets } from '@/src/components/ScreenSafeArea';
import { listShiftChangeRequests } from '@/src/repositories/shiftRepository';
import { Colors } from '@/src/theme/colors';
import { Fonts } from '@/src/theme/typography';
import type { MainUiState, ShiftChangeRequest, TodayShiftInfo, TodayShiftSchedule } from '@/src/types';
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

function shiftTypeLabel(type: TodayShiftInfo['shiftType']) {
  switch (type) {
    case 'evening':
      return 'Evening';
    case 'night':
      return 'Night';
    case 'cross_midnight':
      return 'Cross-midnight';
    case 'rotational':
      return 'Rotational';
    default:
      return 'General';
  }
}

function shiftTypeTone(type: TodayShiftInfo['shiftType']) {
  switch (type) {
    case 'evening':
      return { bg: Colors.warningLight, text: '#B45309' };
    case 'night':
    case 'cross_midnight':
      return { bg: '#EDE9FE', text: '#5B21B6' };
    case 'rotational':
      return { bg: Colors.secondaryLight, text: Colors.primaryDeep };
    default:
      return { bg: Colors.secondaryLight, text: Colors.secondary };
  }
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
  const attendancePolicy = uiState.userProfile.attendancePolicy || 'geofenced';
  const selfPunchDisabled = attendancePolicy === 'manual';
  const companyId = uiState.userProfile.companyId ?? null;
  const [showShiftChangeDialog, setShowShiftChangeDialog] = useState(false);
  const [shiftChangeRequests, setShiftChangeRequests] = useState<ShiftChangeRequest[]>([]);

  const loadShiftRequests = useCallback(async () => {
    try {
      const rows = await listShiftChangeRequests(companyId);
      setShiftChangeRequests(rows);
    } catch {
      /* best effort */
    }
  }, [companyId]);

  useEffect(() => {
    loadShiftRequests();
  }, [loadShiftRequests]);

  const handleShiftChangeSubmitted = useCallback(async () => {
    await Promise.all([loadShiftRequests(), onRefresh?.()]);
    Toast.show({ type: 'success', text1: 'Shift change request submitted' });
  }, [loadShiftRequests, onRefresh]);

  const status = isCompleted
    ? {
        label: 'Completed',
        hint: 'Shift closed for today',
        color: Colors.headerSubtitle,
        bg: Colors.secondaryLight,
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
          hint: selfPunchDisabled
            ? 'Self punch disabled — contact HR'
            : 'Tap below to clock in',
          color: Colors.secondary,
          bg: Colors.secondaryLight,
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

        <TodayAssignedShiftCard
          schedule={uiState.todayShiftSchedule}
          pendingCount={shiftChangeRequests.filter((r) => r.status === 'pending').length}
          onRequestChange={() => setShowShiftChangeDialog(true)}
        />

        <View style={styles.ctaSection}>
          <Text style={styles.sectionHint}>{status.hint}</Text>
          <ClockActionButton
            isClockedIn={isClockedIn}
            isCompleted={isCompleted}
            isLoading={uiState.isClockInLoading}
            disabled={selfPunchDisabled}
            disabledHint="Self punch disabled"
            onPress={onClockClick}
          />
        </View>

        <Text style={styles.sectionTitle}>{"Today's attendance"}</Text>
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

        <Text style={styles.sectionTitle}>
          {attendancePolicy === 'gps_logged' ? 'Location logging' : 'Site verification'}
        </Text>
        {selfPunchDisabled ? (
          <View style={styles.permissionCard}>
            <View style={[styles.permissionIcon, { backgroundColor: Colors.mutedForeground }]}>
              <MaterialIcons name="block" size={22} color="#fff" />
            </View>
            <View style={styles.cardBody}>
              <Text style={styles.cardTitle}>Self punch disabled</Text>
              <Text style={styles.cardSubtitle}>
                HR marks attendance for your account. Use regularization if you need a correction.
              </Text>
            </View>
          </View>
        ) : !uiState.hasLocationPermission ? (
          <Pressable
            style={styles.permissionCard}
            onPress={onRequestLocationPermission}
            android_ripple={{ color: Colors.ripple }}>
            <View style={styles.permissionIcon}>
              <MaterialIcons name="my-location" size={22} color="#fff" />
            </View>
            <View style={styles.cardBody}>
              <Text style={styles.cardTitle}>Enable location</Text>
              <Text style={styles.cardSubtitle}>
                {attendancePolicy === 'gps_logged'
                  ? 'Required to log GPS coordinates when you punch'
                  : 'Required to verify you are within the office geofence'}
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
            android_ripple={{ color: Colors.ripple }}>
            <View
              style={[
                styles.locationIcon,
                {
                  backgroundColor:
                    attendancePolicy === 'gps_logged'
                      ? Colors.secondaryLight
                      : withinFence
                        ? Colors.successLight
                        : Colors.destructiveLight,
                },
              ]}>
              <MaterialIcons
                name={
                  attendancePolicy === 'gps_logged'
                    ? 'travel-explore'
                    : withinFence
                      ? 'gps-fixed'
                      : 'gps-off'
                }
                size={22}
                color={
                  attendancePolicy === 'gps_logged'
                    ? Colors.secondary
                    : withinFence
                      ? Colors.success
                      : Colors.destructive
                }
              />
            </View>
            <View style={styles.cardBody}>
              <View style={styles.locationTitleRow}>
                <Text style={styles.cardTitle} numberOfLines={1}>
                  {attendancePolicy === 'gps_logged'
                    ? 'Field / GPS logged'
                    : uiState.userProfile.officeLocation}
                </Text>
                <View
                  style={[
                    styles.fenceBadge,
                    {
                      backgroundColor:
                        attendancePolicy === 'gps_logged'
                          ? Colors.secondaryLight
                          : withinFence
                            ? Colors.successLight
                            : Colors.destructiveLight,
                    },
                  ]}>
                  <Text
                    style={[
                      styles.fenceBadgeText,
                      {
                        color:
                          attendancePolicy === 'gps_logged'
                            ? Colors.secondary
                            : withinFence
                              ? Colors.success
                              : Colors.destructive,
                      },
                    ]}>
                    {attendancePolicy === 'gps_logged'
                      ? 'Any location'
                      : withinFence
                        ? 'Inside'
                        : 'Outside'}
                  </Text>
                </View>
              </View>
              <Text style={styles.cardSubtitle}>
                {attendancePolicy === 'gps_logged'
                  ? 'GPS is recorded on punch · tap for details'
                  : `${distanceLabel} · tap for details`}
              </Text>
            </View>
            <MaterialIcons name="chevron-right" size={22} color={Colors.mutedForeground} />
          </Pressable>
        )}
      </ScrollView>

      <ShiftChangeDialog
        visible={showShiftChangeDialog}
        companyId={companyId}
        currentShifts={uiState.todayShiftSchedule.shifts}
        onDismiss={() => setShowShiftChangeDialog(false)}
        onSubmitted={handleShiftChangeSubmitted}
      />
    </View>
  );
}

function shiftSummaryLine(shifts: TodayShiftInfo[]) {
  if (shifts.length === 0) return 'No roster entry for today';
  const primary = shifts[0];
  const extra = shifts.length > 1 ? ` · +${shifts.length - 1} more` : '';
  return `${primary.name} · ${primary.windowLabel}${extra}`;
}

function ShiftDetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.shiftDetailRow}>
      <Text style={styles.shiftDetailLabel}>{label}</Text>
      <Text style={styles.shiftDetailValue}>{value}</Text>
    </View>
  );
}

function TodayAssignedShiftCard({
  schedule,
  pendingCount = 0,
  onRequestChange,
}: {
  schedule: TodayShiftSchedule;
  pendingCount?: number;
  onRequestChange?: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const shifts = schedule.shifts;
  const fromRoster = shifts.some((shift) => shift.source === 'roster');
  const hasShifts = shifts.length > 0;

  const toggleExpanded = useCallback(() => {
    setExpanded((current) => !current);
  }, []);

  const summary = shiftSummaryLine(shifts);
  const sourceLabel = hasShifts ? (fromRoster ? 'Roster' : 'Default') : 'Unassigned';

  return (
    <View style={styles.assignedShiftCard}>
      <Pressable
        style={({ pressed }) => [styles.shiftAccordionHeader, pressed && styles.shiftAccordionHeaderPressed]}
        onPress={toggleExpanded}
        android_ripple={{ color: Colors.ripple }}>
        <View style={styles.assignedShiftIcon}>
          <MaterialIcons name="event-available" size={20} color={Colors.secondary} />
        </View>

        <View style={styles.shiftAccordionHeaderBody}>
          <View style={styles.shiftAccordionTitleRow}>
            <Text style={styles.assignedShiftTitle}>
              {hasShifts ? "Today's assigned shift" : 'Shift schedule'}
            </Text>
            <View
              style={[
                styles.sourceBadge,
                fromRoster ? styles.sourceBadgeRoster : styles.sourceBadgeDefault,
              ]}>
              <Text
                style={[
                  styles.sourceBadgeText,
                  fromRoster ? styles.sourceBadgeTextRoster : styles.sourceBadgeTextDefault,
                ]}>
                {sourceLabel}
              </Text>
            </View>
          </View>

          {!expanded ? (
            <Text style={styles.shiftAccordionSummary} numberOfLines={2}>
              {summary}
            </Text>
          ) : (
            <Text style={styles.shiftAccordionSummaryMuted}>
              {hasShifts
                ? fromRoster
                  ? 'Scheduled on roster'
                  : 'Using default work schedule'
                : 'Request a shift change if you need a different slot'}
            </Text>
          )}
        </View>

        <MaterialIcons
          name={expanded ? 'expand-less' : 'expand-more'}
          size={24}
          color={Colors.mutedForeground}
        />
      </Pressable>

      {expanded ? (
        <Animated.View
          entering={FadeIn.duration(200)}
          exiting={FadeOut.duration(150)}
          style={styles.shiftAccordionBody}>
          {hasShifts ? (
            shifts.map((shift, index) => {
              const tone = shiftTypeTone(shift.shiftType);
              return (
                <View
                  key={`${shift.assignmentId || shift.shiftId}-${shift.sequence}`}
                  style={[styles.shiftAccordionPanel, index > 0 ? styles.shiftAccordionPanelDivider : null]}>
                  {shifts.length > 1 ? (
                    <View style={styles.shiftPanelHeading}>
                      <Text style={styles.shiftPanelTitle}>Shift {shift.sequence}</Text>
                      {shift.code ? (
                        <View style={styles.shiftCodeChip}>
                          <Text style={styles.shiftCodeText}>{shift.code}</Text>
                        </View>
                      ) : null}
                    </View>
                  ) : (
                    <View style={styles.shiftPanelHeading}>
                      <Text style={styles.shiftPanelTitle}>{shift.name}</Text>
                      {shift.code ? (
                        <View style={styles.shiftCodeChip}>
                          <Text style={styles.shiftCodeText}>{shift.code}</Text>
                        </View>
                      ) : null}
                    </View>
                  )}

                  <ShiftDetailRow label="Schedule" value={shift.windowLabel} />
                  <ShiftDetailRow
                    label="Timing"
                    value={`${shift.startTime} – ${shift.endTime}`}
                  />
                  <View style={styles.shiftDetailRow}>
                    <Text style={styles.shiftDetailLabel}>Type</Text>
                    <View style={[styles.typeBadge, { backgroundColor: tone.bg }]}>
                      <Text style={[styles.typeBadgeText, { color: tone.text }]}>
                        {shiftTypeLabel(shift.shiftType)}
                      </Text>
                    </View>
                  </View>
                  <ShiftDetailRow
                    label="Source"
                    value={shift.source === 'roster' ? 'Shift roster' : 'Employee default'}
                  />
                  {shift.note ? <ShiftDetailRow label="Note" value={shift.note} /> : null}
                </View>
              );
            })
          ) : (
            <View style={styles.shiftEmptyBody}>
              <MaterialIcons name="info-outline" size={18} color={Colors.mutedForeground} />
              <Text style={styles.shiftEmptyText}>
                HR has not rostered a shift for today. Your default schedule may still apply at
                punch-in, or you can request a change below.
              </Text>
            </View>
          )}

          {onRequestChange ? (
            <Pressable
              style={({ pressed }) => [
                styles.shiftChangeFooter,
                styles.shiftChangeFooterInAccordion,
                pressed && { opacity: 0.92 },
              ]}
              onPress={onRequestChange}
              android_ripple={{ color: Colors.ripple }}>
              <MaterialIcons name="swap-horiz" size={18} color={Colors.secondary} />
              <Text style={styles.shiftChangeFooterText}>Request shift change</Text>
              {pendingCount > 0 ? (
                <View style={styles.pendingBadge}>
                  <Text style={styles.pendingBadgeText}>{pendingCount}</Text>
                </View>
              ) : null}
              <MaterialIcons name="chevron-right" size={20} color={Colors.mutedForeground} />
            </Pressable>
          ) : null}
        </Animated.View>
      ) : null}
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
  disabled = false,
  disabledHint = 'Unavailable',
  onPress,
}: {
  isClockedIn: boolean;
  isCompleted: boolean;
  isLoading: boolean;
  disabled?: boolean;
  disabledHint?: string;
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

  const colors: [string, string] = disabled
    ? ['#94A3B8', '#64748B']
    : isCompleted
      ? [Colors.clockDoneStart, Colors.clockDoneEnd]
      : isClockedIn
        ? [Colors.clockOutStart, Colors.clockOutEnd]
        : [Colors.clockInStart, Colors.clockInEnd];

  const ringColor = isClockedIn ? Colors.clockOutStart : Colors.pulse;
  const actionLabel = disabled
    ? disabledHint
    : isCompleted
      ? 'Completed'
      : isClockedIn
        ? 'Clock out'
        : 'Clock in';
  const actionHint = disabled
    ? 'Contact HR for attendance'
    : isCompleted
      ? 'See you tomorrow'
      : isClockedIn
        ? 'End your shift'
        : 'Start your shift';

  return (
    <View style={styles.clockButtonWrap}>
      {!isCompleted && !disabled ? (
        <Animated.View style={[styles.pulseRing, { backgroundColor: ringColor }, ringStyle]} />
      ) : null}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={actionLabel}
        disabled={disabled || isLoading}
        onPressIn={() => {
          if (disabled) return;
          scale.value = withSpring(0.94);
        }}
        onPressOut={() => {
          if (disabled) return;
          scale.value = withSpring(1);
        }}
        onPress={() => {
          if (disabled) return;
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
                  name={disabled ? 'block' : isCompleted ? 'check' : isClockedIn ? 'logout' : 'fingerprint'}
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
    color: Colors.roleLine,
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
    backgroundColor: Colors.secondaryLight,
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
  assignedShiftCard: {
    marginTop: 16,
    backgroundColor: Colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  shiftAccordionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 13,
    backgroundColor: Colors.secondaryLight,
  },
  shiftAccordionHeaderPressed: {
    opacity: 0.94,
  },
  shiftAccordionHeaderBody: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  shiftAccordionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  shiftAccordionSummary: {
    fontSize: 13,
    fontFamily: Fonts.semibold,
    color: Colors.foreground,
    lineHeight: 18,
  },
  shiftAccordionSummaryMuted: {
    fontSize: 11,
    fontFamily: Fonts.regular,
    color: Colors.mutedForeground,
    lineHeight: 16,
  },
  shiftAccordionBody: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
    backgroundColor: Colors.background,
  },
  shiftAccordionPanel: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 8,
  },
  shiftAccordionPanelDivider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
  },
  shiftPanelHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 2,
  },
  shiftPanelTitle: {
    fontSize: 15,
    fontFamily: Fonts.bold,
    color: Colors.foreground,
  },
  shiftDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  shiftDetailLabel: {
    flexShrink: 0,
    width: 88,
    fontSize: 12,
    fontFamily: Fonts.medium,
    color: Colors.mutedForeground,
  },
  shiftDetailValue: {
    flex: 1,
    textAlign: 'right',
    fontSize: 13,
    fontFamily: Fonts.semibold,
    color: Colors.foreground,
  },
  shiftEmptyBody: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  shiftEmptyText: {
    flex: 1,
    fontSize: 13,
    fontFamily: Fonts.regular,
    color: Colors.mutedForeground,
    lineHeight: 19,
  },
  assignedShiftIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  assignedShiftTitle: {
    fontSize: 14,
    fontFamily: Fonts.bold,
    color: Colors.foreground,
  },
  sourceBadge: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  sourceBadgeRoster: {
    backgroundColor: Colors.card,
  },
  sourceBadgeDefault: {
    backgroundColor: 'rgba(255,255,255,0.65)',
  },
  sourceBadgeText: {
    fontSize: 10,
    fontFamily: Fonts.bold,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  sourceBadgeTextRoster: {
    color: Colors.primaryDeep,
  },
  sourceBadgeTextDefault: {
    color: Colors.mutedForeground,
  },
  shiftCodeChip: {
    borderRadius: 999,
    backgroundColor: Colors.primaryDeep,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  shiftCodeText: {
    fontSize: 10,
    fontFamily: Fonts.bold,
    color: Colors.primaryForeground,
    letterSpacing: 0.3,
  },
  typeBadge: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  typeBadgeText: {
    fontSize: 10,
    fontFamily: Fonts.bold,
  },
  shiftChangeFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
    backgroundColor: Colors.card,
  },
  shiftChangeFooterInAccordion: {
    marginTop: 0,
  },
  shiftChangeFooterText: {
    flex: 1,
    fontSize: 13,
    fontFamily: Fonts.semibold,
    color: Colors.secondary,
  },
  pendingBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.warningLight,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  pendingBadgeText: {
    fontSize: 11,
    fontFamily: Fonts.bold,
    color: '#B45309',
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
    backgroundColor: Colors.secondaryLight,
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
    backgroundColor: Colors.primaryDeep,
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
    backgroundColor: Colors.secondary,
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
    shadowColor: Colors.primaryDeep,
    shadowOpacity: 0.35,
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
