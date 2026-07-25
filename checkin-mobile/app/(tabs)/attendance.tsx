import { ScreenSafeArea } from '@/src/components/ScreenSafeArea';
import { useAttendanceStore } from '@/src/hooks/AttendanceProvider';
import { AttendanceScreen } from '@/src/screens/AttendanceScreen';

export default function AttendanceTab() {
  const { uiState, isRefreshing, refreshAll } = useAttendanceStore();

  return (
    <ScreenSafeArea edges="bottom">
      <AttendanceScreen
        uiState={uiState}
        refreshing={isRefreshing}
        onRefresh={refreshAll}
      />
    </ScreenSafeArea>
  );
}
