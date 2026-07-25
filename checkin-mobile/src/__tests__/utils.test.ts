import { haversineDistanceMeters } from '@/src/services/locationService';
import { formatDuration } from '@/src/utils/dateTime';

describe('locationService', () => {
  it('computes haversine distance between two coordinates', () => {
    const officeLat = 19.077;
    const officeLon = 72.998;
    const nearbyLat = 19.0775;
    const nearbyLon = 72.9985;

    const distance = haversineDistanceMeters(officeLat, officeLon, nearbyLat, nearbyLon);
    expect(distance).toBeGreaterThan(50);
    expect(distance).toBeLessThan(200);
  });

  it('returns zero distance for identical coordinates', () => {
    expect(haversineDistanceMeters(19.077, 72.998, 19.077, 72.998)).toBe(0);
  });
});

describe('dateTime utils', () => {
  it('formats clock-out duration as HH:mm', () => {
    expect(formatDuration(542)).toBe('09:02');
    expect(formatDuration(0)).toBe('00:00');
  });
});
