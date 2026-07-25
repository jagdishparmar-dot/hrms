import { ScreenSafeArea } from '@/src/components/ScreenSafeArea';
import { useAttendanceStore } from '@/src/hooks/AttendanceProvider';
import { LeaveScreen } from '@/src/screens/LeaveScreen';

export default function LeaveTab() {
  const { refreshAll } = useAttendanceStore();

  return (
    <ScreenSafeArea edges="bottom">
      <LeaveScreen onRefreshAll={refreshAll} />
    </ScreenSafeArea>
  );
}
