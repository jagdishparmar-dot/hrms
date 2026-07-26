import * as Updates from 'expo-updates';
import { useEffect, useState } from 'react';

type OtaUpdateState = {
  isChecking: boolean;
  isDownloading: boolean;
  error: string | null;
};

/**
 * Checks EAS Update on launch for release builds and reloads when a new bundle is ready.
 * Skipped in dev / Expo Go where expo-updates is unavailable.
 */
export function useOtaUpdates() {
  const [state, setState] = useState<OtaUpdateState>({
    isChecking: false,
    isDownloading: false,
    error: null,
  });

  useEffect(() => {
    if (__DEV__ || !Updates.isEnabled) {
      return;
    }

    let cancelled = false;

    async function run() {
      setState((prev) => ({ ...prev, isChecking: true, error: null }));
      try {
        const result = await Updates.checkForUpdateAsync();
        if (cancelled || !result.isAvailable) {
          return;
        }

        setState((prev) => ({ ...prev, isDownloading: true }));
        await Updates.fetchUpdateAsync();
        if (cancelled) {
          return;
        }

        await Updates.reloadAsync();
      } catch (error) {
        if (!cancelled) {
          const message =
            error instanceof Error ? error.message : 'Unable to check for updates';
          setState((prev) => ({ ...prev, error: message }));
        }
      } finally {
        if (!cancelled) {
          setState((prev) => ({ ...prev, isChecking: false, isDownloading: false }));
        }
      }
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
