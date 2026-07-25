import type { AttendanceRecord } from "@/lib/appwrite/types";

export const EMPTY_ATTENDANCE_TIME = "00:00";

function csvEscape(value: string | number | null | undefined) {
  const text = value == null ? "" : String(value);
  if (/[",\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

export function formatAttendanceTime(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : EMPTY_ATTENDANCE_TIME;
}

export function formatDuration(totalMinutes: number) {
  if (!totalMinutes || totalMinutes < 0) return EMPTY_ATTENDANCE_TIME;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}h ${String(minutes).padStart(2, "0")}m`;
}

export function attendanceRowsToCsv(rows: AttendanceRecord[]) {
  const headers = [
    "Employee",
    "Employee Code",
    "Date",
    "Day",
    "Clock In",
    "Clock Out",
    "Duration",
    "Status",
    "Site",
    "Geofence",
    "Distance (m)",
    "Device",
    "Note",
  ];

  const lines = [
    headers.join(","),
    ...rows.map((row) =>
      [
        row.employeeName || row.userId,
        row.employeeCode || "",
        row.dateIso,
        row.dayOfWeek || "",
        formatAttendanceTime(row.clockInTime),
        formatAttendanceTime(row.clockOutTime),
        formatDuration(row.totalMinutes),
        row.status,
        row.locationName || "",
        row.geofenceStatus,
        row.distanceMeters || "",
        row.deviceId || "",
        row.note || "",
      ]
        .map(csvEscape)
        .join(","),
    ),
  ];

  return lines.join("\r\n");
}

export function downloadAttendanceCsv(rows: AttendanceRecord[], filename: string) {
  const csv = attendanceRowsToCsv(rows);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
