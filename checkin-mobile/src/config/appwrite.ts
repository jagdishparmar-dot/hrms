/**
 * Appwrite project configuration.
 * Values come from Expo public env (see `.env`).
 */
export const AppwriteConfig = {
  endpoint: process.env.EXPO_PUBLIC_APPWRITE_ENDPOINT ?? 'https://appwrite.intoship.cloud/v1',
  projectId: process.env.EXPO_PUBLIC_APPWRITE_PROJECT_ID ?? '6a620077001e71c1acde',
  projectName: process.env.EXPO_PUBLIC_APPWRITE_PROJECT_NAME ?? 'Attendance',
  databaseId: process.env.EXPO_PUBLIC_APPWRITE_DATABASE_ID ?? 'hr_portal',
  employeesCollectionId:
    process.env.EXPO_PUBLIC_APPWRITE_EMPLOYEES_COLLECTION_ID ?? 'employees',
  attendanceCollectionId:
    process.env.EXPO_PUBLIC_APPWRITE_ATTENDANCE_COLLECTION_ID ?? 'attendance_records',
  sitesCollectionId: process.env.EXPO_PUBLIC_APPWRITE_SITES_COLLECTION_ID ?? 'sites',
  leaveTypesCollectionId:
    process.env.EXPO_PUBLIC_APPWRITE_LEAVE_TYPES_COLLECTION_ID ?? 'leave_types',
  leaveBalancesCollectionId:
    process.env.EXPO_PUBLIC_APPWRITE_LEAVE_BALANCES_COLLECTION_ID ?? 'leave_balances',
  leaveRequestsCollectionId:
    process.env.EXPO_PUBLIC_APPWRITE_LEAVE_REQUESTS_COLLECTION_ID ?? 'leave_requests',
  holidaysCollectionId:
    process.env.EXPO_PUBLIC_APPWRITE_HOLIDAYS_COLLECTION_ID ?? 'holidays',
  regularizationsCollectionId:
    process.env.EXPO_PUBLIC_APPWRITE_REGULARIZATIONS_COLLECTION_ID ??
    'attendance_regularizations',
  /** Next.js HR portal base URL for punch API */
  apiBaseUrl:
    process.env.EXPO_PUBLIC_HR_API_BASE_URL ?? 'https://hrms.intoship.cloud',
  platform: process.env.EXPO_PUBLIC_APPWRITE_PLATFORM ?? 'com.ayersh009.checkinmobile',
} as const;

export function assertAppwriteCollectionsConfigured(): void {
  if (!AppwriteConfig.databaseId || !AppwriteConfig.employeesCollectionId) {
    throw new Error(
      'Appwrite database/collection IDs are missing. Set EXPO_PUBLIC_APPWRITE_DATABASE_ID and EXPO_PUBLIC_APPWRITE_EMPLOYEES_COLLECTION_ID in .env',
    );
  }
}
