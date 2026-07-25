import { MaterialIcons } from '@expo/vector-icons';
import BottomSheet, { BottomSheetBackdrop, BottomSheetView } from '@gorhom/bottom-sheet';
import { useCallback, useMemo, useRef } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { Colors, GEOFENCE_RADIUS_METERS } from '@/src/theme/colors';
import { Fonts } from '@/src/theme/typography';

interface LocationStatusSheetProps {
  visible: boolean;
  officeLocation: string;
  distanceMeters: number;
  isWithinGeofence: boolean;
  isRefreshing: boolean;
  locationError: string | null;
  onDismiss: () => void;
  onRefresh: () => void;
}

export function LocationStatusSheet({
  visible,
  officeLocation,
  distanceMeters,
  isWithinGeofence,
  isRefreshing,
  locationError,
  onDismiss,
  onRefresh,
}: LocationStatusSheetProps) {
  const sheetRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ['48%'], []);

  const renderBackdrop = useCallback(
    (props: React.ComponentProps<typeof BottomSheetBackdrop>) => (
      <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} />
    ),
    [],
  );

  if (!visible) {
    return null;
  }

  const distanceText =
    distanceMeters <= 1 ? '1 meter from site' : `${distanceMeters}m from site`;

  return (
    <BottomSheet
      ref={sheetRef}
      index={0}
      snapPoints={snapPoints}
      enablePanDownToClose
      onClose={onDismiss}
      backdropComponent={renderBackdrop}
      backgroundStyle={styles.sheetBackground}>
      <BottomSheetView style={styles.content}>
        <View style={styles.headerRow}>
          <View style={styles.headerIcon}>
            <MaterialIcons name="location-on" size={22} color={Colors.secondary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Office Location Status</Text>
            <Text style={styles.headerSubtitle}>Live GPS verification</Text>
          </View>
        </View>

        <View style={styles.officeCard}>
          <Text style={styles.officeLabel}>Assigned Office</Text>
          <Text style={styles.officeName}>{officeLocation}</Text>
        </View>

        <View style={styles.statusCard}>
          <View
            style={[
              styles.statusBadge,
              {
                backgroundColor: isWithinGeofence
                  ? Colors.successLight
                  : Colors.destructiveLight,
              },
            ]}>
            <MaterialIcons
              name={isWithinGeofence ? 'check-circle' : 'warning'}
              size={18}
              color={isWithinGeofence ? Colors.success : Colors.destructive}
            />
            <Text
              style={[
                styles.statusText,
                { color: isWithinGeofence ? Colors.success : Colors.destructive },
              ]}>
              {isWithinGeofence ? 'Within Geofence' : 'Outside Geofence'}
            </Text>
          </View>
          <Text style={styles.distanceText}>{distanceText}</Text>
          <Text style={styles.thresholdText}>
            Check-in requires being within {GEOFENCE_RADIUS_METERS}m of the office.
          </Text>
          {locationError ? <Text style={styles.errorText}>{locationError}</Text> : null}
        </View>

        <View style={styles.actions}>
          <Pressable style={styles.outlineButton} onPress={onDismiss}>
            <Text style={styles.outlineText}>Close</Text>
          </Pressable>
          <Pressable style={styles.primaryButton} onPress={onRefresh} disabled={isRefreshing}>
            {isRefreshing ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <MaterialIcons name="my-location" size={18} color="#fff" />
                <Text style={styles.primaryText}>Refresh Location</Text>
              </>
            )}
          </Pressable>
        </View>
      </BottomSheetView>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  sheetBackground: {
    backgroundColor: Colors.card,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
  },
  content: {
    paddingHorizontal: 24,
    paddingBottom: 24,
    gap: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.inTransitLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: Fonts.bold,
    color: Colors.foreground,
  },
  headerSubtitle: {
    fontSize: 12,
    fontFamily: Fonts.regular,
    color: Colors.mutedForeground,
  },
  officeCard: {
    backgroundColor: Colors.inputBg,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 16,
  },
  officeLabel: {
    fontSize: 11,
    fontFamily: Fonts.bold,
    color: Colors.mutedForeground,
  },
  officeName: {
    marginTop: 4,
    fontSize: 16,
    fontFamily: Fonts.bold,
    color: Colors.foreground,
  },
  statusCard: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 14,
    padding: 16,
    gap: 8,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  statusText: {
    fontFamily: Fonts.bold,
    fontSize: 13,
  },
  distanceText: {
    fontSize: 15,
    fontFamily: Fonts.bold,
    color: Colors.foreground,
  },
  thresholdText: {
    fontSize: 12,
    fontFamily: Fonts.regular,
    color: Colors.mutedForeground,
  },
  errorText: {
    fontSize: 12,
    fontFamily: Fonts.medium,
    color: Colors.destructive,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  outlineButton: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  outlineText: {
    color: Colors.mutedForeground,
    fontFamily: Fonts.bold,
  },
  primaryButton: {
    flex: 1.4,
    height: 48,
    borderRadius: 14,
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  primaryText: {
    color: '#fff',
    fontFamily: Fonts.bold,
  },
});
