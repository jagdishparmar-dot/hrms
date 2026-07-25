import { MaterialIcons } from '@expo/vector-icons';
import BottomSheet, {
  BottomSheetBackdrop,
  BottomSheetScrollView,
} from '@gorhom/bottom-sheet';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';

import { ScreenHeader } from '@/src/components/ScreenHeader';
import {
  RegularizationDialog,
  type RegularizationPreset,
} from '@/src/components/RegularizationDialog';
import { useScreenInsets } from '@/src/components/ScreenSafeArea';
import { attendanceRepository } from '@/src/repositories/attendanceRepository';
import { Colors } from '@/src/theme/colors';
import { Fonts } from '@/src/theme/typography';
import type { AttendanceRecord, MainUiState, RegularizationRequest } from '@/src/types';
import { formatDurationLabel, getTodayIso } from '@/src/utils/dateTime';

interface AttendanceScreenProps {
  uiState: MainUiState;
  refreshing?: boolean;
  onRefresh?: () => Promise<void>;
}

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

function pad2(n: number) {
  return String(n).padStart(2, '0');
}

function monthPrefix(year: number, monthIndex: number) {
  return `${year}-${pad2(monthIndex + 1)}`;
}

function statusColor(status: string) {
  switch (status) {
    case 'PRESENT':
      return Colors.statusPresent;
    case 'LATE':
      return Colors.statusLate;
    case 'HALF_DAY':
      return Colors.statusHalfDay;
    case 'ON_LEAVE':
      return Colors.statusOnLeave;
    case 'LEAVE_PENDING':
      return Colors.statusLeavePending;
    default:
      return Colors.statusAbsent;
  }
}

function statusBg(status: string) {
  switch (status) {
    case 'PRESENT':
      return Colors.successLight;
    case 'LATE':
      return Colors.warningLight;
    case 'HALF_DAY':
      return Colors.warningLight;
    case 'ON_LEAVE':
      return '#EDE9FE';
    case 'LEAVE_PENDING':
      return '#E0E7FF';
    default:
      return Colors.destructiveLight;
  }
}

function statusLabel(status: string) {
  switch (status) {
    case 'PRESENT':
      return 'ON TIME';
    case 'LATE':
      return 'LATE';
    case 'HALF_DAY':
      return 'HALF DAY';
    case 'ON_LEAVE':
      return 'ON LEAVE';
    case 'LEAVE_PENDING':
      return 'LEAVE PENDING';
    default:
      return 'ABSENT';
  }
}

function isLeaveStatus(status: string) {
  return status === 'ON_LEAVE' || status === 'LEAVE_PENDING';
}

export function AttendanceScreen({
  uiState,
  refreshing = false,
  onRefresh,
}: AttendanceScreenProps) {
  const { contentPaddingBottom } = useScreenInsets();
  const now = new Date();
  const [selectedFilter, setSelectedFilter] = useState('ALL');
  const [selectedDateIso, setSelectedDateIso] = useState<string | null>(null);
  const [showRegularizationDialog, setShowRegularizationDialog] = useState(false);
  const [regularizationPreset, setRegularizationPreset] = useState<RegularizationPreset | null>(
    null,
  );
  const [regularizations, setRegularizations] = useState<RegularizationRequest[]>([]);
  const [selectedRecord, setSelectedRecord] = useState<AttendanceRecord | null>(null);
  const [isCalendarExpanded, setIsCalendarExpanded] = useState(true);
  const [currentYear, setCurrentYear] = useState(now.getFullYear());
  const [currentMonthIndex, setCurrentMonthIndex] = useState(now.getMonth());

  const selectedMonthKey = monthPrefix(currentYear, currentMonthIndex);
  const monthLabel = `${MONTH_NAMES[currentMonthIndex]} ${currentYear}`;

  const loadRegularizations = useCallback(async () => {
    try {
      const rows = await attendanceRepository.listRegularizations();
      setRegularizations(rows);
    } catch {
      /* best effort */
    }
  }, []);

  const handleRefresh = useCallback(async () => {
    await Promise.all([onRefresh?.(), loadRegularizations()]);
  }, [loadRegularizations, onRefresh]);

  useEffect(() => {
    loadRegularizations();
  }, [loadRegularizations]);

  const handleSubmitRegularization = useCallback(
    async (payload: {
      dateIso: string;
      reason: string;
      requestedClockIn?: string;
      requestedClockOut?: string;
    }) => {
      await attendanceRepository.submitRegularization(payload);
      await loadRegularizations();
      setShowRegularizationDialog(false);
      setRegularizationPreset(null);
      Toast.show({ type: 'success', text1: 'Regularization submitted' });
    },
    [loadRegularizations],
  );

  const openRegularization = useCallback((preset?: RegularizationPreset) => {
    setRegularizationPreset(preset ?? null);
    setShowRegularizationDialog(true);
  }, []);

  const monthRecords = useMemo(() => {
    return uiState.allRecords
      .filter((record) => record.dateIso.startsWith(selectedMonthKey))
      .sort((a, b) => (a.dateIso < b.dateIso ? 1 : -1));
  }, [uiState.allRecords, selectedMonthKey]);

  const monthStats = useMemo(() => {
    const present = monthRecords.filter((r) => r.status === 'PRESENT').length;
    const late = monthRecords.filter((r) => r.status === 'LATE').length;
    const halfDay = monthRecords.filter((r) => r.status === 'HALF_DAY').length;
    const absent = monthRecords.filter((r) => r.status === 'ABSENT').length;
    const onLeave = monthRecords.filter(
      (r) => r.status === 'ON_LEAVE' || r.status === 'LEAVE_PENDING',
    ).length;
    const workedRecords = monthRecords.filter(
      (r) => r.status !== 'ABSENT' && !isLeaveStatus(r.status),
    );
    const avgMins =
      workedRecords.length > 0
        ? Math.round(
            workedRecords.reduce((sum, r) => sum + r.totalMinutes, 0) / workedRecords.length,
          )
        : 0;
    const onTimeRate =
      workedRecords.length > 0 ? Math.round((present * 100) / workedRecords.length) : 100;
    return {
      present,
      late,
      halfDay,
      absent,
      onLeave,
      avgMins,
      onTimeRate,
      worked: workedRecords.length,
    };
  }, [monthRecords]);

  const filteredRecords = useMemo(() => {
    return monthRecords.filter((record) => {
      if (selectedDateIso && record.dateIso !== selectedDateIso) return false;

      if (selectedFilter === 'ALL') return true;
      if (selectedFilter === 'PRESENT') return record.status === 'PRESENT';
      if (selectedFilter === 'LATE') return record.status === 'LATE';
      if (selectedFilter === 'LEAVE') return isLeaveStatus(record.status);
      return record.status === 'ABSENT' || record.status === 'HALF_DAY';
    });
  }, [monthRecords, selectedFilter, selectedDateIso]);

  const changeMonth = (delta: number) => {
    let month = currentMonthIndex + delta;
    let year = currentYear;
    if (month < 0) {
      month = 11;
      year -= 1;
    } else if (month > 11) {
      month = 0;
      year += 1;
    }
    setCurrentMonthIndex(month);
    setCurrentYear(year);
    setSelectedDateIso(null);
    setSelectedFilter('ALL');
  };

  const onDateSelected = (dateIso: string) => {
    setSelectedDateIso((prev) => (prev === dateIso ? null : dateIso));
    setSelectedFilter('ALL');
  };

  const filters = [
    { key: 'ALL', label: 'All', count: monthRecords.length },
    { key: 'PRESENT', label: 'On time', count: monthStats.present },
    { key: 'LATE', label: 'Late', count: monthStats.late },
    { key: 'LEAVE', label: 'Leave', count: monthStats.onLeave },
    { key: 'OTHER', label: 'Other', count: monthStats.halfDay + monthStats.absent },
  ];

  return (
    <View style={styles.container}>
      <ScreenHeader
        title="Attendance"
        subtitle={monthLabel}
        right={
          <Pressable
            style={styles.headerAction}
            onPress={() => openRegularization()}
            hitSlop={8}>
            <MaterialIcons name="edit-note" size={20} color="#fff" />
          </Pressable>
        }
      />

      <FlatList
        data={filteredRecords}
        keyExtractor={(item) => String(item.id)}
        showsVerticalScrollIndicator={false}
        refreshControl={
          onRefresh ? (
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={Colors.secondary}
              colors={[Colors.secondary]}
            />
          ) : undefined
        }
        contentContainerStyle={[styles.listContent, { paddingBottom: contentPaddingBottom + 24 }]}
        ListHeaderComponent={
          <View style={styles.headerBlock}>
            <View style={styles.statStrip}>
              <StatCell value={String(monthStats.present + monthStats.late)} label="Present" color={Colors.foreground} />
              <View style={styles.statDivider} />
              <StatCell value={String(monthStats.late)} label="Late" color="#D97706" />
              <View style={styles.statDivider} />
              <StatCell value={String(monthStats.absent)} label="Absent" color={Colors.destructive} />
              <View style={styles.statDivider} />
              <StatCell value={`${monthStats.onTimeRate}%`} label="On-time" color={Colors.secondary} />
            </View>

            <View style={styles.calendarCard}>
              <View style={styles.monthNavRow}>
                <Pressable onPress={() => changeMonth(-1)} style={styles.navBtn}>
                  <MaterialIcons name="chevron-left" size={22} color={Colors.foreground} />
                </Pressable>
                <View style={styles.monthTitleBlock}>
                  <Text style={styles.monthTitle}>{monthLabel}</Text>
                  <Text style={styles.monthMeta}>
                    {monthStats.worked} worked days · avg {formatDurationLabel(monthStats.avgMins)}
                  </Text>
                </View>
                <Pressable onPress={() => changeMonth(1)} style={styles.navBtn}>
                  <MaterialIcons name="chevron-right" size={22} color={Colors.foreground} />
                </Pressable>
                <Pressable
                  style={styles.collapseBtn}
                  onPress={() => setIsCalendarExpanded((v) => !v)}>
                  <MaterialIcons
                    name={isCalendarExpanded ? 'expand-less' : 'expand-more'}
                    size={22}
                    color={Colors.secondary}
                  />
                </Pressable>
              </View>

              {isCalendarExpanded ? (
                <>
                  <CalendarMonthGrid
                    monthIndex={currentMonthIndex}
                    year={currentYear}
                    records={monthRecords}
                    selectedDateIso={selectedDateIso}
                    onDateSelected={onDateSelected}
                  />
                  <View style={styles.legendRow}>
                    <LegendDot color={Colors.statusPresent} label="On time" />
                    <LegendDot color={Colors.statusLate} label="Late" />
                    <LegendDot color={Colors.statusHalfDay} label="Half" />
                    <LegendDot color={Colors.statusOnLeave} label="Leave" />
                    <LegendDot color={Colors.statusAbsent} label="Absent" />
                  </View>
                </>
              ) : null}
            </View>

            {selectedDateIso ? (
              <View style={styles.dayBanner}>
                <MaterialIcons name="event" size={16} color={Colors.secondary} />
                <Text style={styles.dayBannerText}>Showing {selectedDateIso}</Text>
                <Pressable onPress={() => setSelectedDateIso(null)} hitSlop={8}>
                  <Text style={styles.dayBannerClear}>Clear day</Text>
                </Pressable>
              </View>
            ) : null}

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.filtersScroll}
              contentContainerStyle={styles.filtersRow}>
              {filters.map((filter) => {
                const selected = selectedFilter === filter.key;
                return (
                  <Pressable
                    key={filter.key}
                    style={[styles.filterChip, selected && styles.filterChipSelected]}
                    onPress={() => setSelectedFilter(filter.key)}>
                    <Text style={[styles.filterChipText, selected && styles.filterChipTextSelected]}>
                      {filter.label}
                    </Text>
                    <View style={[styles.filterCount, selected && styles.filterCountSelected]}>
                      <Text
                        style={[
                          styles.filterCountText,
                          selected && styles.filterCountTextSelected,
                        ]}>
                        {filter.count}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </ScrollView>

            {regularizations.length > 0 ? (
              <View style={styles.regCard}>
                <Text style={styles.regTitle}>Regularization requests</Text>
                {regularizations.slice(0, 4).map((item) => (
                  <View key={item.id} style={styles.regRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.regDate}>{item.dateIso}</Text>
                      <Text style={styles.regReason} numberOfLines={1}>
                        {item.reason}
                      </Text>
                    </View>
                    <Text
                      style={[
                        styles.regStatus,
                        {
                          color:
                            item.status === 'approved'
                              ? Colors.statusPresent
                              : item.status === 'rejected'
                                ? Colors.destructive
                                : Colors.statusLate,
                        },
                      ]}>
                      {item.status.toUpperCase()}
                    </Text>
                  </View>
                ))}
              </View>
            ) : null}

            <View style={styles.logHeader}>
              <View>
                <Text style={styles.logTitle}>Activity log</Text>
                <Text style={styles.logSubtitle}>
                  {selectedDateIso ? 'Selected day' : monthLabel}
                </Text>
              </View>
              <Text style={styles.logCount}>{filteredRecords.length}</Text>
            </View>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyCard}>
            <View style={styles.emptyIcon}>
              <MaterialIcons name="event-busy" size={28} color={Colors.mutedForeground} />
            </View>
            <Text style={styles.emptyTitle}>No records for this month</Text>
            <Text style={styles.emptySubtitle}>
              Switch months on the calendar, or clear the day/status filter.
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <AttendanceLogCard record={item} onPress={() => setSelectedRecord(item)} />
        )}
      />

      <RegularizationDialog
        visible={showRegularizationDialog}
        preset={regularizationPreset}
        onDismiss={() => {
          setShowRegularizationDialog(false);
          setRegularizationPreset(null);
        }}
        onSubmit={async (payload) => {
          try {
            await handleSubmitRegularization(payload);
          } catch (error) {
            Toast.show({
              type: 'error',
              text1: 'Submission failed',
              text2: error instanceof Error ? error.message : 'Try again.',
            });
            throw error;
          }
        }}
      />

      <AttendanceDetailSheet
        record={selectedRecord}
        workShiftStart={uiState.userProfile.workShiftStart}
        workShiftEnd={uiState.userProfile.workShiftEnd}
        officeLocation={uiState.userProfile.officeLocation}
        regularizations={regularizations}
        onDismiss={() => setSelectedRecord(null)}
        onRequestRegularization={(record) => {
          setSelectedRecord(null);
          openRegularization({
            dateIso: record.dateIso,
            requestedClockIn: record.clockInTime || undefined,
            requestedClockOut: record.clockOutTime || undefined,
          });
        }}
      />
    </View>
  );
}

function StatCell({
  value,
  label,
  color,
}: {
  value: string;
  label: string;
  color: string;
}) {
  return (
    <View style={styles.statCell}>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <Text style={styles.legendText}>{label}</Text>
    </View>
  );
}

function CalendarMonthGrid({
  monthIndex,
  year,
  records,
  selectedDateIso,
  onDateSelected,
}: {
  monthIndex: number;
  year: number;
  records: AttendanceRecord[];
  selectedDateIso: string | null;
  onDateSelected: (dateIso: string) => void;
}) {
  const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const firstDay = new Date(year, monthIndex, 1).getDay();
  const emptyStartCells = firstDay === 0 ? 6 : firstDay - 1;
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const todayIso = `${nowIsoDate()}`;
  const recordMap = useMemo(
    () => Object.fromEntries(records.map((record) => [record.dateIso, record])),
    [records],
  );

  const cells: Array<number | null> = [];
  for (let i = 0; i < emptyStartCells; i += 1) cells.push(null);
  for (let day = 1; day <= daysInMonth; day += 1) cells.push(day);
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <View style={styles.calendarGrid}>
      <View style={styles.calendarHeaderRow}>
        {dayNames.map((day) => (
          <Text key={day} style={styles.calendarDayName}>
            {day}
          </Text>
        ))}
      </View>
      {Array.from({ length: cells.length / 7 }).map((_, rowIndex) => (
        <View key={rowIndex} style={styles.calendarRow}>
          {cells.slice(rowIndex * 7, rowIndex * 7 + 7).map((day, colIndex) => {
            if (day == null) {
              return <View key={`empty-${rowIndex}-${colIndex}`} style={styles.calendarCell} />;
            }
            const dateIso = `${year}-${pad2(monthIndex + 1)}-${pad2(day)}`;
            const record = recordMap[dateIso];
            const isWeekend = colIndex >= 5;
            const isSelected = selectedDateIso === dateIso;
            const isToday = dateIso === todayIso;
            const bgColor = record
              ? statusBg(record.status)
              : isWeekend
                ? Colors.muted
                : Colors.inputBg;
            const textColor = record
              ? statusColor(record.status)
              : isWeekend
                ? Colors.mutedForeground
                : Colors.foreground;

            return (
              <Pressable
                key={dateIso}
                style={[
                  styles.calendarCell,
                  { backgroundColor: bgColor },
                  isSelected && styles.calendarCellSelected,
                  isToday && !isSelected && styles.calendarCellToday,
                ]}
                onPress={() => onDateSelected(dateIso)}>
                <Text
                  style={[
                    styles.calendarDayText,
                    { color: textColor, fontFamily: record || isSelected ? Fonts.bold : Fonts.regular },
                  ]}>
                  {day}
                </Text>
                {record ? <View style={[styles.calendarDot, { backgroundColor: textColor }]} /> : null}
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}

function nowIsoDate() {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function AttendanceLogCard({
  record,
  onPress,
}: {
  record: AttendanceRecord;
  onPress: () => void;
}) {
  const color = statusColor(record.status);
  const dayNum = record.dateIso.slice(-2);
  const isAbsent = record.status === 'ABSENT';
  const isLeaveDay = isLeaveStatus(record.status);
  const showPunchDetails = !isAbsent && !isLeaveDay;
  const progress = showPunchDetails ? Math.min(record.totalMinutes / 540, 1) : 0;

  return (
    <Pressable
      style={styles.logCard}
      onPress={onPress}
      android_ripple={{ color: 'rgba(46,107,230,0.08)' }}>
      <View style={styles.logTopRow}>
        <View style={styles.logLeft}>
          <View style={[styles.logDayBox, { backgroundColor: statusBg(record.status) }]}>
            <Text style={[styles.logDayNumber, { color }]}>{dayNum}</Text>
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.logDateText} numberOfLines={1}>
              {record.dayOfWeek}
            </Text>
            <Text style={styles.logLocation} numberOfLines={1}>
              {record.formattedDate}
              {showPunchDetails ? ` · ${record.distanceMeters}m` : ''}
            </Text>
            <Text style={styles.logDocId} numberOfLines={1}>
              ID {record.documentId || record.id}
            </Text>
          </View>
        </View>
        <View style={[styles.logStatusBadge, { backgroundColor: statusBg(record.status) }]}>
          <Text style={[styles.logStatusText, { color }]}>{statusLabel(record.status)}</Text>
        </View>
      </View>

      {showPunchDetails ? (
        <>
          <View style={styles.logTimesRow}>
            <View>
              <Text style={styles.logTimeLabel}>IN</Text>
              <Text style={styles.logTimeValue}>{record.clockInTime}</Text>
            </View>
            <View>
              <Text style={styles.logTimeLabel}>OUT</Text>
              <Text
                style={[styles.logTimeValue, !record.clockOutTime && { color: Colors.success }]}>
                {record.clockOutTime ?? 'Active'}
              </Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.logTimeLabel}>HOURS</Text>
              <Text style={[styles.logTimeValue, { color: Colors.secondary }]}>
                {record.totalHoursFormatted}
              </Text>
            </View>
          </View>
          <View style={styles.progressRow}>
            <View style={styles.progressTrack}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${progress * 100}%`,
                    backgroundColor: progress >= 0.9 ? Colors.success : Colors.secondary,
                  },
                ]}
              />
            </View>
            <Text style={styles.progressText}>{Math.round(progress * 100)}%</Text>
          </View>
        </>
      ) : (
        <Text style={styles.absentNote}>{record.note || 'No attendance recorded'}</Text>
      )}
    </Pressable>
  );
}

function AttendanceDetailSheet({
  record,
  workShiftStart,
  workShiftEnd,
  officeLocation,
  regularizations,
  onDismiss,
  onRequestRegularization,
}: {
  record: AttendanceRecord | null;
  workShiftStart: string;
  workShiftEnd: string;
  officeLocation: string;
  regularizations: RegularizationRequest[];
  onDismiss: () => void;
  onRequestRegularization: (record: AttendanceRecord) => void;
}) {
  const sheetRef = useRef<BottomSheet>(null);
  const insets = useSafeAreaInsets();
  const snapPoints = useMemo(() => ['50%', '82%', '94%'], []);

  const renderBackdrop = useCallback(
    (props: React.ComponentProps<typeof BottomSheetBackdrop>) => (
      <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} opacity={0.45} />
    ),
    [],
  );

  if (!record) return null;

  const color = statusColor(record.status);
  const isAbsent = record.status === 'ABSENT';
  const isLeaveDay = isLeaveStatus(record.status);
  const isActiveShift = !isAbsent && !isLeaveDay && !record.clockOutTime;
  const shiftTargetMinutes = 540;
  const progress = isAbsent || isLeaveDay ? 0 : Math.min(record.totalMinutes / shiftTargetMinutes, 1);
  const existingReg = regularizations.find((r) => r.dateIso === record.dateIso);
  const shiftLabel = `${workShiftStart || '09:00'} – ${workShiftEnd || '18:00'}`;

  return (
    <BottomSheet
      ref={sheetRef}
      index={1}
      snapPoints={snapPoints}
      enablePanDownToClose
      onClose={onDismiss}
      backdropComponent={renderBackdrop}
      backgroundStyle={styles.sheetBackground}
      handleIndicatorStyle={styles.sheetHandle}>
      <BottomSheetScrollView
        contentContainerStyle={[
          styles.sheetScrollContent,
          { paddingBottom: Math.max(insets.bottom, 16) + 12 },
        ]}
        showsVerticalScrollIndicator={false}>
        <Text style={styles.sheetDragHint}>Swipe up for full details</Text>

        <View style={styles.sheetHero}>
          <View style={styles.sheetHeroLeft}>
            <Text style={styles.sheetDayLabel}>{record.dayOfWeek}</Text>
            <Text style={styles.sheetDateLabel}>{record.formattedDate}</Text>
            <Text style={styles.sheetRecordId}>Record · {record.documentId || record.id}</Text>
          </View>
          <View style={[styles.sheetStatusPill, { backgroundColor: statusBg(record.status) }]}>
            <Text style={[styles.sheetStatusText, { color }]}>{statusLabel(record.status)}</Text>
          </View>
        </View>

        {!isAbsent && !isLeaveDay ? (
          <>
            <View style={styles.sheetTimeRow}>
              <TimeStat label="Clock in" value={record.clockInTime || '—'} />
              <View style={styles.sheetTimeDivider} />
              <TimeStat
                label="Clock out"
                value={record.clockOutTime ?? 'Active'}
                accent={!record.clockOutTime}
              />
              <View style={styles.sheetTimeDivider} />
              <TimeStat
                label="Duration"
                value={record.totalHoursFormatted}
                highlight
              />
            </View>

            <View style={styles.sheetProgressBlock}>
              <View style={styles.sheetProgressHeader}>
                <Text style={styles.sheetProgressLabel}>Shift progress</Text>
                <Text style={styles.sheetProgressValue}>
                  {formatDurationLabel(record.totalMinutes)} / 9h target
                </Text>
              </View>
              <View style={styles.sheetProgressTrack}>
                <View
                  style={[
                    styles.sheetProgressFill,
                    {
                      width: `${Math.round(progress * 100)}%`,
                      backgroundColor: progress >= 0.9 ? Colors.success : Colors.secondary,
                    },
                  ]}
                />
              </View>
            </View>
          </>
        ) : isLeaveDay ? (
          <View style={[styles.sheetAbsentBanner, { backgroundColor: statusBg(record.status) }]}>
            <MaterialIcons name="beach-access" size={20} color={color} />
            <Text style={[styles.sheetAbsentText, { color }]}>
              {record.note || 'Leave recorded for this day.'}
            </Text>
          </View>
        ) : (
          <View style={styles.sheetAbsentBanner}>
            <MaterialIcons name="event-busy" size={20} color={Colors.destructive} />
            <Text style={styles.sheetAbsentText}>
              {record.note || 'No punch recorded for this day.'}
            </Text>
          </View>
        )}

        <Text style={styles.sheetSectionTitle}>Details</Text>
        <View style={styles.sheetDetailGroup}>
          <DetailTile icon="schedule" title="Scheduled shift" value={shiftLabel} />
          <DetailTile
            icon="location-on"
            title="Site verification"
            value={
              record.locationName
                ? `${record.locationName} · ${record.distanceMeters}m from site centre`
                : `${officeLocation || 'Assigned site'} · ${record.distanceMeters}m`
            }
          />
          <DetailTile
            icon="fingerprint"
            title="Attendance status"
            value={
              isActiveShift
                ? 'Shift is still open — clock out when you leave.'
                : `${statusLabel(record.status)} · ${formatDurationLabel(record.totalMinutes)} logged`
            }
          />
          {record.note ? (
            <DetailTile icon="notes" title="Note" value={record.note} />
          ) : null}
        </View>

        {existingReg ? (
          <View style={styles.sheetRegBanner}>
            <MaterialIcons name="pending-actions" size={18} color={Colors.statusLate} />
            <View style={{ flex: 1 }}>
              <Text style={styles.sheetRegBannerTitle}>
                Regularization · {existingReg.status.toUpperCase()}
              </Text>
              <Text style={styles.sheetRegBannerText} numberOfLines={2}>
                {existingReg.reason}
              </Text>
            </View>
          </View>
        ) : null}

        <Pressable
          style={({ pressed }) => [styles.sheetPrimaryBtn, pressed && { opacity: 0.9 }]}
          onPress={() => onRequestRegularization(record)}
          android_ripple={{ color: 'rgba(255,255,255,0.12)' }}>
          <MaterialIcons name="edit-note" size={20} color="#FFFFFF" />
          <Text style={styles.sheetPrimaryBtnText}>
            {existingReg?.status === 'pending' ? 'Submit another request' : 'Request regularization'}
          </Text>
        </Pressable>

        <Text style={styles.sheetFootnote}>
          Use regularization if punch times are wrong, you missed clock-in/out, or were absent with
          valid reason.
        </Text>
      </BottomSheetScrollView>
    </BottomSheet>
  );
}

function TimeStat({
  label,
  value,
  highlight,
  accent,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  accent?: boolean;
}) {
  return (
    <View style={styles.sheetTimeStat}>
      <Text style={styles.sheetTimeStatLabel}>{label}</Text>
      <Text
        style={[
          styles.sheetTimeStatValue,
          highlight && { color: Colors.secondary },
          accent && { color: Colors.success },
        ]}>
        {value}
      </Text>
    </View>
  );
}

function DetailTile({
  icon,
  title,
  value,
}: {
  icon: keyof typeof MaterialIcons.glyphMap;
  title: string;
  value: string;
}) {
  return (
    <View style={styles.detailTile}>
      <View style={styles.detailIcon}>
        <MaterialIcons name={icon} size={18} color={Colors.secondary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.detailTitle}>{title}</Text>
        <Text style={styles.detailValue}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  headerAction: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: { paddingHorizontal: 16, paddingTop: 14 },
  headerBlock: {
    gap: 14,
    marginBottom: 12,
  },
  statStrip: {
    flexDirection: 'row',
    backgroundColor: Colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingVertical: 14,
    paddingHorizontal: 6,
  },
  statCell: { flex: 1, alignItems: 'center' },
  statValue: {
    fontSize: 18,
    fontFamily: Fonts.bold,
    fontVariant: ['tabular-nums'],
  },
  statLabel: {
    marginTop: 2,
    fontSize: 11,
    fontFamily: Fonts.medium,
    color: Colors.mutedForeground,
  },
  statDivider: {
    width: StyleSheet.hairlineWidth,
    backgroundColor: Colors.border,
    marginVertical: 2,
  },
  calendarCard: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 14,
  },
  monthNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  navBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.muted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthTitleBlock: { flex: 1, paddingHorizontal: 6 },
  monthTitle: {
    fontSize: 16,
    fontFamily: Fonts.bold,
    color: Colors.foreground,
  },
  monthMeta: {
    marginTop: 2,
    fontSize: 12,
    fontFamily: Fonts.regular,
    color: Colors.mutedForeground,
  },
  collapseBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.inTransitLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calendarGrid: { marginTop: 12 },
  calendarHeaderRow: { flexDirection: 'row' },
  calendarDayName: {
    flex: 1,
    textAlign: 'center',
    fontSize: 11,
    fontFamily: Fonts.bold,
    color: Colors.mutedForeground,
    marginBottom: 6,
  },
  calendarRow: { flexDirection: 'row', marginVertical: 3 },
  calendarCell: {
    flex: 1,
    height: 40,
    marginHorizontal: 2,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calendarCellSelected: {
    borderWidth: 2,
    borderColor: Colors.secondary,
  },
  calendarCellToday: {
    borderWidth: 1,
    borderColor: Colors.secondary,
  },
  calendarDayText: { fontSize: 12 },
  calendarDot: { width: 4, height: 4, borderRadius: 2, marginTop: 2 },
  legendRow: {
    marginTop: 12,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: {
    fontSize: 11,
    fontFamily: Fonts.medium,
    color: Colors.mutedForeground,
  },
  dayBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.inTransitLight,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  dayBannerText: {
    flex: 1,
    fontSize: 13,
    fontFamily: Fonts.semibold,
    color: Colors.secondary,
  },
  dayBannerClear: {
    fontSize: 12,
    fontFamily: Fonts.bold,
    color: Colors.primary,
  },
  filtersScroll: {
    marginHorizontal: -16,
    flexGrow: 0,
  },
  filtersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 2,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    paddingLeft: 12,
    paddingRight: 6,
    paddingVertical: 6,
    minHeight: 36,
    backgroundColor: Colors.muted,
  },
  filterChipSelected: { backgroundColor: Colors.secondary },
  filterChipText: {
    fontSize: 12,
    fontFamily: Fonts.semibold,
    color: Colors.mutedForeground,
  },
  filterChipTextSelected: { color: '#fff', fontFamily: Fonts.bold },
  filterCount: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(10,22,40,0.08)',
  },
  filterCountSelected: {
    backgroundColor: 'rgba(255,255,255,0.22)',
  },
  filterCountText: {
    fontSize: 11,
    fontFamily: Fonts.bold,
    color: Colors.foreground,
    fontVariant: ['tabular-nums'],
  },
  filterCountTextSelected: {
    color: '#fff',
  },
  logHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: 2,
  },
  logTitle: { fontSize: 16, fontFamily: Fonts.bold, color: Colors.foreground },
  logSubtitle: {
    marginTop: 2,
    fontSize: 12,
    fontFamily: Fonts.regular,
    color: Colors.mutedForeground,
  },
  logCount: {
    minWidth: 28,
    textAlign: 'center',
    fontSize: 13,
    fontFamily: Fonts.bold,
    color: Colors.secondary,
    backgroundColor: Colors.inTransitLight,
    overflow: 'hidden',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  emptyCard: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 28,
    alignItems: 'center',
    gap: 8,
  },
  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: Colors.muted,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyTitle: { fontSize: 14, fontFamily: Fonts.semibold, color: Colors.foreground },
  emptySubtitle: {
    fontSize: 12,
    fontFamily: Fonts.regular,
    color: Colors.mutedForeground,
    textAlign: 'center',
  },
  logCard: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 14,
    marginBottom: 10,
  },
  logTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  logLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  logDayBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logDayNumber: { fontSize: 15, fontFamily: Fonts.bold },
  logDateText: { fontSize: 15, fontFamily: Fonts.bold, color: Colors.foreground },
  logLocation: { marginTop: 2, fontSize: 12, fontFamily: Fonts.regular, color: Colors.mutedForeground },
  logDocId: {
    marginTop: 3,
    fontSize: 11,
    fontFamily: Fonts.medium,
    color: Colors.secondary,
  },
  logStatusBadge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  logStatusText: { fontSize: 11, fontFamily: Fonts.bold },
  logTimesRow: {
    marginTop: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: Colors.inputBg,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  logTimeLabel: {
    fontSize: 10,
    fontFamily: Fonts.bold,
    color: Colors.mutedForeground,
    letterSpacing: 0.3,
  },
  logTimeValue: {
    marginTop: 2,
    fontSize: 14,
    fontFamily: Fonts.bold,
    color: Colors.foreground,
    fontVariant: ['tabular-nums'],
  },
  progressRow: { marginTop: 10, flexDirection: 'row', alignItems: 'center', gap: 10 },
  progressTrack: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.muted,
    overflow: 'hidden',
  },
  progressFill: { height: 6, borderRadius: 3 },
  progressText: {
    width: 36,
    textAlign: 'right',
    fontSize: 11,
    fontFamily: Fonts.semibold,
    color: Colors.mutedForeground,
  },
  absentNote: {
    marginTop: 10,
    fontSize: 12,
    fontFamily: Fonts.medium,
    color: Colors.mutedForeground,
  },
  sheetBackground: {
    backgroundColor: Colors.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: '#04101F',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 16,
  },
  sheetHandle: {
    backgroundColor: Colors.border,
    width: 44,
    height: 4,
  },
  sheetScrollContent: {
    paddingHorizontal: 20,
    paddingTop: 4,
    gap: 14,
  },
  sheetDragHint: {
    textAlign: 'center',
    fontSize: 11,
    fontFamily: Fonts.medium,
    color: Colors.mutedForeground,
    marginBottom: 2,
  },
  sheetHero: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  sheetHeroLeft: { flex: 1 },
  sheetDayLabel: {
    fontSize: 13,
    fontFamily: Fonts.semibold,
    color: Colors.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  sheetDateLabel: {
    marginTop: 2,
    fontSize: 24,
    fontFamily: Fonts.bold,
    color: Colors.foreground,
    letterSpacing: -0.3,
  },
  sheetRecordId: {
    marginTop: 4,
    fontSize: 11,
    fontFamily: Fonts.medium,
    color: Colors.mutedForeground,
  },
  sheetStatusPill: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  sheetStatusText: {
    fontSize: 11,
    fontFamily: Fonts.bold,
    letterSpacing: 0.4,
  },
  sheetTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.inputBg,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingVertical: 14,
    paddingHorizontal: 8,
  },
  sheetTimeStat: {
    flex: 1,
    alignItems: 'center',
  },
  sheetTimeStatLabel: {
    fontSize: 10,
    fontFamily: Fonts.bold,
    color: Colors.mutedForeground,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  sheetTimeStatValue: {
    marginTop: 4,
    fontSize: 15,
    fontFamily: Fonts.bold,
    color: Colors.foreground,
    fontVariant: ['tabular-nums'],
  },
  sheetTimeDivider: {
    width: StyleSheet.hairlineWidth,
    height: 36,
    backgroundColor: Colors.border,
  },
  sheetProgressBlock: { gap: 8 },
  sheetProgressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sheetProgressLabel: {
    fontSize: 12,
    fontFamily: Fonts.semibold,
    color: Colors.foreground,
  },
  sheetProgressValue: {
    fontSize: 11,
    fontFamily: Fonts.medium,
    color: Colors.mutedForeground,
  },
  sheetProgressTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.muted,
    overflow: 'hidden',
  },
  sheetProgressFill: {
    height: 8,
    borderRadius: 4,
  },
  sheetAbsentBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Colors.destructiveLight,
    borderRadius: 14,
    padding: 14,
  },
  sheetAbsentText: {
    flex: 1,
    fontSize: 13,
    fontFamily: Fonts.medium,
    color: Colors.destructive,
    lineHeight: 18,
  },
  sheetSectionTitle: {
    fontSize: 13,
    fontFamily: Fonts.bold,
    color: Colors.mutedForeground,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 4,
  },
  sheetDetailGroup: { gap: 10 },
  sheetRegBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: Colors.warningLight,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(217, 119, 6, 0.2)',
  },
  sheetRegBannerTitle: {
    fontSize: 12,
    fontFamily: Fonts.bold,
    color: '#B45309',
  },
  sheetRegBannerText: {
    marginTop: 2,
    fontSize: 12,
    fontFamily: Fonts.regular,
    color: Colors.foreground,
    lineHeight: 17,
  },
  sheetPrimaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 50,
    borderRadius: 14,
    backgroundColor: Colors.primary,
    marginTop: 4,
  },
  sheetPrimaryBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontFamily: Fonts.bold,
  },
  sheetFootnote: {
    fontSize: 12,
    lineHeight: 17,
    fontFamily: Fonts.regular,
    color: Colors.mutedForeground,
    textAlign: 'center',
    paddingHorizontal: 8,
  },
  detailTile: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: Colors.inputBg,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 14,
  },
  detailIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(46, 107, 230, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailTitle: {
    fontSize: 11,
    fontFamily: Fonts.bold,
    color: Colors.mutedForeground,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  detailValue: {
    marginTop: 4,
    fontSize: 14,
    fontFamily: Fonts.medium,
    color: Colors.foreground,
    lineHeight: 20,
  },
  regCard: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 14,
    gap: 10,
  },
  regTitle: {
    fontSize: 14,
    fontFamily: Fonts.semibold,
    color: Colors.foreground,
  },
  regRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  regDate: {
    fontSize: 13,
    fontFamily: Fonts.semibold,
    color: Colors.foreground,
  },
  regReason: {
    marginTop: 2,
    fontSize: 12,
    fontFamily: Fonts.regular,
    color: Colors.mutedForeground,
  },
  regStatus: {
    fontSize: 10,
    fontFamily: Fonts.bold,
    letterSpacing: 0.4,
  },
});
