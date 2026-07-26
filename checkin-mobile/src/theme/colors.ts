/** Indigo enterprise field-app design tokens. */
export const Colors = {
  background: '#EEF2FF',
  foreground: '#1E1B4B',
  card: '#FFFFFF',
  cardForeground: '#1E1B4B',

  primary: '#3730A3',
  primaryDeep: '#312E81',
  primaryForeground: '#FFFFFF',
  secondary: '#6366F1',
  secondaryForeground: '#FFFFFF',
  secondaryLight: 'rgba(99, 102, 241, 0.14)',
  secondaryMuted: 'rgba(99, 102, 241, 0.45)',
  ripple: 'rgba(99, 102, 241, 0.1)',

  muted: '#E0E7FF',
  mutedForeground: '#64748B',
  iconMuted: '#A5B4FC',

  accent: '#F5A623',
  accentForeground: '#1E1B4B',

  success: '#16A34A',
  successLight: '#DCFCE7',
  warning: '#F5A623',
  warningLight: '#FEF3C7',
  destructive: '#DC2626',
  destructiveLight: '#FEE2E2',
  inTransitLight: '#E0E7FF',

  border: '#C7D2FE',
  input: '#C7D2FE',
  inputBg: '#F5F7FF',
  inputFocusBg: '#EEF2FF',
  placeholder: '#94A3B8',
  headerSubtitle: '#C7D2FE',
  roleLine: 'rgba(199, 210, 254, 0.92)',
  label: '#4338CA',

  splash: '#312E81',
  authGradient: ['#1E1B4B', '#312E81', '#4338CA'] as const,

  clockInStart: '#4F46E5',
  clockInEnd: '#6366F1',
  pulse: '#818CF8',
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
  surfaceLight: '#EEF2FF',
  textPrimary: '#1E1B4B',
  textSecondary: '#64748B',
  textMuted: '#94A3B8',
  cardBackground: '#FFFFFF',
  amberPrimary: '#F5A623',
  amberDark: '#3730A3',
  amberLight: '#FEF3C7',
  amberBorder: '#C7D2FE',
  divider: '#C7D2FE',
  tabInactive: '#64748B',
  tabSelectedBg: '#E0E7FF',
  clockInOrangeStart: '#4F46E5',
  clockInOrangeEnd: '#6366F1',
  clockOutGreenStart: '#16A34A',
  clockOutGreenEnd: '#15803D',
  clockOutRedStart: '#DC2626',
  clockOutRedEnd: '#B91C1C',
} as const;

export const GEOFENCE_RADIUS_METERS = 500;
