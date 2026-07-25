/** Coldverse-inspired design tokens (navy enterprise field app). */
export const Colors = {
  background: '#F0F4F9',
  foreground: '#0A1628',
  card: '#FFFFFF',
  cardForeground: '#0A1628',

  primary: '#1A3A6B',
  primaryForeground: '#FFFFFF',
  secondary: '#2E6BE6',
  secondaryForeground: '#FFFFFF',

  muted: '#E8EDF5',
  mutedForeground: '#6B7A8D',

  accent: '#F5A623',
  accentForeground: '#0A1628',

  success: '#16A34A',
  successLight: '#DCFCE7',
  warning: '#F5A623',
  warningLight: '#FEF3C7',
  destructive: '#DC2626',
  destructiveLight: '#FEE2E2',
  inTransitLight: '#DBEAFE',

  border: '#DDE3ED',
  input: '#DDE3ED',
  inputBg: '#F7F9FC',
  inputFocusBg: '#F5F8FF',
  placeholder: '#B4C2D2',
  headerSubtitle: '#8BAFC7',
  label: '#3D5A73',

  splash: '#0A2540',
  authGradient: ['#0B1F3A', '#12305A', '#0A2540'] as const,

  clockInStart: '#F5A623',
  clockInEnd: '#E09012',
  clockOutStart: '#16A34A',
  clockOutEnd: '#15803D',
  clockDoneStart: '#DC2626',
  clockDoneEnd: '#B91C1C',

  statusPresent: '#16A34A',
  statusLate: '#F5A623',
  statusHalfDay: '#D97706',
  statusAbsent: '#DC2626',
  statusOnLeave: '#7C3AED',
  statusLeavePending: '#6366F1',

  radius: 12,

  // Compatibility aliases used across existing screens
  surfaceLight: '#F0F4F9',
  textPrimary: '#0A1628',
  textSecondary: '#6B7A8D',
  textMuted: '#B4C2D2',
  cardBackground: '#FFFFFF',
  amberPrimary: '#F5A623',
  amberDark: '#1A3A6B',
  amberLight: '#FEF3C7',
  amberBorder: '#DDE3ED',
  divider: '#DDE3ED',
  tabInactive: '#6B7A8D',
  tabSelectedBg: '#E8EDF5',
  clockInOrangeStart: '#F5A623',
  clockInOrangeEnd: '#E09012',
  clockOutGreenStart: '#16A34A',
  clockOutGreenEnd: '#15803D',
  clockOutRedStart: '#DC2626',
  clockOutRedEnd: '#B91C1C',
} as const;

export const GEOFENCE_RADIUS_METERS = 500;
