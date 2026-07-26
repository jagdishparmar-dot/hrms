import type { GeofenceStatus, Site } from '@/lib/appwrite/types';

export type LiveCheckIn = {
  attendanceId: string;
  employeeId: string;
  employeeName: string;
  employeeCode: string;
  siteId: string;
  siteName: string;
  clockInTime: string;
  clockInTimestamp: number;
  geofenceStatus: GeofenceStatus;
  punchInLat: number | null;
  punchInLong: number | null;
  locationName: string;
  status: string;
};

export type SitesLiveSnapshot = {
  checkedIn: LiveCheckIn[];
  bySiteId: Record<string, number>;
  fieldCount: number;
  totalCheckedIn: number;
  fetchedAt: string;
};

export type MapPoint = {
  id: string;
  lat: number;
  long: number;
  kind: 'site' | 'employee';
  label: string;
  siteId?: string;
  radiusMeters?: number;
  active?: boolean;
  geofenceStatus?: GeofenceStatus;
  clockInTime?: string;
};

export type ProjectedPoint = MapPoint & {
  x: number;
  y: number;
  r: number;
};

const METERS_PER_DEG_LAT = 111_320;

export function buildMapPoints(
  sites: Site[],
  checkedIn: LiveCheckIn[],
  selectedSiteId: string | null,
): MapPoint[] {
  const points: MapPoint[] = sites
    .filter((site) => site.status === 'active')
    .map((site) => ({
      id: site.id,
      lat: site.lat,
      long: site.long,
      kind: 'site' as const,
      label: site.name,
      siteId: site.id,
      radiusMeters: site.radiusMeters,
      active: selectedSiteId ? site.id === selectedSiteId : true,
    }));

  for (const row of checkedIn) {
    const lat = row.punchInLat;
    const lng = row.punchInLong;
    if (lat == null || lng == null || !Number.isFinite(lat) || !Number.isFinite(lng)) {
      continue;
    }
    points.push({
      id: row.attendanceId,
      lat,
      long: lng,
      kind: 'employee',
      label: row.employeeName,
      siteId: row.siteId,
      geofenceStatus: row.geofenceStatus,
      clockInTime: row.clockInTime,
    });
  }

  return points;
}

export function projectMapPoints(
  points: MapPoint[],
  width: number,
  height: number,
  padding = 36,
): ProjectedPoint[] {
  if (points.length === 0) return [];

  const lats = points.map((p) => p.lat);
  const lngs = points.map((p) => p.long);
  let minLat = Math.min(...lats);
  let maxLat = Math.max(...lats);
  let minLng = Math.min(...lngs);
  let maxLng = Math.max(...lngs);

  const latSpan = Math.max(maxLat - minLat, 0.004);
  const lngSpan = Math.max(maxLng - minLng, 0.004);
  const latPad = latSpan * 0.22;
  const lngPad = lngSpan * 0.22;

  minLat -= latPad;
  maxLat += latPad;
  minLng -= lngPad;
  maxLng += lngPad;

  const innerW = width - padding * 2;
  const innerH = height - padding * 2;
  const latRange = maxLat - minLat || 1;
  const lngRange = maxLng - minLng || 1;

  return points.map((point) => {
    const x = padding + ((point.long - minLng) / lngRange) * innerW;
    const y = padding + ((maxLat - point.lat) / latRange) * innerH;
    let r = 8;
    if (point.kind === 'site' && point.radiusMeters) {
      const metersSpan = latRange * METERS_PER_DEG_LAT;
      r = Math.max(18, Math.min(72, (point.radiusMeters / metersSpan) * innerH));
    }
    return { ...point, x, y, r };
  });
}

export function formatLiveAge(clockInTimestamp: number) {
  const minutes = Math.max(0, Math.round((Date.now() - clockInTimestamp) / 60_000));
  if (minutes < 60) return `${minutes}m on duty`;
  const hours = Math.floor(minutes / 60);
  const rem = minutes % 60;
  return rem > 0 ? `${hours}h ${rem}m on duty` : `${hours}h on duty`;
}
