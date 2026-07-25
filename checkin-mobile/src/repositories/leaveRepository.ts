import { AppwriteConfig } from '@/src/config/appwrite';
import { authHeaders } from '@/src/services/apiClient';
import type { Holiday, LeaveBalance, LeaveRequest, LeaveType } from '@/src/types';

export type LeaveSnapshot = {
  types: LeaveType[];
  balances: LeaveBalance[];
  holidays: Holiday[];
  requests: LeaveRequest[];
};

export class LeaveRepository {
  private companyId: string | null = null;

  setCompanyId(companyId: string | null) {
    this.companyId = companyId;
  }

  async getSnapshot(): Promise<LeaveSnapshot> {
    const headers = await authHeaders(this.companyId);
    const res = await fetch(`${AppwriteConfig.apiBaseUrl}/api/v1/leave`, { headers });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Unable to load leave data');
    }
    return {
      types: data.types ?? [],
      balances: data.balances ?? [],
      holidays: data.holidays ?? [],
      requests: data.requests ?? [],
    };
  }

  async applyLeave(params: {
    leaveTypeId: string;
    fromDate: string;
    toDate: string;
    note?: string;
  }): Promise<void> {
    const headers = await authHeaders(this.companyId);
    const res = await fetch(`${AppwriteConfig.apiBaseUrl}/api/v1/leave`, {
      method: 'POST',
      headers,
      body: JSON.stringify(params),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Unable to apply leave');
    }
  }
}

export const leaveRepository = new LeaveRepository();
