import { haversineDistanceMeters } from '@/src/services/locationService';
import { formatDuration, mergeTimeOntoDate, parseTimeOnDate } from '@/src/utils/dateTime';

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

  it('merges picked time onto shift date without drift', () => {
    const shiftDate = new Date(2026, 6, 15, 12, 0, 0, 0);
    const picked = new Date(2026, 6, 26, 10, 30, 0, 0);
    const merged = mergeTimeOntoDate(shiftDate, picked);
    expect(merged.getFullYear()).toBe(2026);
    expect(merged.getMonth()).toBe(6);
    expect(merged.getDate()).toBe(15);
    expect(merged.getHours()).toBe(10);
    expect(merged.getMinutes()).toBe(30);
  });

  it('parses HH:mm onto a base date', () => {
    const base = new Date(2026, 0, 10, 12, 0, 0, 0);
    const parsed = parseTimeOnDate('18:45', base);
    expect(parsed?.getDate()).toBe(10);
    expect(parsed?.getHours()).toBe(18);
    expect(parsed?.getMinutes()).toBe(45);
  });
});
