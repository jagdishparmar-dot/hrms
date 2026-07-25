import { ScreenSafeArea } from '@/src/components/ScreenSafeArea';
import { useAttendanceStore } from '@/src/hooks/AttendanceProvider';
import { HomeScreen } from '@/src/screens/HomeScreen';

export default function HomeTab() {
  const {
    uiState,
    isRefreshing,
    refreshAll,
    handleClockAction,
    toggleLocationStatusSheet,
    requestLocationPermissionFlow,
  } = useAttendanceStore();

  return (
    <ScreenSafeArea edges="bottom">
      <HomeScreen
        uiState={uiState}
        refreshing={isRefreshing}
        onRefresh={refreshAll}
        onClockClick={handleClockAction}
        onLocationClick={() => toggleLocationStatusSheet(true)}
        onRequestLocationPermission={requestLocationPermissionFlow}
      />
    </ScreenSafeArea>
  );
}
