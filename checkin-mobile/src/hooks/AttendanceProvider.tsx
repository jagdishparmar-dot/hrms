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
import {
  checkLocationPermission,
  getCurrentLocationWithPermission,
  requestLocationPermission,
} from '@/src/services/locationService';
import type { MainUiState, UserProfile } from '@/src/types';
import {
  getCurrentDateHeader,
  getCurrentTime,
  getDateOnly,
  getDayOfWeek,
  getTodayIso,
} from '@/src/utils/dateTime';

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
            const updated = await attendanceRepository.updateLocationStatus(
              location.distanceMeters,
              location.isWithinGeofence,
            );
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
          const updated = await attendanceRepository.updateLocationStatus(
            location.distanceMeters,
            location.isWithinGeofence,
          );
          if (mounted) {
            setUserProfile(updated);
          }
        } catch {
          // Location refresh on launch is best-effort.
        }
      }
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

  const uiState: MainUiState = {
    userProfile,
    todayRecord,
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
      const updated = await attendanceRepository.updateLocationStatus(
        location.distanceMeters,
        location.isWithinGeofence,
      );
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
    if (todayRecord == null && !extra.hasLocationPermission) {
      setExtra((prev) => ({ ...prev, showLocationPermissionDialog: true }));
      return;
    }

    setExtra((prev) => ({ ...prev, isClockInLoading: true }));

    try {
      if (todayRecord == null) {
        let distanceMeters = userProfile.lastKnownDistanceMeters;
        try {
          const location = await getCurrentLocationWithPermission(
            userProfile.officeLatitude,
            userProfile.officeLongitude,
            userProfile.geofenceRadiusMeters,
          );
          distanceMeters = location.distanceMeters;
          const updated = await attendanceRepository.updateLocationStatus(
            location.distanceMeters,
            location.isWithinGeofence,
          );
          setUserProfile(updated);

          if (!location.isWithinGeofence) {
            setExtra((prev) => ({
              ...prev,
              isClockInLoading: false,
              snackbarMessage: `You are ${location.distanceMeters}m from office. Check-in requires being within ${userProfile.geofenceRadiusMeters}m.`,
            }));
            return;
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Unable to verify location';
          setExtra((prev) => ({
            ...prev,
            isClockInLoading: false,
            snackbarMessage: message,
          }));
          return;
        }

        const location = await getCurrentLocationWithPermission(
          userProfile.officeLatitude,
          userProfile.officeLongitude,
          userProfile.geofenceRadiusMeters,
        );
        const deviceId =
          Constants.installationId || Constants.sessionId || Constants.deviceName || undefined;
        const newRecord = await attendanceRepository.clockIn({
          lat: location.latitude,
          long: location.longitude,
          accuracy: location.accuracy ?? undefined,
          deviceId,
        });
        await reloadData();
        setExtra((prev) => ({
          ...prev,
          isClockInLoading: false,
          showSuccessAnimation: true,
          successClockInTime: newRecord.clockInTime,
          snackbarMessage: `Successfully clocked in at ${newRecord.clockInTime}!`,
        }));
      } else if (todayRecord.clockOutTime == null) {
        const location = await getCurrentLocationWithPermission(
          userProfile.officeLatitude,
          userProfile.officeLongitude,
          userProfile.geofenceRadiusMeters,
        );
        const deviceId =
          Constants.installationId || Constants.sessionId || Constants.deviceName || undefined;
        const updated = await attendanceRepository.clockOut({
          lat: location.latitude,
          long: location.longitude,
          accuracy: location.accuracy ?? undefined,
          deviceId,
        });
        await reloadData();
        setExtra((prev) => ({
          ...prev,
          isClockInLoading: false,
          snackbarMessage: `Clocked out at ${updated.clockOutTime}! Total working time: ${updated.totalHoursFormatted}`,
        }));
      } else {
        setExtra((prev) => ({
          ...prev,
          isClockInLoading: false,
          snackbarMessage: `You have already completed attendance for today (${todayRecord.totalHoursFormatted} hrs).`,
        }));
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
    reloadData,
    timeState.dayOfWeek,
    timeState.formattedDateOnly,
    timeState.todayIso,
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
