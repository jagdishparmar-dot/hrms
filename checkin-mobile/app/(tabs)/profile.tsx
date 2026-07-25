import { ScreenSafeArea } from '@/src/components/ScreenSafeArea';
import { useAuth } from '@/src/hooks/AuthProvider';
import { useAttendanceStore } from '@/src/hooks/AttendanceProvider';
import { ProfileScreen } from '@/src/screens/ProfileScreen';

export default function ProfileTab() {
  const { uiState, isRefreshing, refreshAll, updateProfile, toggleLocationStatusSheet } =
    useAttendanceStore();
  const { logout } = useAuth();

  return (
    <ScreenSafeArea edges="bottom">
      <ProfileScreen
        uiState={uiState}
        refreshing={isRefreshing}
        onRefresh={refreshAll}
        onUpdateProfile={updateProfile}
        onOpenLocationSheet={() => toggleLocationStatusSheet(true)}
        onLogout={logout}
      />
    </ScreenSafeArea>
  );
}
