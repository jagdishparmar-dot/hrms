import Constants from 'expo-constants';
import * as Updates from 'expo-updates';
import { Platform } from 'react-native';

export type AppVersionInfo = {
  appVersion: string;
  runtimeVersion: string;
  buildNumber: string;
  channel: string | null;
  updateId: string | null;
};

export function getAppVersionInfo(): AppVersionInfo {
  const appVersion = Constants.expoConfig?.version ?? '—';
  const runtimeVersion =
    typeof Updates.runtimeVersion === 'string'
      ? Updates.runtimeVersion
      : String(Constants.expoConfig?.runtimeVersion ?? '—');
  const buildNumber =
    Platform.OS === 'android'
      ? String(Constants.expoConfig?.android?.versionCode ?? '—')
      : String(Constants.expoConfig?.ios?.buildNumber ?? '—');

  return {
    appVersion,
    runtimeVersion,
    buildNumber,
    channel: Updates.channel ?? null,
    updateId: Updates.updateId ?? null,
  };
}

export function formatUpdateLabel(updateId: string | null) {
  if (__DEV__) return 'development';
  if (!updateId) return 'embedded';
  return updateId.slice(0, 8);
}
