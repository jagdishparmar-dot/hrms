import * as Location from 'expo-location';

import type { LocationResult } from '@/src/types';

const EARTH_RADIUS_METERS = 6371000;

/** Reuse a recent fix during punch instead of waiting for a new GPS lock. */
export const PUNCH_LOCATION_MAX_AGE_MS = 60_000;

export type CachedPunchLocation = LocationResult & {
  updatedAt: number;
};

export function haversineDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(EARTH_RADIUS_METERS * c);
}

function toLocationResult(
  latitude: number,
  longitude: number,
  accuracy: number | null,
  officeLatitude: number,
  officeLongitude: number,
  geofenceRadiusMeters: number,
): LocationResult {
  const distanceMeters = haversineDistanceMeters(
    latitude,
    longitude,
    officeLatitude,
    officeLongitude,
  );

  return {
    latitude,
    longitude,
    distanceMeters,
    isWithinGeofence: distanceMeters <= geofenceRadiusMeters,
    accuracy,
  };
}

export async function checkLocationPermission(): Promise<boolean> {
  const { status } = await Location.getForegroundPermissionsAsync();
  return status === Location.PermissionStatus.GRANTED;
}

export async function requestLocationPermission(): Promise<boolean> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  return status === Location.PermissionStatus.GRANTED;
}

async function assertLocationReady() {
  const granted = await checkLocationPermission();
  if (!granted) {
    throw new Error('Location permission not granted');
  }

  const servicesEnabled = await Location.hasServicesEnabledAsync();
  if (!servicesEnabled) {
    throw new Error('Location services are disabled');
  }
}

/** Prefetch OS location cache so punch can reuse a recent fix. */
export async function warmLocationCache(): Promise<void> {
  try {
    if (!(await checkLocationPermission())) return;
    await Location.getLastKnownPositionAsync({ maxAge: PUNCH_LOCATION_MAX_AGE_MS * 2 });
    void Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    }).catch(() => undefined);
  } catch {
    // Best-effort warm-up only.
  }
}

export async function getCurrentLocation(
  officeLatitude: number,
  officeLongitude: number,
  geofenceRadiusMeters = 500,
): Promise<LocationResult> {
  await assertLocationReady();

  const position = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.Balanced,
  });

  return toLocationResult(
    position.coords.latitude,
    position.coords.longitude,
    position.coords.accuracy,
    officeLatitude,
    officeLongitude,
    geofenceRadiusMeters,
  );
}

export async function getCurrentCoordinates(): Promise<{
  latitude: number;
  longitude: number;
  accuracy: number | null;
}> {
  await assertLocationReady();

  const position = await readPunchPosition(null, false);
  return {
    latitude: position.coords.latitude,
    longitude: position.coords.longitude,
    accuracy: position.coords.accuracy,
  };
}

export async function getCurrentLocationWithPermission(
  officeLatitude: number,
  officeLongitude: number,
  geofenceRadiusMeters = 500,
): Promise<LocationResult> {
  return getCurrentLocation(officeLatitude, officeLongitude, geofenceRadiusMeters);
}

async function readPunchPosition(
  cached: CachedPunchLocation | null | undefined,
  requireGeofence: boolean,
  officeLatitude?: number,
  officeLongitude?: number,
  geofenceRadiusMeters?: number,
) {
  const now = Date.now();

  if (
    cached &&
    now - cached.updatedAt <= PUNCH_LOCATION_MAX_AGE_MS &&
    (!requireGeofence || cached.isWithinGeofence)
  ) {
    return {
      coords: {
        latitude: cached.latitude,
        longitude: cached.longitude,
        accuracy: cached.accuracy,
      },
      fromCache: true as const,
    };
  }

  try {
    const lastKnown = await Location.getLastKnownPositionAsync({
      maxAge: PUNCH_LOCATION_MAX_AGE_MS,
    });
    if (
      lastKnown &&
      officeLatitude != null &&
      officeLongitude != null &&
      geofenceRadiusMeters != null
    ) {
      const candidate = toLocationResult(
        lastKnown.coords.latitude,
        lastKnown.coords.longitude,
        lastKnown.coords.accuracy,
        officeLatitude,
        officeLongitude,
        geofenceRadiusMeters,
      );
      if (!requireGeofence || candidate.isWithinGeofence) {
        return {
          coords: {
            latitude: candidate.latitude,
            longitude: candidate.longitude,
            accuracy: candidate.accuracy,
          },
          fromCache: true as const,
        };
      }
    } else if (lastKnown && !requireGeofence) {
      return {
        coords: {
          latitude: lastKnown.coords.latitude,
          longitude: lastKnown.coords.longitude,
          accuracy: lastKnown.coords.accuracy,
        },
        fromCache: true as const,
      };
    }
  } catch {
    // Fall through to a fresh GPS read.
  }

  const position = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.Balanced,
  });
  return { coords: position.coords, fromCache: false as const };
}

/**
 * Fast path for punch: reuse in-app or OS cache when fresh, otherwise Balanced GPS.
 */
export async function getPunchLocation(
  officeLatitude: number,
  officeLongitude: number,
  geofenceRadiusMeters: number,
  options?: {
    requireGeofence?: boolean;
    cached?: CachedPunchLocation | null;
  },
): Promise<LocationResult> {
  await assertLocationReady();

  const requireGeofence = options?.requireGeofence ?? true;
  const position = await readPunchPosition(
    options?.cached,
    requireGeofence,
    officeLatitude,
    officeLongitude,
    geofenceRadiusMeters,
  );

  return toLocationResult(
    position.coords.latitude,
    position.coords.longitude,
    position.coords.accuracy,
    officeLatitude,
    officeLongitude,
    geofenceRadiusMeters,
  );
}
