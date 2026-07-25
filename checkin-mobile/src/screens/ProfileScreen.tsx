import { MaterialIcons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { type ReactNode, useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import Toast from 'react-native-toast-message';

import { AppwriteConfig } from '@/src/config/appwrite';
import { ScreenHeader } from '@/src/components/ScreenHeader';
import { useScreenInsets } from '@/src/components/ScreenSafeArea';
import { profileRepository } from '@/src/repositories/profileRepository';
import { authHeaders } from '@/src/services/apiClient';
import { Colors } from '@/src/theme/colors';
import { Fonts } from '@/src/theme/typography';
import type { EmployeeDocument, MainUiState, UserProfile } from '@/src/types';

interface ProfileScreenProps {
  uiState: MainUiState;
  refreshing?: boolean;
  onRefresh?: () => Promise<void>;
  onUpdateProfile: (patch: Record<string, string>) => Promise<void>;
  onOpenLocationSheet: () => void;
  onLogout?: () => void;
}

type EditSection = 'personal' | 'payroll' | null;

const PERSONAL_FIELDS: Array<{ key: keyof UserProfile; label: string; placeholder: string; keyboard?: 'default' | 'phone-pad' }> = [
  { key: 'phone', label: 'Mobile', placeholder: '10-digit mobile', keyboard: 'phone-pad' },
  { key: 'currentAddressLine1', label: 'Address line 1', placeholder: 'House / street' },
  { key: 'currentAddressLine2', label: 'Address line 2', placeholder: 'Area / landmark' },
  { key: 'currentCity', label: 'City', placeholder: 'City' },
  { key: 'currentState', label: 'State', placeholder: 'State' },
  { key: 'currentPincode', label: 'Pincode', placeholder: 'Pincode', keyboard: 'phone-pad' },
  { key: 'emergencyContactName', label: 'Emergency contact', placeholder: 'Name' },
  { key: 'emergencyContactPhone', label: 'Emergency phone', placeholder: 'Phone', keyboard: 'phone-pad' },
];

const PAYROLL_FIELDS: Array<{ key: keyof UserProfile; label: string; placeholder: string; keyboard?: 'default' | 'phone-pad' }> = [
  { key: 'panNumber', label: 'PAN', placeholder: 'ABCDE1234F' },
  { key: 'aadhaarNumber', label: 'Aadhaar', placeholder: '12 digits', keyboard: 'phone-pad' },
  { key: 'uanNumber', label: 'UAN (EPFO)', placeholder: 'UAN' },
  { key: 'esiNumber', label: 'ESI number', placeholder: 'ESI' },
  { key: 'pfAccountNumber', label: 'PF account', placeholder: 'PF account' },
  { key: 'bankName', label: 'Bank name', placeholder: 'Bank name' },
  { key: 'bankIfsc', label: 'IFSC', placeholder: 'IFSC' },
  { key: 'bankAccountNumber', label: 'Account number', placeholder: 'Account number', keyboard: 'phone-pad' },
];

const DOC_CATEGORY_LABELS: Record<EmployeeDocument['category'], string> = {
  profile_picture: 'Profile picture',
  identity: 'Identity',
  compliance: 'Compliance',
  employment: 'Employment',
};

function maskId(value: string, visible = 4) {
  const clean = value.replace(/\s/g, '');
  if (!clean) return '—';
  if (clean.length <= visible) return clean;
  return `${'•'.repeat(Math.min(clean.length - visible, 8))}${clean.slice(-visible)}`;
}

function maskAccount(value: string) {
  const clean = value.replace(/\s/g, '');
  if (!clean) return '—';
  if (clean.length <= 4) return clean;
  return `XXXX XXXX ${clean.slice(-4)}`;
}

function displayOrDash(value: string) {
  return value?.trim() ? value : '—';
}

function buildDraft(profile: UserProfile, keys: Array<keyof UserProfile>) {
  return Object.fromEntries(keys.map((key) => [key, String(profile[key] || '')])) as Record<string, string>;
}

export function ProfileScreen({
  uiState,
  refreshing = false,
  onRefresh,
  onUpdateProfile,
  onOpenLocationSheet,
  onLogout,
}: ProfileScreenProps) {
  const { contentPaddingBottom } = useScreenInsets();
  const profile = uiState.userProfile;
  const [editSection, setEditSection] = useState<EditSection>(null);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [uploading, setUploading] = useState(false);
  const [pictureHeaders, setPictureHeaders] = useState<Record<string, string> | undefined>();

  useEffect(() => {
    let active = true;
    authHeaders(profile.companyId).then((headers) => {
      if (active) setPictureHeaders(headers);
    });
    return () => {
      active = false;
    };
  }, [profile.companyId]);

  const addressLine = [
    profile.currentAddressLine1,
    profile.currentAddressLine2,
    [profile.currentCity, profile.currentState, profile.currentPincode].filter(Boolean).join(' '),
  ]
    .filter(Boolean)
    .join(', ');

  const startEdit = (section: EditSection) => {
    if (!section) return;
    const keys =
      section === 'personal'
        ? PERSONAL_FIELDS.map((f) => f.key)
        : PAYROLL_FIELDS.map((f) => f.key);
    setDraft(buildDraft(profile, keys));
    setEditSection(section);
  };

  const saveEdit = async () => {
    try {
      await onUpdateProfile(draft);
      setEditSection(null);
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: error instanceof Error ? error.message : 'Unable to save profile',
      });
    }
  };

  const geofence = useCallback(
    () => ({
      officeLocation: profile.officeLocation,
      officeLatitude: profile.officeLatitude,
      officeLongitude: profile.officeLongitude,
      geofenceRadiusMeters: profile.geofenceRadiusMeters,
      lastKnownDistanceMeters: profile.lastKnownDistanceMeters,
      isWithinGeofence: profile.isWithinGeofence,
    }),
    [profile],
  );

  const uploadDocument = async (params: {
    category: EmployeeDocument['category'];
    title: string;
    uri: string;
    fileName: string;
    mimeType: string;
  }) => {
    setUploading(true);
    try {
      await profileRepository.uploadDocument({
        companyId: profile.companyId ?? null,
        ...params,
        geofence: geofence(),
      });
      await onRefresh?.();
      Toast.show({ type: 'success', text1: 'Document uploaded' });
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: error instanceof Error ? error.message : 'Upload failed',
      });
    } finally {
      setUploading(false);
    }
  };

  const pickProfilePicture = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Toast.show({ type: 'error', text1: 'Photo library permission required' });
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.85,
    });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    await uploadDocument({
      category: 'profile_picture',
      title: 'Profile picture',
      uri: asset.uri,
      fileName: asset.fileName || 'profile.jpg',
      mimeType: asset.mimeType || 'image/jpeg',
    });
  };

  const pickDocument = async (category: EmployeeDocument['category']) => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['image/*', 'application/pdf'],
      copyToCacheDirectory: true,
    });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    await uploadDocument({
      category,
      title: asset.name,
      uri: asset.uri,
      fileName: asset.name,
      mimeType: asset.mimeType || 'application/pdf',
    });
  };

  const pictureUri = profile.profilePictureUrl
    ? `${AppwriteConfig.apiBaseUrl}/api/v1/me/profile/picture/file`
    : null;

  return (
    <View style={styles.root}>
      <ScreenHeader title="Profile" subtitle="Contact · payroll · documents" />
      <ScrollView
        style={styles.container}
        contentContainerStyle={[styles.content, { paddingBottom: contentPaddingBottom }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          onRefresh ? (
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.secondary} />
          ) : undefined
        }>
        <View style={styles.hero}>
          <Pressable style={styles.avatarWrap} onPress={pickProfilePicture} disabled={uploading}>
            {pictureUri && pictureHeaders ? (
              <Image source={{ uri: pictureUri, headers: pictureHeaders }} style={styles.avatarImage} />
            ) : (
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{profile.name.charAt(0).toUpperCase() || 'E'}</Text>
              </View>
            )}
            <View style={styles.avatarBadge}>
              {uploading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <MaterialIcons name="photo-camera" size={14} color="#fff" />
              )}
            </View>
          </Pressable>
          <Text style={styles.name}>{profile.name}</Text>
          <Text style={styles.role}>
            {profile.role}
            {profile.grade ? ` · ${profile.grade}` : ''}
          </Text>
        </View>

        <Section title="Employment (read-only)">
          <ProfileDetailRow icon="badge" label="Employee ID" value={displayOrDash(profile.employeeId)} />
          <ProfileDetailRow icon="work" label="Department" value={displayOrDash(profile.department)} />
          <ProfileDetailRow icon="supervisor-account" label="Reporting manager" value={displayOrDash(profile.reportingManager)} />
          <ProfileDetailRow icon="event" label="Date of joining" value={displayOrDash(profile.dateOfJoining)} />
          <ProfileDetailRow icon="business" label="Work shift" value={`${profile.workShiftStart} – ${profile.workShiftEnd}`} />
          <ProfileDetailRow icon="location-on" label="Office" value={displayOrDash(profile.officeLocation)} />
          <ProfileDetailRow icon="mail-outline" label="Work email" value={displayOrDash(profile.workEmail)} />
          <ProfileDetailRow icon="wc" label="Gender / DOB" value={`${displayOrDash(profile.gender)} · ${displayOrDash(profile.dateOfBirth)}`} />
          <ProfileDetailRow icon="favorite" label="Blood group" value={displayOrDash(profile.bloodGroup)} />
        </Section>

        <Section title="Contact & address">
          {editSection === 'personal' ? (
            <>
              {PERSONAL_FIELDS.map((field) => (
                <View key={field.key} style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>{field.label}</Text>
                  <TextInput
                    style={styles.input}
                    value={draft[field.key] || ''}
                    onChangeText={(text) => setDraft((prev) => ({ ...prev, [field.key]: text }))}
                    placeholder={field.placeholder}
                    placeholderTextColor={Colors.placeholder}
                    keyboardType={field.keyboard || 'default'}
                    autoCapitalize="sentences"
                  />
                </View>
              ))}
              <EditActions onCancel={() => setEditSection(null)} onSave={saveEdit} />
            </>
          ) : (
            <>
              <ProfileDetailRow icon="call" label="Mobile" value={displayOrDash(profile.phone)} />
              <ProfileDetailRow icon="home" label="Current address" value={displayOrDash(addressLine)} />
              <ProfileDetailRow
                icon="contact-phone"
                label="Emergency contact"
                value={
                  profile.emergencyContactName
                    ? `${profile.emergencyContactName} · ${displayOrDash(profile.emergencyContactPhone)}`
                    : '—'
                }
              />
              <Pressable style={styles.editButton} onPress={() => startEdit('personal')}>
                <MaterialIcons name="edit" size={18} color="#fff" />
                <Text style={styles.editButtonText}>Edit contact & address</Text>
              </Pressable>
            </>
          )}
        </Section>

        <Section title="Payroll & compliance">
          {editSection === 'payroll' ? (
            <>
              {PAYROLL_FIELDS.map((field) => (
                <View key={field.key} style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>{field.label}</Text>
                  <TextInput
                    style={styles.input}
                    value={draft[field.key] || ''}
                    onChangeText={(text) => setDraft((prev) => ({ ...prev, [field.key]: text }))}
                    placeholder={field.placeholder}
                    placeholderTextColor={Colors.placeholder}
                    keyboardType={field.keyboard || 'default'}
                    autoCapitalize={field.key === 'panNumber' || field.key === 'bankIfsc' ? 'characters' : 'sentences'}
                  />
                </View>
              ))}
              <EditActions onCancel={() => setEditSection(null)} onSave={saveEdit} />
            </>
          ) : (
            <>
              <ProfileDetailRow icon="credit-card" label="PAN" value={maskId(profile.panNumber)} />
              <ProfileDetailRow icon="fingerprint" label="Aadhaar" value={maskId(profile.aadhaarNumber.replace(/\D/g, '') || profile.aadhaarNumber)} />
              <ProfileDetailRow icon="tag" label="UAN (EPFO)" value={displayOrDash(profile.uanNumber)} />
              <ProfileDetailRow icon="health-and-safety" label="ESI" value={displayOrDash(profile.esiNumber)} />
              <ProfileDetailRow icon="account-balance" label="PF account" value={displayOrDash(profile.pfAccountNumber)} />
              <ProfileDetailRow icon="account-balance-wallet" label="Bank" value={profile.bankName ? `${profile.bankName} · ${displayOrDash(profile.bankIfsc)}` : '—'} />
              <ProfileDetailRow icon="payments" label="Account" value={maskAccount(profile.bankAccountNumber)} />
              <Pressable style={styles.editButton} onPress={() => startEdit('payroll')}>
                <MaterialIcons name="edit" size={18} color="#fff" />
                <Text style={styles.editButtonText}>Edit payroll & compliance</Text>
              </Pressable>
            </>
          )}
        </Section>

        <Section title="Documents" subtitle="Upload identity, compliance, and employment files">
          <View style={styles.docActions}>
            <DocUploadButton label="Identity" onPress={() => pickDocument('identity')} disabled={uploading} />
            <DocUploadButton label="Compliance" onPress={() => pickDocument('compliance')} disabled={uploading} />
            <DocUploadButton label="Employment" onPress={() => pickDocument('employment')} disabled={uploading} />
          </View>
          {(profile.documents || []).map((doc) => (
            <View key={doc.id} style={styles.docRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.docTitle}>{doc.title}</Text>
                <Text style={styles.docMeta}>
                  {DOC_CATEGORY_LABELS[doc.category]} · {doc.fileName}
                </Text>
              </View>
            </View>
          ))}
          {(profile.documents || []).length === 0 ? (
            <Text style={styles.emptyDocs}>No documents uploaded yet.</Text>
          ) : null}
        </Section>

        <Section title="Preferences" subtitle="Notification toggles — wiring comes later.">
          <View style={styles.settingRow}>
            <Text style={styles.settingTitle}>Leave & holiday updates</Text>
            <Switch value trackColor={{ false: Colors.muted, true: 'rgba(46,107,230,0.45)' }} disabled />
          </View>
        </Section>

        <View style={styles.locationCard}>
          <View style={{ flex: 1 }}>
            <Text style={styles.locationTitle}>Office range verification</Text>
            <Text style={styles.locationSubtitle}>
              GPS: {profile.lastKnownDistanceMeters <= 1 ? '1 meter away' : `${profile.lastKnownDistanceMeters}m away`} ·{' '}
              {profile.isWithinGeofence ? 'Within geofence' : 'Outside geofence'}
            </Text>
          </View>
          <Pressable style={styles.changeButton} onPress={onOpenLocationSheet}>
            <Text style={styles.changeButtonText}>Status</Text>
          </Pressable>
        </View>

        {onLogout ? (
          <Pressable style={styles.logoutButton} onPress={onLogout}>
            <MaterialIcons name="logout" size={18} color={Colors.destructive} />
            <Text style={styles.logoutText}>Sign Out</Text>
          </Pressable>
        ) : null}
      </ScrollView>
    </View>
  );
}

function EditActions({ onCancel, onSave }: { onCancel: () => void; onSave: () => void }) {
  return (
    <View style={styles.editActions}>
      <Pressable style={styles.cancelButton} onPress={onCancel}>
        <Text style={styles.cancelText}>Cancel</Text>
      </Pressable>
      <Pressable style={styles.saveButton} onPress={onSave}>
        <Text style={styles.saveText}>Save</Text>
      </Pressable>
    </View>
  );
}

function DocUploadButton({
  label,
  onPress,
  disabled,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable style={[styles.docUploadBtn, disabled && { opacity: 0.6 }]} onPress={onPress} disabled={disabled}>
      <MaterialIcons name="upload-file" size={16} color={Colors.secondary} />
      <Text style={styles.docUploadText}>{label}</Text>
    </Pressable>
  );
}

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {subtitle ? <Text style={styles.sectionSubtitle}>{subtitle}</Text> : null}
      <View style={styles.card}>{children}</View>
    </View>
  );
}

function ProfileDetailRow({
  icon,
  label,
  value,
}: {
  icon: keyof typeof MaterialIcons.glyphMap;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.detailRow}>
      <View style={styles.detailIcon}>
        <MaterialIcons name={icon} size={18} color={Colors.secondary} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={styles.detailLabel}>{label}</Text>
        <Text style={styles.detailValue} numberOfLines={3}>
          {value}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  container: { flex: 1 },
  content: { paddingHorizontal: 16, paddingTop: 16 },
  hero: { alignItems: 'center', marginBottom: 8 },
  avatarWrap: { position: 'relative' },
  avatar: {
    width: 84,
    height: 84,
    borderRadius: 22,
    backgroundColor: Colors.muted,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImage: { width: 84, height: 84, borderRadius: 22, borderWidth: 1, borderColor: Colors.border },
  avatarText: { fontSize: 32, fontFamily: Fonts.bold, color: Colors.primary },
  avatarBadge: {
    position: 'absolute',
    right: -4,
    bottom: -4,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.card,
  },
  name: { marginTop: 12, fontSize: 22, fontFamily: Fonts.bold, color: Colors.foreground },
  role: { marginTop: 4, fontSize: 14, fontFamily: Fonts.regular, color: Colors.mutedForeground },
  section: { marginTop: 16, width: '100%' },
  sectionTitle: { fontSize: 15, fontFamily: Fonts.bold, color: Colors.foreground, marginBottom: 4 },
  sectionSubtitle: { fontSize: 12, fontFamily: Fonts.regular, color: Colors.mutedForeground, marginBottom: 8 },
  card: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 16,
    gap: 14,
  },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  detailIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.muted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailLabel: { fontSize: 11, fontFamily: Fonts.medium, color: Colors.mutedForeground },
  detailValue: { marginTop: 2, fontSize: 14, fontFamily: Fonts.semibold, color: Colors.foreground },
  fieldGroup: { gap: 6 },
  fieldLabel: { fontSize: 12, fontFamily: Fonts.semibold, color: Colors.label },
  input: {
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 11,
    color: Colors.foreground,
    backgroundColor: Colors.inputBg,
    fontFamily: Fonts.medium,
    fontSize: 14,
  },
  editButton: {
    marginTop: 2,
    height: 46,
    borderRadius: 14,
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  editButtonText: { color: '#fff', fontFamily: Fonts.bold },
  editActions: { flexDirection: 'row', gap: 12, marginTop: 4 },
  cancelButton: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.card,
  },
  cancelText: { color: Colors.mutedForeground, fontFamily: Fonts.semibold },
  saveButton: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveText: { color: '#fff', fontFamily: Fonts.bold },
  docActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  docUploadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: Colors.inputBg,
  },
  docUploadText: { fontSize: 12, fontFamily: Fonts.semibold, color: Colors.secondary },
  docRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  docTitle: { fontSize: 14, fontFamily: Fonts.semibold, color: Colors.foreground },
  docMeta: { marginTop: 2, fontSize: 11, fontFamily: Fonts.regular, color: Colors.mutedForeground },
  docLink: { fontSize: 12, fontFamily: Fonts.bold, color: Colors.secondary },
  emptyDocs: { fontSize: 12, fontFamily: Fonts.regular, color: Colors.mutedForeground },
  settingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  settingTitle: { fontSize: 14, fontFamily: Fonts.semibold, color: Colors.foreground },
  locationCard: {
    marginTop: 16,
    backgroundColor: Colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  locationTitle: { fontSize: 15, fontFamily: Fonts.bold, color: Colors.foreground },
  locationSubtitle: { marginTop: 4, fontSize: 12, fontFamily: Fonts.regular, color: Colors.mutedForeground },
  changeButton: {
    borderWidth: 1,
    borderColor: Colors.secondary,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: Colors.inTransitLight,
  },
  changeButtonText: { color: Colors.secondary, fontSize: 12, fontFamily: Fonts.bold },
  logoutButton: {
    marginTop: 18,
    marginBottom: 8,
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.destructiveLight,
    backgroundColor: Colors.destructiveLight,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  logoutText: { color: Colors.destructive, fontFamily: Fonts.bold, fontSize: 14 },
});
