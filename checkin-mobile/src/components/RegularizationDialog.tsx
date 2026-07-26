import { MaterialIcons } from '@expo/vector-icons';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { Colors } from '@/src/theme/colors';
import { Fonts } from '@/src/theme/typography';
import {
  dateFromPicker,
  dateToIso,
  formatDisplayDate,
  formatDisplayTime,
  formatTime,
  getTodayIso,
  isoToDate,
  mergeTimeOntoDate,
  parseTimeOnDate,
} from '@/src/utils/dateTime';

export type RegularizationPreset = {
  dateIso: string;
  requestedClockIn?: string;
  requestedClockOut?: string;
  requestedOutDateIso?: string;
};

type PickerTarget = 'date' | 'outDate' | 'clockIn' | 'clockOut';

interface RegularizationDialogProps {
  visible: boolean;
  preset?: RegularizationPreset | null;
  onDismiss: () => void;
  onSubmit: (payload: {
    dateIso: string;
    reason: string;
    requestedClockIn?: string;
    requestedClockOut?: string;
    requestedOutDateIso?: string;
  }) => void | Promise<void>;
}

function defaultShiftTime(baseDate: Date, hours: number, minutes: number) {
  return mergeTimeOntoDate(baseDate, { hours, minutes });
}

export function RegularizationDialog({
  visible,
  preset,
  onDismiss,
  onSubmit,
}: RegularizationDialogProps) {
  const [selectedDate, setSelectedDate] = useState(() => isoToDate(getTodayIso()));
  const [outDate, setOutDate] = useState(() => isoToDate(getTodayIso()));
  const [clockInTime, setClockInTime] = useState<Date | null>(null);
  const [clockOutTime, setClockOutTime] = useState<Date | null>(null);
  const [crossDayOut, setCrossDayOut] = useState(false);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [activePicker, setActivePicker] = useState<PickerTarget | null>(null);
  const [pickerDraft, setPickerDraft] = useState<Date | null>(null);

  useEffect(() => {
    if (!visible) {
      setActivePicker(null);
      setPickerDraft(null);
      return;
    }

    const base = isoToDate(preset?.dateIso ?? getTodayIso());
    const outBase = isoToDate(preset?.requestedOutDateIso ?? preset?.dateIso ?? getTodayIso());
    setSelectedDate(base);
    setOutDate(outBase);
    setCrossDayOut(
      Boolean(
        preset?.requestedOutDateIso &&
          preset.requestedOutDateIso !== (preset.dateIso ?? getTodayIso()),
      ),
    );
    setClockInTime(
      preset?.requestedClockIn
        ? parseTimeOnDate(preset.requestedClockIn, base)
        : null,
    );
    setClockOutTime(
      preset?.requestedClockOut
        ? parseTimeOnDate(preset.requestedClockOut, outBase)
        : null,
    );
    setReason('');
    setActivePicker(null);
    setPickerDraft(null);
  }, [visible, preset]);

  const pickerValue = (
    target: PickerTarget,
    dates = { selectedDate, outDate, clockInTime, clockOutTime },
  ) => {
    if (target === 'date') return dates.selectedDate;
    if (target === 'outDate') return dates.outDate;
    if (target === 'clockIn') {
      return dates.clockInTime ?? defaultShiftTime(dates.selectedDate, 9, 0);
    }
    return dates.clockOutTime ?? defaultShiftTime(dates.outDate, 18, 0);
  };

  const applyPickerValue = (target: PickerTarget, value: Date) => {
    if (target === 'date') {
      const nextDate = dateFromPicker(value);
      setSelectedDate(nextDate);
      if (!crossDayOut) setOutDate(nextDate);
      if (clockInTime) {
        setClockInTime(mergeTimeOntoDate(nextDate, clockInTime));
      }
      if (clockOutTime && !crossDayOut) {
        setClockOutTime(mergeTimeOntoDate(nextDate, clockOutTime));
      }
      return;
    }

    if (target === 'outDate') {
      const nextDate = dateFromPicker(value);
      setOutDate(nextDate);
      if (clockOutTime) {
        setClockOutTime(mergeTimeOntoDate(nextDate, clockOutTime));
      }
      return;
    }

    if (target === 'clockIn') {
      setClockInTime(mergeTimeOntoDate(selectedDate, value));
      return;
    }

    setClockOutTime(mergeTimeOntoDate(outDate, value));
  };

  const commitDraft = (target: PickerTarget, draft: Date | null) => {
    if (draft) {
      applyPickerValue(target, draft);
    }
  };

  const openAndroidPicker = (target: PickerTarget) => {
    const mode = target === 'clockIn' || target === 'clockOut' ? 'time' : 'date';
    setActivePicker(target);

    DateTimePickerAndroid.open({
      value: pickerValue(target),
      mode,
      is24Hour: true,
      maximumDate: mode === 'date' ? new Date() : undefined,
      onValueChange: (_event, value) => {
        setActivePicker(null);
        applyPickerValue(target, value);
      },
      onDismiss: () => {
        setActivePicker(null);
      },
    });
  };

  const togglePicker = (target: PickerTarget) => {
    if (Platform.OS === 'android') {
      openAndroidPicker(target);
      return;
    }

    setActivePicker((current) => {
      if (current === target) {
        commitDraft(target, pickerDraft);
        setPickerDraft(null);
        return null;
      }

      if (current && pickerDraft) {
        commitDraft(current, pickerDraft);
      }

      setPickerDraft(pickerValue(target));
      return target;
    });
  };

  const submit = async () => {
    if (Platform.OS === 'ios' && activePicker && pickerDraft) {
      commitDraft(activePicker, pickerDraft);
      setActivePicker(null);
      setPickerDraft(null);
    }

    setBusy(true);
    try {
      const shiftDate = dateToIso(selectedDate);
      const outDateIso = dateToIso(outDate);
      await onSubmit({
        dateIso: shiftDate,
        reason: reason.trim(),
        requestedClockIn: clockInTime ? formatTime(clockInTime) : undefined,
        requestedClockOut: clockOutTime ? formatTime(clockOutTime) : undefined,
        requestedOutDateIso:
          clockOutTime && (crossDayOut || outDateIso !== shiftDate)
            ? outDateIso
            : undefined,
      });
      setReason('');
      setClockInTime(null);
      setClockOutTime(null);
      setCrossDayOut(false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDismiss}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable style={styles.backdrop} onPress={onDismiss} />
        <View style={styles.card}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.scrollContent}>
            <View style={styles.headerRow}>
              <View style={styles.headerIcon}>
                <MaterialIcons name="edit-note" size={22} color={Colors.secondary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.title}>Request adjustment</Text>
                <Text style={styles.subtitle}>
                  Correct a missed punch or wrong clock-in/out for a specific day.
                </Text>
              </View>
            </View>

            <Text style={styles.sectionLabel}>Shift date</Text>
            <PickerField
              icon="event"
              label="Shift date"
              value={formatDisplayDate(selectedDate)}
              active={activePicker === 'date'}
              onPress={() => togglePicker('date')}
            />
            {Platform.OS === 'ios' && activePicker === 'date' ? (
              <View style={styles.pickerWrap}>
                <DateTimePicker
                  value={pickerDraft ?? pickerValue('date')}
                  mode="date"
                  display="spinner"
                  maximumDate={new Date()}
                  onValueChange={(_event, value) => {
                    if (value) setPickerDraft(value);
                  }}
                />
              </View>
            ) : null}

            <Pressable
              style={styles.toggleRow}
              onPress={() => {
                const next = !crossDayOut;
                setCrossDayOut(next);
                if (!next) {
                  setOutDate(selectedDate);
                  if (clockOutTime) {
                    setClockOutTime(mergeTimeOntoDate(selectedDate, clockOutTime));
                  }
                } else {
                  const nextDay = dateFromPicker(selectedDate);
                  nextDay.setDate(nextDay.getDate() + 1);
                  setOutDate(nextDay);
                }
              }}>
              <MaterialIcons
                name={crossDayOut ? 'check-box' : 'check-box-outline-blank'}
                size={22}
                color={Colors.secondary}
              />
              <Text style={styles.toggleLabel}>
                Punch-out on next calendar day (overnight shift)
              </Text>
            </Pressable>

            {crossDayOut ? (
              <>
                <PickerField
                  icon="event"
                  label="Punch-out date"
                  value={formatDisplayDate(outDate)}
                  active={activePicker === 'outDate'}
                  onPress={() => togglePicker('outDate')}
                />
                {Platform.OS === 'ios' && activePicker === 'outDate' ? (
                  <View style={styles.pickerWrap}>
                    <DateTimePicker
                      value={pickerDraft ?? pickerValue('outDate')}
                      mode="date"
                      display="spinner"
                      maximumDate={new Date()}
                      onValueChange={(_event, value) => {
                        if (value) setPickerDraft(value);
                      }}
                    />
                  </View>
                ) : null}
              </>
            ) : null}

            <Text style={styles.sectionLabel}>Requested times (optional)</Text>
            <View style={styles.timeRow}>
              <View style={styles.timeCol}>
                <PickerField
                  icon="login"
                  label="Clock in"
                  value={clockInTime ? formatDisplayTime(clockInTime) : 'Not set'}
                  muted={!clockInTime}
                  active={activePicker === 'clockIn'}
                  onPress={() => togglePicker('clockIn')}
                />
                {clockInTime ? (
                  <Pressable onPress={() => setClockInTime(null)} hitSlop={8}>
                    <Text style={styles.clearLink}>Clear</Text>
                  </Pressable>
                ) : null}
              </View>
              <View style={styles.timeCol}>
                <PickerField
                  icon="logout"
                  label="Clock out"
                  value={clockOutTime ? formatDisplayTime(clockOutTime) : 'Not set'}
                  muted={!clockOutTime}
                  active={activePicker === 'clockOut'}
                  onPress={() => togglePicker('clockOut')}
                />
                {clockOutTime ? (
                  <Pressable onPress={() => setClockOutTime(null)} hitSlop={8}>
                    <Text style={styles.clearLink}>Clear</Text>
                  </Pressable>
                ) : null}
              </View>
            </View>

            {Platform.OS === 'ios' &&
            (activePicker === 'clockIn' || activePicker === 'clockOut') ? (
              <View style={styles.pickerWrap}>
                <DateTimePicker
                  value={pickerDraft ?? pickerValue(activePicker)}
                  mode="time"
                  display="spinner"
                  onValueChange={(_event, value) => {
                    if (value) setPickerDraft(value);
                  }}
                />
              </View>
            ) : null}

            <Text style={styles.sectionLabel}>Reason</Text>
            <TextInput
              style={styles.reasonInput}
              placeholder="Describe what needs correction (min. 3 characters)"
              placeholderTextColor={Colors.placeholder}
              value={reason}
              onChangeText={setReason}
              multiline
              textAlignVertical="top"
            />

            <View style={styles.actions}>
              <Pressable style={styles.outlineButton} onPress={onDismiss}>
                <Text style={styles.outlineButtonText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.primaryButton, (busy || reason.trim().length < 3) && styles.disabledBtn]}
                disabled={busy || reason.trim().length < 3}
                onPress={submit}>
                <Text style={styles.primaryButtonText}>{busy ? 'Submitting…' : 'Submit'}</Text>
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function PickerField({
  icon,
  label,
  value,
  muted,
  active,
  onPress,
}: {
  icon: keyof typeof MaterialIcons.glyphMap;
  label: string;
  value: string;
  muted?: boolean;
  active?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={[styles.pickerField, active && styles.pickerFieldActive]}
      onPress={onPress}
      android_ripple={{ color: Colors.ripple }}>
      <View style={styles.pickerFieldIcon}>
        <MaterialIcons name={icon} size={18} color={Colors.secondary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.pickerFieldLabel}>{label}</Text>
        <Text style={[styles.pickerFieldValue, muted && styles.pickerFieldValueMuted]}>
          {value}
        </Text>
      </View>
      <MaterialIcons
        name={active ? 'expand-less' : 'expand-more'}
        size={22}
        color={Colors.mutedForeground}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(10,22,40,0.55)',
  },
  card: {
    backgroundColor: Colors.card,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: Colors.border,
    maxHeight: '92%',
    overflow: 'hidden',
  },
  scrollContent: {
    padding: 20,
    gap: 10,
  },
  headerRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 4,
  },
  headerIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: Colors.secondaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 18,
    fontFamily: Fonts.bold,
    color: Colors.foreground,
  },
  subtitle: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 18,
    fontFamily: Fonts.regular,
    color: Colors.mutedForeground,
  },
  sectionLabel: {
    marginTop: 6,
    fontSize: 11,
    fontFamily: Fonts.bold,
    color: Colors.mutedForeground,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4,
  },
  toggleLabel: {
    flex: 1,
    fontSize: 13,
    fontFamily: Fonts.medium,
    color: Colors.foreground,
  },
  pickerField: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: 14,
    backgroundColor: Colors.inputBg,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  pickerFieldActive: {
    borderColor: Colors.secondary,
    backgroundColor: Colors.inputFocusBg,
  },
  pickerFieldIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: Colors.secondaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickerFieldLabel: {
    fontSize: 11,
    fontFamily: Fonts.semibold,
    color: Colors.mutedForeground,
  },
  pickerFieldValue: {
    marginTop: 2,
    fontSize: 15,
    fontFamily: Fonts.semibold,
    color: Colors.foreground,
    fontVariant: ['tabular-nums'],
  },
  pickerFieldValueMuted: {
    color: Colors.placeholder,
    fontFamily: Fonts.medium,
  },
  pickerWrap: {
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: Colors.inputBg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  timeRow: {
    flexDirection: 'row',
    gap: 10,
  },
  timeCol: {
    flex: 1,
    gap: 4,
  },
  clearLink: {
    alignSelf: 'flex-start',
    fontSize: 12,
    fontFamily: Fonts.semibold,
    color: Colors.secondary,
    paddingHorizontal: 4,
  },
  reasonInput: {
    minHeight: 96,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    fontFamily: Fonts.medium,
    color: Colors.foreground,
    backgroundColor: Colors.inputBg,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  outlineButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  outlineButtonText: {
    fontSize: 14,
    fontFamily: Fonts.semibold,
    color: Colors.mutedForeground,
  },
  primaryButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: 14,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    fontSize: 14,
    fontFamily: Fonts.bold,
    color: '#FFFFFF',
  },
  disabledBtn: {
    opacity: 0.55,
  },
});
