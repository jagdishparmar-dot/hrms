import { MaterialIcons } from '@expo/vector-icons';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { Colors } from '@/src/theme/colors';
import { Fonts } from '@/src/theme/typography';

interface LocationPermissionDialogProps {
  visible: boolean;
  officeLocation: string;
  onRequestPermission: () => void;
  onDismiss: () => void;
}

const RATIONALE = [
  {
    icon: 'location-on' as const,
    title: 'Geofence Distance Check',
    desc: 'Verifies physical presence within 500 meters of the office.',
  },
  {
    icon: 'check-circle' as const,
    title: 'Automated Site Matching',
    desc: 'Matches device GPS to your assigned workspace.',
  },
  {
    icon: 'security' as const,
    title: 'Secure & Private',
    desc: 'Location is checked only during check-in/out requests.',
  },
];

export function LocationPermissionDialog({
  visible,
  officeLocation,
  onRequestPermission,
  onDismiss,
}: LocationPermissionDialogProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDismiss}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.iconCircle}>
            <MaterialIcons name="my-location" size={38} color={Colors.secondary} />
          </View>
          <Text style={styles.title}>Location Permission Required</Text>
          <Text style={styles.subtitle}>
            To record attendance at {officeLocation}, the app needs device location access to
            verify you are within the official office geofence site boundary.
          </Text>

          <View style={styles.rationaleBox}>
            {RATIONALE.map((item) => (
              <View key={item.title} style={styles.rationaleRow}>
                <View style={styles.rationaleIcon}>
                  <MaterialIcons name={item.icon} size={16} color={Colors.secondary} />
                </View>
                <View style={styles.rationaleText}>
                  <Text style={styles.rationaleTitle}>{item.title}</Text>
                  <Text style={styles.rationaleDesc}>{item.desc}</Text>
                </View>
              </View>
            ))}
          </View>

          <View style={styles.actions}>
            <Pressable style={styles.cancelButton} onPress={onDismiss}>
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
            <Pressable style={styles.grantButton} onPress={onRequestPermission}>
              <MaterialIcons name="my-location" size={18} color="#fff" />
              <Text style={styles.grantText}>Grant Access</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(10,22,40,0.55)',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: Colors.card,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 24,
    alignItems: 'center',
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 18,
    backgroundColor: Colors.inTransitLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    marginTop: 16,
    fontSize: 20,
    fontFamily: Fonts.bold,
    color: Colors.foreground,
    textAlign: 'center',
  },
  subtitle: {
    marginTop: 8,
    fontSize: 13,
    lineHeight: 18,
    fontFamily: Fonts.regular,
    color: Colors.mutedForeground,
    textAlign: 'center',
  },
  rationaleBox: {
    width: '100%',
    marginTop: 20,
    backgroundColor: Colors.inputBg,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 16,
    gap: 12,
  },
  rationaleRow: {
    flexDirection: 'row',
    gap: 10,
  },
  rationaleIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: Colors.muted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rationaleText: {
    flex: 1,
  },
  rationaleTitle: {
    fontSize: 13,
    fontFamily: Fonts.bold,
    color: Colors.foreground,
  },
  rationaleDesc: {
    fontSize: 11,
    lineHeight: 15,
    fontFamily: Fonts.regular,
    color: Colors.mutedForeground,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
    width: '100%',
  },
  cancelButton: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: {
    color: Colors.mutedForeground,
    fontFamily: Fonts.semibold,
  },
  grantButton: {
    flex: 1.3,
    height: 48,
    borderRadius: 14,
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  grantText: {
    color: '#fff',
    fontFamily: Fonts.bold,
  },
});
