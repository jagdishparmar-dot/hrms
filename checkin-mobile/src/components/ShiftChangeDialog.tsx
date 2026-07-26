import { MaterialIcons } from '@expo/vector-icons';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
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

import {
  fetchShiftCatalog,
  submitShiftChangeRequest,
} from '@/src/repositories/shiftRepository';
import { Colors } from '@/src/theme/colors';
import { Fonts } from '@/src/theme/typography';
import type { ShiftCatalogItem, TodayShiftInfo } from '@/src/types';
import {
  dateFromPicker,
  dateToIso,
  formatDisplayDate,
  getTodayIso,
  isoToDate,
} from '@/src/utils/dateTime';

export type ShiftChangePreset = {
  dateIso?: string;
  requestedShiftId?: string;
  sequence?: number;
};

interface ShiftChangeDialogProps {
  visible: boolean;
  companyId: string | null;
  currentShifts?: TodayShiftInfo[];
  preset?: ShiftChangePreset | null;
  onDismiss: () => void;
  onSubmitted?: () => void | Promise<void>;
}

export function ShiftChangeDialog({
  visible,
  companyId,
  currentShifts = [],
  preset,
  onDismiss,
  onSubmitted,
}: ShiftChangeDialogProps) {
  const [selectedDate, setSelectedDate] = useState(() => isoToDate(getTodayIso()));
  const [sequence, setSequence] = useState(1);
  const [reason, setReason] = useState('');
  const [selectedShiftId, setSelectedShiftId] = useState<string | null>(null);
  const [catalog, setCatalog] = useState<ShiftCatalogItem[]>([]);
  const [loadingCatalog, setLoadingCatalog] = useState(false);
  const [busy, setBusy] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [dateDraft, setDateDraft] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) {
      setShowDatePicker(false);
      setDateDraft(null);
      setError(null);
      return;
    }

    const base = isoToDate(preset?.dateIso ?? getTodayIso());
    setSelectedDate(base);
    setSequence(preset?.sequence ?? currentShifts[0]?.sequence ?? 1);
    setSelectedShiftId(preset?.requestedShiftId ?? null);
    setReason('');
    setError(null);

    let cancelled = false;
    setLoadingCatalog(true);
    fetchShiftCatalog(companyId)
      .then((rows) => {
        if (!cancelled) setCatalog(rows);
      })
      .catch(() => {
        if (!cancelled) setError('Unable to load available shifts.');
      })
      .finally(() => {
        if (!cancelled) setLoadingCatalog(false);
      });

    return () => {
      cancelled = true;
    };
  }, [visible, companyId, preset, currentShifts]);

  const currentShiftLabel = useMemo(() => {
    const match = currentShifts.find((shift) => shift.sequence === sequence);
    if (match) {
      return `${match.name}${match.code ? ` (${match.code})` : ''} · ${match.windowLabel}`;
    }
    return 'Default / not rostered yet';
  }, [currentShifts, sequence]);

  const openDatePicker = () => {
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: selectedDate,
        mode: 'date',
        minimumDate: isoToDate(getTodayIso()),
        onValueChange: (_event, value) => {
          if (value) setSelectedDate(dateFromPicker(value));
        },
      });
      return;
    }
    setDateDraft(selectedDate);
    setShowDatePicker(true);
  };

  const submit = async () => {
    if (Platform.OS === 'ios' && showDatePicker && dateDraft) {
      setSelectedDate(dateDraft);
      setShowDatePicker(false);
    }

    if (!selectedShiftId) {
      setError('Select the shift you want to work.');
      return;
    }
    if (reason.trim().length < 3) {
      setError('Provide a brief reason (at least 3 characters).');
      return;
    }

    setBusy(true);
    setError(null);
    try {
      await submitShiftChangeRequest(companyId, {
        dateIso: dateToIso(selectedDate),
        requestedShiftId: selectedShiftId,
        reason: reason.trim(),
        sequence,
      });
      await onSubmitted?.();
      onDismiss();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to submit request');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onDismiss}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onDismiss} />
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <Text style={styles.title}>Request shift change</Text>
          <Text style={styles.subtitle}>
            HR will review your request. Once approved, your roster and punch windows update for
            that date.
          </Text>

          <ScrollView style={styles.form} keyboardShouldPersistTaps="handled">
            <Text style={styles.label}>Date</Text>
            <Pressable style={styles.field} onPress={openDatePicker}>
              <MaterialIcons name="event" size={18} color={Colors.secondary} />
              <Text style={styles.fieldText}>{formatDisplayDate(selectedDate)}</Text>
              <MaterialIcons name="chevron-right" size={20} color={Colors.mutedForeground} />
            </Pressable>

            {Platform.OS === 'ios' && showDatePicker ? (
              <View style={styles.pickerWrap}>
                <DateTimePicker
                  value={dateDraft ?? selectedDate}
                  mode="date"
                  display="spinner"
                  minimumDate={isoToDate(getTodayIso())}
                  onValueChange={(_event, value) => {
                    if (value) setDateDraft(dateFromPicker(value));
                  }}
                />
                <Pressable
                  style={styles.pickerDone}
                  onPress={() => {
                    if (dateDraft) setSelectedDate(dateDraft);
                    setShowDatePicker(false);
                  }}>
                  <Text style={styles.pickerDoneText}>Done</Text>
                </Pressable>
              </View>
            ) : null}

            {currentShifts.length > 1 ? (
              <>
                <Text style={styles.label}>Shift slot</Text>
                <View style={styles.chipRow}>
                  {currentShifts.map((shift) => (
                    <Pressable
                      key={`${shift.shiftId}-${shift.sequence}`}
                      style={[styles.chip, sequence === shift.sequence ? styles.chipActive : null]}
                      onPress={() => setSequence(shift.sequence)}>
                      <Text
                        style={[
                          styles.chipText,
                          sequence === shift.sequence ? styles.chipTextActive : null,
                        ]}>
                        #{shift.sequence} {shift.code || shift.name}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </>
            ) : null}

            <Text style={styles.label}>Current assignment</Text>
            <Text style={styles.currentShift}>{currentShiftLabel}</Text>

            <Text style={styles.label}>Requested shift</Text>
            {loadingCatalog ? (
              <ActivityIndicator color={Colors.secondary} style={styles.loader} />
            ) : catalog.length === 0 ? (
              <Text style={styles.emptyCatalog}>No active shifts configured. Contact HR.</Text>
            ) : (
              <View style={styles.shiftList}>
                {catalog.map((shift) => {
                  const active = selectedShiftId === shift.id;
                  return (
                    <Pressable
                      key={shift.id}
                      style={[styles.shiftOption, active ? styles.shiftOptionActive : null]}
                      onPress={() => setSelectedShiftId(shift.id)}>
                      <View style={styles.shiftOptionMain}>
                        <Text style={styles.shiftOptionName}>{shift.name}</Text>
                        <Text style={styles.shiftOptionMeta}>
                          {shift.code ? `${shift.code} · ` : ''}
                          {shift.startTime} – {shift.endTime}
                        </Text>
                      </View>
                      {active ? (
                        <MaterialIcons name="check-circle" size={20} color={Colors.secondary} />
                      ) : null}
                    </Pressable>
                  );
                })}
              </View>
            )}

            <Text style={styles.label}>Reason</Text>
            <TextInput
              style={styles.textArea}
              multiline
              numberOfLines={4}
              placeholder="Why do you need this shift change?"
              placeholderTextColor={Colors.mutedForeground}
              value={reason}
              onChangeText={setReason}
              textAlignVertical="top"
            />

            {error ? <Text style={styles.error}>{error}</Text> : null}
          </ScrollView>

          <View style={styles.actions}>
            <Pressable style={styles.cancelBtn} onPress={onDismiss} disabled={busy}>
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
            <Pressable
              style={[styles.submitBtn, busy ? styles.submitBtnDisabled : null]}
              onPress={submit}
              disabled={busy}>
              {busy ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitText}>Submit request</Text>
              )}
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(15,23,42,0.45)',
  },
  sheet: {
    backgroundColor: Colors.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 24,
    maxHeight: '92%',
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 999,
    backgroundColor: Colors.border,
    marginBottom: 12,
  },
  title: {
    fontFamily: Fonts.semibold,
    fontSize: 20,
    color: Colors.foreground,
  },
  subtitle: {
    marginTop: 6,
    fontFamily: Fonts.regular,
    fontSize: 13,
    lineHeight: 18,
    color: Colors.mutedForeground,
  },
  form: {
    marginTop: 16,
    maxHeight: 420,
  },
  label: {
    fontFamily: Fonts.medium,
    fontSize: 13,
    color: Colors.mutedForeground,
    marginBottom: 8,
    marginTop: 12,
  },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: Colors.background,
  },
  fieldText: {
    flex: 1,
    fontFamily: Fonts.medium,
    fontSize: 15,
    color: Colors.foreground,
  },
  pickerWrap: {
    marginTop: 8,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: Colors.background,
  },
  pickerDone: {
    alignItems: 'center',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  pickerDoneText: {
    fontFamily: Fonts.semibold,
    color: Colors.secondary,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: Colors.background,
  },
  chipActive: {
    borderColor: Colors.secondary,
    backgroundColor: Colors.secondaryLight,
  },
  chipText: {
    fontFamily: Fonts.medium,
    fontSize: 12,
    color: Colors.mutedForeground,
  },
  chipTextActive: {
    color: Colors.secondary,
  },
  currentShift: {
    fontFamily: Fonts.regular,
    fontSize: 14,
    color: Colors.foreground,
    paddingVertical: 4,
  },
  shiftList: {
    gap: 8,
  },
  shiftOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: Colors.background,
  },
  shiftOptionActive: {
    borderColor: Colors.secondary,
    backgroundColor: Colors.secondaryLight,
  },
  shiftOptionMain: {
    flex: 1,
  },
  shiftOptionName: {
    fontFamily: Fonts.semibold,
    fontSize: 14,
    color: Colors.foreground,
  },
  shiftOptionMeta: {
    marginTop: 2,
    fontFamily: Fonts.regular,
    fontSize: 12,
    color: Colors.mutedForeground,
  },
  textArea: {
    minHeight: 96,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: Fonts.regular,
    fontSize: 14,
    color: Colors.foreground,
    backgroundColor: Colors.background,
  },
  loader: {
    marginVertical: 12,
  },
  emptyCatalog: {
    fontFamily: Fonts.regular,
    fontSize: 13,
    color: Colors.mutedForeground,
  },
  error: {
    marginTop: 10,
    fontFamily: Fonts.medium,
    fontSize: 13,
    color: Colors.destructive,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  cancelBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingVertical: 14,
  },
  cancelText: {
    fontFamily: Fonts.semibold,
    color: Colors.foreground,
  },
  submitBtn: {
    flex: 1.4,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    backgroundColor: Colors.secondary,
    paddingVertical: 14,
  },
  submitBtnDisabled: {
    opacity: 0.7,
  },
  submitText: {
    fontFamily: Fonts.semibold,
    color: '#fff',
  },
});
