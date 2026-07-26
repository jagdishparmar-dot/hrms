import { Query } from 'node-appwrite';

import {
  candidateShiftDates,
  dateIsoInTimeZone,
  formatShiftWindowLabel,
  shiftFromEmployeeFallback,
} from '@/lib/attendance-shift';
import { appwriteConfig } from '@/lib/appwrite/config';
import { mapShiftAssignment, mapWorkShift } from '@/lib/appwrite/mappers';
import { createAdminClient } from '@/lib/appwrite/server';
import type { Company, EmployeeMembership, WorkShift } from '@/lib/appwrite/types';

export type MobileTodayShift = {
  assignmentId?: string;
  dateIso: string;
  sequence: number;
  shiftId: string;
  name: string;
  code: string;
  shiftType: WorkShift['shiftType'];
  startTime: string;
  endTime: string;
  windowLabel: string;
  source: 'roster' | 'default';
  note?: string;
};

export type MobileTodayShiftsPayload = {
  dateIso: string;
  timezone: string;
  shifts: MobileTodayShift[];
};

function shiftTypeLabel(type: WorkShift['shiftType']) {
  switch (type) {
    case 'evening':
      return 'Evening';
    case 'night':
      return 'Night';
    case 'cross_midnight':
      return 'Cross-midnight';
    case 'rotational':
      return 'Rotational';
    default:
      return 'General';
  }
}

export { shiftTypeLabel };

async function getShiftById(companyId: string, shiftId: string) {
  if (!shiftId.trim()) return null;
  const { databases } = createAdminClient();
  try {
    const doc = await databases.getDocument(
      appwriteConfig.databaseId,
      appwriteConfig.shiftsCollectionId,
      shiftId,
    );
    const shift = mapWorkShift(doc as unknown as Record<string, unknown>);
    if (shift.companyId !== companyId || shift.status !== 'active') return null;
    return shift;
  } catch {
    return null;
  }
}

function toMobileShift(
  shift: WorkShift,
  params: {
    dateIso: string;
    sequence: number;
    source: 'roster' | 'default';
    assignmentId?: string;
    note?: string;
  },
): MobileTodayShift {
  return {
    assignmentId: params.assignmentId,
    dateIso: params.dateIso,
    sequence: params.sequence,
    shiftId: shift.id,
    name: shift.name,
    code: shift.code,
    shiftType: shift.shiftType,
    startTime: shift.startTime,
    endTime: shift.endTime,
    windowLabel: formatShiftWindowLabel(shift),
    source: params.source,
    note: params.note,
  };
}

export async function getEmployeeTodayShifts(params: {
  membership: EmployeeMembership;
  company: Company;
}): Promise<MobileTodayShiftsPayload> {
  const timeZone = params.company.settings.timezone || 'Asia/Kolkata';
  const nowMs = Date.now();
  const todayIso = dateIsoInTimeZone(nowMs, timeZone).dateIso;
  const candidateDates = candidateShiftDates(nowMs, timeZone);

  const { databases } = createAdminClient();
  let assignments: ReturnType<typeof mapShiftAssignment>[] = [];

  try {
    const result = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.shiftAssignmentsCollectionId,
      [
        Query.equal('companyId', params.membership.companyId),
        Query.equal('employeeId', params.membership.id),
        Query.equal('dateIso', candidateDates),
        Query.equal('status', 'scheduled'),
        Query.orderAsc('sequence'),
        Query.limit(20),
      ],
    );
    assignments = result.documents.map((doc) =>
      mapShiftAssignment(doc as unknown as Record<string, unknown>),
    );
  } catch {
    assignments = [];
  }

  const rosterForToday = assignments.filter((row) => row.dateIso === todayIso);
  const lateGraceMinutes =
    params.company.settings.lateGraceMinutes ?? appwriteConfig.lateGraceMinutes;

  const shifts: MobileTodayShift[] = [];

  if (rosterForToday.length > 0) {
    for (const assignment of rosterForToday) {
      const shift =
        (await getShiftById(params.membership.companyId, assignment.shiftId)) ??
        shiftFromEmployeeFallback({
          companyId: params.membership.companyId,
          startTime: params.membership.workShiftStart,
          endTime: params.membership.workShiftEnd,
          lateGraceMinutes,
        });
      shifts.push(
        toMobileShift(shift, {
          dateIso: assignment.dateIso,
          sequence: assignment.sequence,
          source: 'roster',
          assignmentId: assignment.id,
          note: assignment.note || undefined,
        }),
      );
    }
  } else {
    const fromId = await getShiftById(params.membership.companyId, params.membership.shiftId);
    const fallback =
      fromId ??
      shiftFromEmployeeFallback({
        companyId: params.membership.companyId,
        startTime: params.membership.workShiftStart,
        endTime: params.membership.workShiftEnd,
        lateGraceMinutes,
      });
    shifts.push(
      toMobileShift(fallback, {
        dateIso: todayIso,
        sequence: 1,
        source: 'default',
      }),
    );
  }

  return {
    dateIso: todayIso,
    timezone: timeZone,
    shifts,
  };
}
