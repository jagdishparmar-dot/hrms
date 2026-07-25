import { MaterialIcons } from '@expo/vector-icons';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Toast from 'react-native-toast-message';

import { ScreenHeader } from '@/src/components/ScreenHeader';
import { useScreenInsets } from '@/src/components/ScreenSafeArea';
import { leaveRepository } from '@/src/repositories/leaveRepository';
import { Colors } from '@/src/theme/colors';
import { Fonts } from '@/src/theme/typography';
import type { Holiday, LeaveBalance, LeaveRequest, LeaveType } from '@/src/types';
import { getTodayIso } from '@/src/utils/dateTime';

type TabKey = 'balances' | 'apply' | 'holidays' | 'requests';

interface LeaveScreenProps {
  onRefreshAll?: () => Promise<void>;
}

export function LeaveScreen({ onRefreshAll }: LeaveScreenProps) {
  const { contentPaddingBottom } = useScreenInsets();
  const [tab, setTab] = useState<TabKey>('balances');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [types, setTypes] = useState<LeaveType[]>([]);
  const [balances, setBalances] = useState<LeaveBalance[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [showApply, setShowApply] = useState(false);

  const load = useCallback(async () => {
    const snapshot = await leaveRepository.getSnapshot();
    setTypes(snapshot.types);
    setBalances(snapshot.balances);
    setHolidays(snapshot.holidays);
    setRequests(snapshot.requests);
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        await load();
      } catch (error) {
        if (mounted) {
          Toast.show({
            type: 'error',
            text1: 'Unable to load leave',
            text2: error instanceof Error ? error.message : 'Try again later.',
          });
        }
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([load(), onRefreshAll?.() ?? Promise.resolve()]);
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Refresh failed',
        text2: error instanceof Error ? error.message : 'Try again.',
      });
    } finally {
      setRefreshing(false);
    }
  }, [load, onRefreshAll]);

  const upcomingHolidays = useMemo(() => {
    const today = getTodayIso();
    return holidays.filter((h) => h.date >= today).slice(0, 12);
  }, [holidays]);

  const tabs: Array<{ key: TabKey; label: string }> = [
    { key: 'balances', label: 'Balances' },
    { key: 'apply', label: 'Apply' },
    { key: 'holidays', label: 'Holidays' },
    { key: 'requests', label: 'My requests' },
  ];

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={Colors.secondary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScreenHeader title="Leave" subtitle="Balances, holidays & requests" />

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: contentPaddingBottom + 24 }]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.secondary}
            colors={[Colors.secondary]}
          />
        }
        showsVerticalScrollIndicator={false}>
        <View style={styles.tabRow}>
          {tabs.map((item) => (
            <Pressable
              key={item.key}
              style={[styles.tabChip, tab === item.key && styles.tabChipActive]}
              onPress={() => setTab(item.key)}>
              <Text style={[styles.tabChipText, tab === item.key && styles.tabChipTextActive]}>
                {item.label}
              </Text>
            </Pressable>
          ))}
        </View>

        {tab === 'balances' ? (
          <View style={styles.section}>
            {balances.length === 0 ? (
              <EmptyState
                icon="event-busy"
                title="No leave balances"
                subtitle="Ask HR to configure leave types for your company."
              />
            ) : (
              balances.map((balance) => (
                <View key={balance.id} style={styles.balanceCard}>
                  <View>
                    <Text style={styles.balanceTitle}>{balance.leaveTypeName || balance.leaveTypeId}</Text>
                    <Text style={styles.balanceMeta}>{balance.year} · {balance.leaveTypeCode}</Text>
                  </View>
                  <Text style={styles.balanceValue}>{balance.balance} days</Text>
                </View>
              ))
            )}
          </View>
        ) : null}

        {tab === 'apply' ? (
          <View style={styles.section}>
            <Text style={styles.sectionHint}>
              Submit a leave request for manager approval. Balance is checked when you apply.
            </Text>
            <Pressable style={styles.primaryButton} onPress={() => setShowApply(true)}>
              <MaterialIcons name="add-circle-outline" size={20} color="#FFFFFF" />
              <Text style={styles.primaryButtonText}>New leave request</Text>
            </Pressable>
          </View>
        ) : null}

        {tab === 'holidays' ? (
          <View style={styles.section}>
            {upcomingHolidays.length === 0 ? (
              <EmptyState
                icon="celebration"
                title="No upcoming holidays"
                subtitle="Company holidays will appear here once configured."
              />
            ) : (
              upcomingHolidays.map((holiday) => (
                <View key={holiday.id} style={styles.listRow}>
                  <View style={styles.listIcon}>
                    <MaterialIcons name="event" size={18} color={Colors.secondary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.listTitle}>{holiday.name}</Text>
                    <Text style={styles.listMeta}>{holiday.date}{holiday.region ? ` · ${holiday.region}` : ''}</Text>
                  </View>
                </View>
              ))
            )}
          </View>
        ) : null}

        {tab === 'requests' ? (
          <View style={styles.section}>
            {requests.length === 0 ? (
              <EmptyState
                icon="inbox"
                title="No leave requests"
                subtitle="Your submitted requests will show here with approval status."
              />
            ) : (
              requests.map((request) => (
                <View key={request.id} style={styles.requestCard}>
                  <View style={styles.requestHeader}>
                    <Text style={styles.requestTitle}>{request.leaveTypeName || request.leaveTypeId}</Text>
                    <StatusPill status={request.status} />
                  </View>
                  <Text style={styles.requestDates}>
                    {request.fromDate} → {request.toDate} · {request.days} day(s)
                  </Text>
                  {request.note ? <Text style={styles.requestNote}>{request.note}</Text> : null}
                </View>
              ))
            )}
          </View>
        ) : null}
      </ScrollView>

      <ApplyLeaveDialog
        visible={showApply}
        types={types}
        onDismiss={() => setShowApply(false)}
        onSubmitted={async () => {
          setShowApply(false);
          await load();
          setTab('requests');
          Toast.show({ type: 'success', text1: 'Leave request submitted' });
        }}
      />
    </View>
  );
}

function StatusPill({ status }: { status: LeaveRequest['status'] }) {
  const color =
    status === 'approved'
      ? Colors.statusPresent
      : status === 'rejected'
        ? Colors.destructive
        : Colors.statusLate;
  return (
    <View style={[styles.statusPill, { backgroundColor: `${color}22` }]}>
      <Text style={[styles.statusPillText, { color }]}>{status.toUpperCase()}</Text>
    </View>
  );
}

function EmptyState({
  icon,
  title,
  subtitle,
}: {
  icon: keyof typeof MaterialIcons.glyphMap;
  title: string;
  subtitle: string;
}) {
  return (
    <View style={styles.emptyState}>
      <MaterialIcons name={icon} size={28} color={Colors.mutedForeground} />
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptySubtitle}>{subtitle}</Text>
    </View>
  );
}

function ApplyLeaveDialog({
  visible,
  types,
  onDismiss,
  onSubmitted,
}: {
  visible: boolean;
  types: LeaveType[];
  onDismiss: () => void;
  onSubmitted: () => Promise<void>;
}) {
  const [leaveTypeId, setLeaveTypeId] = useState(types[0]?.id || '');
  const [fromDate, setFromDate] = useState(getTodayIso());
  const [toDate, setToDate] = useState(getTodayIso());
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (visible && types.length > 0 && !leaveTypeId) {
      setLeaveTypeId(types[0].id);
    }
  }, [visible, types, leaveTypeId]);

  const submit = async () => {
    if (!leaveTypeId) {
      setError('Select a leave type.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await leaveRepository.applyLeave({ leaveTypeId, fromDate, toDate, note });
      setNote('');
      await onSubmitted();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to apply leave.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDismiss}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          <Text style={styles.modalTitle}>Apply for leave</Text>
          <Text style={styles.modalSubtitle}>Use YYYY-MM-DD for dates.</Text>

          <Text style={styles.fieldLabel}>Leave type</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.typeRow}>
            {types.map((type) => (
              <Pressable
                key={type.id}
                style={[styles.typeChip, leaveTypeId === type.id && styles.typeChipActive]}
                onPress={() => setLeaveTypeId(type.id)}>
                <Text
                  style={[
                    styles.typeChipText,
                    leaveTypeId === type.id && styles.typeChipTextActive,
                  ]}>
                  {type.name}
                </Text>
              </Pressable>
            ))}
          </ScrollView>

          <Text style={styles.fieldLabel}>From date</Text>
          <TextInput
            style={styles.modalInput}
            value={fromDate}
            onChangeText={setFromDate}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={Colors.placeholder}
          />
          <Text style={styles.fieldLabel}>To date</Text>
          <TextInput
            style={styles.modalInput}
            value={toDate}
            onChangeText={setToDate}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={Colors.placeholder}
          />
          <Text style={styles.fieldLabel}>Note (optional)</Text>
          <TextInput
            style={[styles.modalInput, styles.noteInput]}
            value={note}
            onChangeText={setNote}
            multiline
            placeholder="Reason or context"
            placeholderTextColor={Colors.placeholder}
          />

          {error ? <Text style={styles.modalError}>{error}</Text> : null}

          <View style={styles.modalActions}>
            <Pressable style={styles.outlineButton} onPress={onDismiss}>
              <Text style={styles.outlineButtonText}>Cancel</Text>
            </Pressable>
            <Pressable style={styles.primaryButtonSmall} disabled={busy} onPress={submit}>
              <Text style={styles.primaryButtonText}>{busy ? 'Submitting…' : 'Submit'}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  centered: { alignItems: 'center', justifyContent: 'center' },
  content: { paddingHorizontal: 16, paddingTop: 14, gap: 14 },
  tabRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tabChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  tabChipActive: {
    backgroundColor: 'rgba(46, 107, 230, 0.12)',
    borderColor: Colors.secondary,
  },
  tabChipText: {
    fontSize: 12,
    fontFamily: Fonts.medium,
    color: Colors.mutedForeground,
  },
  tabChipTextActive: {
    color: Colors.secondary,
    fontFamily: Fonts.semibold,
  },
  section: { gap: 10 },
  sectionHint: {
    fontSize: 13,
    lineHeight: 18,
    fontFamily: Fonts.regular,
    color: Colors.mutedForeground,
  },
  balanceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 14,
  },
  balanceTitle: {
    fontSize: 15,
    fontFamily: Fonts.semibold,
    color: Colors.foreground,
  },
  balanceMeta: {
    marginTop: 2,
    fontSize: 12,
    fontFamily: Fonts.medium,
    color: Colors.mutedForeground,
  },
  balanceValue: {
    fontSize: 20,
    fontFamily: Fonts.bold,
    color: Colors.secondary,
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: Colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 12,
  },
  listIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(46, 107, 230, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  listTitle: {
    fontSize: 14,
    fontFamily: Fonts.semibold,
    color: Colors.foreground,
  },
  listMeta: {
    marginTop: 2,
    fontSize: 12,
    fontFamily: Fonts.medium,
    color: Colors.mutedForeground,
  },
  requestCard: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 14,
    gap: 6,
  },
  requestHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  requestTitle: {
    flex: 1,
    fontSize: 15,
    fontFamily: Fonts.semibold,
    color: Colors.foreground,
  },
  requestDates: {
    fontSize: 13,
    fontFamily: Fonts.medium,
    color: Colors.mutedForeground,
  },
  requestNote: {
    fontSize: 13,
    fontFamily: Fonts.regular,
    color: Colors.foreground,
  },
  statusPill: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  statusPillText: {
    fontSize: 10,
    fontFamily: Fonts.bold,
    letterSpacing: 0.4,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 48,
    borderRadius: 14,
    backgroundColor: Colors.primary,
  },
  primaryButtonSmall: {
    flex: 1,
    minHeight: 44,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontFamily: Fonts.bold,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 28,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontFamily: Fonts.semibold,
    color: Colors.foreground,
  },
  emptySubtitle: {
    fontSize: 13,
    fontFamily: Fonts.regular,
    color: Colors.mutedForeground,
    textAlign: 'center',
    paddingHorizontal: 24,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(4, 16, 31, 0.45)',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: Colors.card,
    borderRadius: 18,
    padding: 18,
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: Fonts.bold,
    color: Colors.foreground,
  },
  modalSubtitle: {
    marginTop: 4,
    marginBottom: 12,
    fontSize: 13,
    fontFamily: Fonts.regular,
    color: Colors.mutedForeground,
  },
  fieldLabel: {
    fontSize: 12,
    fontFamily: Fonts.semibold,
    color: Colors.label,
    marginBottom: 6,
    marginTop: 4,
  },
  typeRow: { marginBottom: 8 },
  typeChip: {
    marginRight: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  typeChipActive: {
    borderColor: Colors.secondary,
    backgroundColor: 'rgba(46, 107, 230, 0.12)',
  },
  typeChipText: {
    fontSize: 12,
    fontFamily: Fonts.medium,
    color: Colors.mutedForeground,
  },
  typeChipTextActive: {
    color: Colors.secondary,
    fontFamily: Fonts.semibold,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    minHeight: 44,
    fontSize: 14,
    fontFamily: Fonts.medium,
    color: Colors.foreground,
    marginBottom: 8,
  },
  noteInput: {
    minHeight: 72,
    textAlignVertical: 'top',
    paddingTop: 10,
  },
  modalError: {
    color: Colors.destructive,
    fontSize: 13,
    fontFamily: Fonts.medium,
    marginBottom: 8,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  outlineButton: {
    flex: 1,
    minHeight: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  outlineButtonText: {
    fontSize: 14,
    fontFamily: Fonts.semibold,
    color: Colors.foreground,
  },
});
