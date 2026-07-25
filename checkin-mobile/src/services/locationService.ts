import * as Location from 'expo-location';

import type { LocationResult } from '@/src/types';

const EARTH_RADIUS_METERS = 6371000;

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

export async function checkLocationPermission(): Promise<boolean> {
  const { status } = await Location.getForegroundPermissionsAsync();
  return status === Location.PermissionStatus.GRANTED;
}

export async function requestLocationPermission(): Promise<boolean> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  return status === Location.PermissionStatus.GRANTED;
}

export async function getCurrentLocation(
  officeLatitude: number,
  officeLongitude: number,
  geofenceRadiusMeters = 500,
): Promise<LocationResult> {
  const position = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.High,
  });

  const distanceMeters = haversineDistanceMeters(
    position.coords.latitude,
    position.coords.longitude,
    officeLatitude,
    officeLongitude,
  );

  return {
    latitude: position.coords.latitude,
    longitude: position.coords.longitude,
    distanceMeters,
    isWithinGeofence: distanceMeters <= geofenceRadiusMeters,
    accuracy: position.coords.accuracy,
  };
}

export async function getCurrentLocationWithPermission(
  officeLatitude: number,
  officeLongitude: number,
  geofenceRadiusMeters = 500,
): Promise<LocationResult> {
  const granted = await checkLocationPermission();
  if (!granted) {
    throw new Error('Location permission not granted');
  }

  const servicesEnabled = await Location.hasServicesEnabledAsync();
  if (!servicesEnabled) {
    throw new Error('Location services are disabled');
  }

  return getCurrentLocation(officeLatitude, officeLongitude, geofenceRadiusMeters);
}
