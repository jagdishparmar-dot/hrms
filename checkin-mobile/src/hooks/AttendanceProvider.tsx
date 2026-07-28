import Constants from 'expo-constants';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import Toast from 'react-native-toast-message';

import { useAuth } from '@/src/hooks/AuthProvider';
import {
  attendanceRepository,
  DEFAULT_USER_PROFILE,
} from '@/src/repositories/attendanceRepository';
import { fetchTodayShiftSchedule } from '@/src/repositories/shiftRepository';
import { warmAuthHeaders } from '@/src/services/apiClient';
import {
  checkLocationPermission,
  getCurrentLocationWithPermission,
  getPunchLocation,
  requestLocationPermission,
  warmLocationCache,
} from '@/src/services/locationService';
import type { AttendanceRecord, MainUiState, TodayShiftSchedule, UserProfile } from '@/src/types';
import {
  getCurrentDateHeader,
  getCurrentTime,
  getDateOnly,
  getDayOfWeek,
  getTodayIso,
} from '@/src/utils/dateTime';
import { findOpenAttendanceRecord } from '@/src/utils/openShift';

interface AttendanceContextValue {
  uiState: MainUiState;
  isRefreshing: boolean;
  handleClockAction: () => Promise<void>;
  refreshLocation: () => Promise<void>;
  refreshAll: () => Promise<void>;
  requestLocationPermissionFlow: () => Promise<void>;
  updateProfile: (patch: Record<string, string>) => Promise<void>;
  toggleLocationStatusSheet: (show: boolean) => void;
  toggleLocationPermissionDialog: (show: boolean) => void;
  dismissSuccessAnimation: () => void;
  clearSnackbar: () => void;
  reloadData: () => Promise<void>;
}

const EMPTY_SHIFT_SCHEDULE: TodayShiftSchedule = {
  dateIso: '',
  timezone: '',
  shifts: [],
};

function fallbackShiftSchedule(profile: UserProfile, todayIso: string): TodayShiftSchedule {
  const start = profile.workShiftStart || '09:00';
  const end = profile.workShiftEnd || '18:00';
  return {
    dateIso: todayIso,
    timezone: '',
    shifts: [
      {
        dateIso: todayIso,
        sequence: 1,
        shiftId: '',
        name: 'Assigned hours',
        code: 'DEFAULT',
        shiftType: 'general',
        startTime: start,
        endTime: end,
        windowLabel: `${start} – ${end}`,
        source: 'default',
      },
    ],
  };
}

function mergeAttendanceRecord(
  records: AttendanceRecord[],
  record: AttendanceRecord,
): AttendanceRecord[] {
  const index = records.findIndex(
    (item) => item.id === record.id || item.dateIso === record.dateIso,
  );
  if (index >= 0) {
    const next = [...records];
    next[index] = { ...next[index], ...record };
    return next;
  }
  return [record, ...records];
}

const AttendanceContext = createContext<AttendanceContextValue | null>(null);

const initialExtraState = {
  isClockInLoading: false,
  showLocationStatusSheet: false,
  showSuccessAnimation: false,
  successClockInTime: null as string | null,
  hasLocationPermission: false,
  showLocationPermissionDialog: false,
  snackbarMessage: null as string | null,
  isRefreshingLocation: false,
  locationError: null as string | null,
};

export function AttendanceProvider({ children }: { children: ReactNode }) {
  const { user, isAuthenticated } = useAuth();
  const [userProfile, setUserProfile] = useState(DEFAULT_USER_PROFILE);
  const [allRecords, setAllRecords] = useState<MainUiState['allRecords']>([]);
  const [todayShiftSchedule, setTodayShiftSchedule] =
    useState<TodayShiftSchedule>(EMPTY_SHIFT_SCHEDULE);
  const [timeState, setTimeState] = useState({
    currentTimeFormatted: getCurrentTime(),
    currentDateFormatted: getCurrentDateHeader(),
    dayOfWeek: getDayOfWeek(),
    formattedDateOnly: getDateOnly(),
    todayIso: getTodayIso(),
  });
  const [extra, setExtra] = useState(initialExtraState);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const showMessage = useCallback((message: string) => {
    setExtra((prev) => ({ ...prev, snackbarMessage: message }));
  }, []);

  const reloadData = useCallback(async () => {
    if (!isAuthenticated) {
      setUserProfile(DEFAULT_USER_PROFILE);
      setAllRecords([]);
      setTodayShiftSchedule(EMPTY_SHIFT_SCHEDULE);
      return;
    }

    const [profile, records] = await Promise.all([
      attendanceRepository.getUserProfile(),
      attendanceRepository.getAllRecords(),
    ]);
    if (profile) {
      setUserProfile(profile);
    }
    setAllRecords(records);

    try {
      const schedule = await fetchTodayShiftSchedule(attendanceRepository.getCompanyId());
      setTodayShiftSchedule(schedule);
    } catch {
      setTodayShiftSchedule(
        fallbackShiftSchedule(profile ?? DEFAULT_USER_PROFILE, getTodayIso()),
      );
    }
  }, [isAuthenticated]);

  const refreshAll = useCallback(async () => {
    if (!isAuthenticated) return;

    setIsRefreshing(true);
    try {
      await reloadData();

      const granted = await checkLocationPermission();
      setExtra((prev) => ({ ...prev, hasLocationPermission: granted }));

      if (granted) {
        try {
          const profile = await attendanceRepository.getUserProfile();
          if (profile) {
            const location = await getCurrentLocationWithPermission(
              profile.officeLatitude,
              profile.officeLongitude,
              profile.geofenceRadiusMeters,
            );
            const updated = await attendanceRepository.updateLocationStatus(location);
            setUserProfile(updated);
          }
        } catch {
          // Location refresh is best-effort during pull-to-refresh.
        }
      }
    } finally {
      setIsRefreshing(false);
    }
  }, [isAuthenticated, reloadData]);

  useEffect(() => {
    let mounted = true;

    async function bootstrap() {
      if (!isAuthenticated || !user) {
        setUserProfile(DEFAULT_USER_PROFILE);
        setAllRecords([]);
        return;
      }

      await reloadData();
      if (!mounted) return;

      const granted = await checkLocationPermission();
      if (!mounted) return;
      setExtra((prev) => ({ ...prev, hasLocationPermission: granted }));

      if (granted) {
        try {
          const profile = (await attendanceRepository.getUserProfile()) ?? DEFAULT_USER_PROFILE;
          const location = await getCurrentLocationWithPermission(
            profile.officeLatitude,
            profile.officeLongitude,
            profile.geofenceRadiusMeters,
          );
          const updated = await attendanceRepository.updateLocationStatus(location);
          if (mounted) {
            setUserProfile(updated);
          }
        } catch {
          // Location refresh on launch is best-effort.
        }
      }

      void warmLocationCache();
      void warmAuthHeaders(attendanceRepository.getCompanyId());
    }

    bootstrap();
    return () => {
      mounted = false;
    };
  }, [isAuthenticated, user, reloadData]);

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeState({
        currentTimeFormatted: getCurrentTime(),
        currentDateFormatted: getCurrentDateHeader(),
        dayOfWeek: getDayOfWeek(),
        formattedDateOnly: getDateOnly(),
        todayIso: getTodayIso(),
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (extra.snackbarMessage) {
      Toast.show({
        type: 'info',
        text1: extra.snackbarMessage,
        position: 'bottom',
        visibilityTime: 3000,
        onHide: () => setExtra((prev) => ({ ...prev, snackbarMessage: null })),
      });
    }
  }, [extra.snackbarMessage]);

  const todayRecord = useMemo(
    () => allRecords.find((record) => record.dateIso === timeState.todayIso) ?? null,
    [allRecords, timeState.todayIso],
  );

  const openRecord = useMemo(
    () => findOpenAttendanceRecord(allRecords),
    [allRecords],
  );

  const uiState: MainUiState = {
    userProfile,
    todayRecord,
    openRecord,
    todayShiftSchedule,
    allRecords,
    ...timeState,
    ...extra,
  };

  const refreshLocation = useCallback(async () => {
    setExtra((prev) => ({ ...prev, isRefreshingLocation: true, locationError: null }));
    try {
      const granted = await checkLocationPermission();
      if (!granted) {
        setExtra((prev) => ({
          ...prev,
          isRefreshingLocation: false,
          hasLocationPermission: false,
          showLocationPermissionDialog: true,
          locationError: 'Location permission required',
        }));
        return;
      }

      const profile = (await attendanceRepository.getUserProfile()) ?? userProfile;
      const location = await getCurrentLocationWithPermission(
        profile.officeLatitude,
        profile.officeLongitude,
        profile.geofenceRadiusMeters,
      );
      const updated = await attendanceRepository.updateLocationStatus(location);
      setUserProfile(updated);
      setExtra((prev) => ({
        ...prev,
        isRefreshingLocation: false,
        hasLocationPermission: true,
        locationError: null,
        snackbarMessage: `Location updated: ${location.distanceMeters} meters from office`,
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to fetch location';
      setExtra((prev) => ({
        ...prev,
        isRefreshingLocation: false,
        locationError: message,
        snackbarMessage: message,
      }));
    }
  }, [userProfile]);

  const requestLocationPermissionFlow = useCallback(async () => {
    const granted = await requestLocationPermission();
    setExtra((prev) => ({
      ...prev,
      hasLocationPermission: granted,
      showLocationPermissionDialog: false,
      snackbarMessage: granted
        ? 'Location permission granted. Site location verified.'
        : 'Location permission required to verify office site.',
    }));
    if (granted) {
      await refreshLocation();
    }
  }, [refreshLocation]);

  const handleClockAction = useCallback(async () => {
    const policy = userProfile.attendancePolicy || 'geofenced';

    if (policy === 'manual') {
      setExtra((prev) => ({
        ...prev,
        snackbarMessage: 'Self punch is disabled for your account. Contact HR to mark attendance.',
      }));
      return;
    }

    if ((openRecord ?? todayRecord) == null && !extra.hasLocationPermission) {
      setExtra((prev) => ({ ...prev, showLocationPermissionDialog: true }));
      return;
    }

    setExtra((prev) => ({ ...prev, isClockInLoading: true }));

    const activeOpenRecord =
      openRecord ?? (todayRecord?.clockOutTime == null ? todayRecord : null);

    const deviceId =
      Constants.installationId || Constants.sessionId || Constants.deviceName || undefined;

    void attendanceRepository.warmPunchAuth();

    try {
      const resolvePunchLocation = async () => {
        const requireGeofence = policy === 'geofenced';
        const location = await getPunchLocation(
          userProfile.officeLatitude,
          userProfile.officeLongitude,
          userProfile.geofenceRadiusMeters,
          {
            requireGeofence,
            cached: attendanceRepository.getLocationCache(),
          },
        );
        const updated = await attendanceRepository.updateLocationStatus(location);
        setUserProfile(updated);
        if (requireGeofence && !location.isWithinGeofence) {
          throw new Error(
            `You are ${location.distanceMeters}m from site. Check-in requires being within ${userProfile.geofenceRadiusMeters}m.`,
          );
        }
        return location;
      };

      if (activeOpenRecord) {
        const location = await resolvePunchLocation();
        const updated = await attendanceRepository.clockOut({
          lat: location.latitude,
          long: location.longitude,
          accuracy: location.accuracy ?? undefined,
          deviceId,
        });
        setAllRecords((records) => mergeAttendanceRecord(records, updated));
        const priorDay =
          activeOpenRecord.dateIso !== getTodayIso()
            ? ` (shift from ${activeOpenRecord.dateIso})`
            : '';
        setExtra((prev) => ({
          ...prev,
          isClockInLoading: false,
          snackbarMessage: `Clocked out at ${updated.clockOutTime}${priorDay}! Total working time: ${updated.totalHoursFormatted}`,
        }));
        void reloadData();
      } else if (todayRecord?.clockOutTime != null) {
        setExtra((prev) => ({
          ...prev,
          isClockInLoading: false,
          snackbarMessage: `You have already completed attendance for today (${todayRecord.totalHoursFormatted} hrs).`,
        }));
      } else {
        const location = await resolvePunchLocation();
        const newRecord = await attendanceRepository.clockIn({
          lat: location.latitude,
          long: location.longitude,
          accuracy: location.accuracy ?? undefined,
          deviceId,
        });
        setAllRecords((records) => mergeAttendanceRecord(records, newRecord));
        setExtra((prev) => ({
          ...prev,
          isClockInLoading: false,
          showSuccessAnimation: true,
          successClockInTime: newRecord.clockInTime,
          snackbarMessage: `Successfully clocked in at ${newRecord.clockInTime}!`,
        }));
        void reloadData();
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Clock action failed';
      setExtra((prev) => ({
        ...prev,
        isClockInLoading: false,
        snackbarMessage: message,
      }));
    }
  }, [
    extra.hasLocationPermission,
    openRecord,
    reloadData,
    todayRecord,
    userProfile,
  ]);

  const updateProfile = useCallback(
    async (patch: Record<string, string>) => {
      const updated = await attendanceRepository.saveProfile(patch);
      setUserProfile(updated);
      showMessage('Profile details updated!');
    },
    [showMessage],
  );

  const value: AttendanceContextValue = {
    uiState,
    isRefreshing,
    handleClockAction,
    refreshLocation,
    refreshAll,
    requestLocationPermissionFlow,
    updateProfile,
    toggleLocationStatusSheet: (show) =>
      setExtra((prev) => ({ ...prev, showLocationStatusSheet: show })),
    toggleLocationPermissionDialog: (show) =>
      setExtra((prev) => ({ ...prev, showLocationPermissionDialog: show })),
    dismissSuccessAnimation: () =>
      setExtra((prev) => ({ ...prev, showSuccessAnimation: false })),
    clearSnackbar: () => setExtra((prev) => ({ ...prev, snackbarMessage: null })),
    reloadData,
  };

  return <AttendanceContext.Provider value={value}>{children}</AttendanceContext.Provider>;
}

export function useAttendanceStore(): AttendanceContextValue {
  const context = useContext(AttendanceContext);
  if (!context) {
    throw new Error('useAttendanceStore must be used within AttendanceProvider');
  }
  return context;
}
