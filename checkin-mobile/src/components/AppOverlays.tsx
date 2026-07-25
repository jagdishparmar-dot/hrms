import { CheckInSuccessDialog } from '@/src/components/CheckInSuccessDialog';
import { LocationPermissionDialog } from '@/src/components/LocationPermissionDialog';
import { LocationStatusSheet } from '@/src/components/LocationStatusSheet';
import { useAttendanceStore } from '@/src/hooks/AttendanceProvider';

export function AppOverlays() {
  const {
    uiState,
    dismissSuccessAnimation,
    toggleLocationPermissionDialog,
    toggleLocationStatusSheet,
    requestLocationPermissionFlow,
    refreshLocation,
  } = useAttendanceStore();

  return (
    <>
      <LocationPermissionDialog
        visible={uiState.showLocationPermissionDialog}
        officeLocation={uiState.userProfile.officeLocation}
        onRequestPermission={requestLocationPermissionFlow}
        onDismiss={() => toggleLocationPermissionDialog(false)}
      />

      <CheckInSuccessDialog
        visible={uiState.showSuccessAnimation}
        timeFormatted={uiState.successClockInTime ?? uiState.currentTimeFormatted}
        locationName={uiState.userProfile.officeLocation}
        userName={uiState.userProfile.name}
        onDismiss={dismissSuccessAnimation}
      />

      <LocationStatusSheet
        visible={uiState.showLocationStatusSheet}
        officeLocation={uiState.userProfile.officeLocation}
        distanceMeters={uiState.userProfile.lastKnownDistanceMeters}
        isWithinGeofence={uiState.userProfile.isWithinGeofence}
        isRefreshing={uiState.isRefreshingLocation}
        locationError={uiState.locationError}
        onDismiss={() => toggleLocationStatusSheet(false)}
        onRefresh={refreshLocation}
      />
    </>
  );
}
