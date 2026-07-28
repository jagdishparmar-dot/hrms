import { LeaveApplyForm } from '@/components/leave-forms';
import type {
  Holiday,
  LeaveBalance,
  LeaveType,
} from '@/lib/appwrite/types';

export function EmployeeLeaveView({
  balances,
  types,
  holidays,
}: {
  balances: LeaveBalance[];
  types: LeaveType[];
  holidays: Holiday[];
}) {
  const activeTypes = types.filter((type) => type.status === 'active');

  return (
    <div className="flex flex-col gap-4">
      <section className="rounded-2xl border border-border/60 bg-card p-4 shadow-sm">
        <h3 className="text-base font-bold">My balances</h3>
        <p className="text-xs text-muted-foreground">Available leave by type</p>

        <div className="mt-3 flex flex-col gap-2 md:hidden">
          {balances.map((balance) => {
            const type = types.find((item) => item.id === balance.leaveTypeId);
            return (
              <div
                key={balance.id}
                className="flex items-center justify-between rounded-xl bg-muted/40 px-3 py-3"
              >
                <span className="text-sm font-medium">{type?.name || balance.leaveTypeId}</span>
                <span className="text-lg font-bold tabular-nums text-indigo-600 dark:text-indigo-400">
                  {balance.balance}
                </span>
              </div>
            );
          })}
          {balances.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              No leave types configured yet.
            </p>
          ) : null}
        </div>

        <div className="mt-3 hidden overflow-hidden rounded-xl border border-border/60 md:block">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30 text-left text-muted-foreground">
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 text-right font-medium">Balance</th>
              </tr>
            </thead>
            <tbody>
              {balances.map((balance) => {
                const type = types.find((item) => item.id === balance.leaveTypeId);
                return (
                  <tr key={balance.id} className="border-b border-border/60 last:border-0">
                    <td className="px-4 py-3">{type?.name || balance.leaveTypeId}</td>
                    <td className="px-4 py-3 text-right font-medium tabular-nums">
                      {balance.balance}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {balances.length === 0 ? (
            <p className="p-6 text-center text-sm text-muted-foreground">
              No leave types configured yet.
            </p>
          ) : null}
        </div>
      </section>

      <section className="rounded-2xl border border-border/60 bg-card p-4 shadow-sm">
        <h3 className="text-base font-bold">Apply leave</h3>
        <p className="text-xs text-muted-foreground">Submit a new leave request</p>
        <div className="mt-4">
          <LeaveApplyForm types={activeTypes} />
        </div>
      </section>

      <section className="rounded-2xl border border-border/60 bg-card p-4 shadow-sm">
        <h3 className="text-base font-bold">Holidays</h3>
        <p className="text-xs text-muted-foreground">Company holiday calendar</p>

        <div className="mt-3 flex flex-col gap-2 md:hidden">
          {holidays.map((holiday) => (
            <div
              key={holiday.id}
              className="flex items-center justify-between rounded-xl bg-muted/40 px-3 py-3"
            >
              <span className="text-sm font-medium">{holiday.name}</span>
              <span className="text-sm tabular-nums text-muted-foreground">{holiday.date}</span>
            </div>
          ))}
          {holidays.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">No holidays listed.</p>
          ) : null}
        </div>

        <div className="mt-3 hidden overflow-hidden rounded-xl border border-border/60 md:block">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30 text-left text-muted-foreground">
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Date</th>
              </tr>
            </thead>
            <tbody>
              {holidays.map((holiday) => (
                <tr key={holiday.id} className="border-b border-border/60 last:border-0">
                  <td className="px-4 py-3 font-medium">{holiday.name}</td>
                  <td className="px-4 py-3 tabular-nums text-muted-foreground">{holiday.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {holidays.length === 0 ? (
            <p className="p-6 text-center text-sm text-muted-foreground">No holidays listed.</p>
          ) : null}
        </div>
      </section>
    </div>
  );
}
