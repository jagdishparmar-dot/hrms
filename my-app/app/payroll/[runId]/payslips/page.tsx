import Link from "next/link";

import { AdminShell } from "@/components/admin-shell";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  listEmployeesAction,
  listPayslipsForRunAction,
} from "@/lib/appwrite/phase1-actions";
import { pageMetadata } from "@/lib/site-metadata";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ runId: string }>;
}): Promise<import("next").Metadata> {
  const { runId } = await params;
  return pageMetadata({
    title: "Payslips",
    description: "Review generated payslips for this payroll run.",
    path: `/payroll/${runId}/payslips`,
  });
}

export default async function PayslipsPage({
  params,
}: {
  params: Promise<{ runId: string }>;
}) {
  const { runId } = await params;
  const [slips, { employees }] = await Promise.all([
    listPayslipsForRunAction(runId),
    listEmployeesAction(),
  ]);
  const byId = new Map(employees.map((e) => [e.id, e]));

  return (
    <AdminShell title="Payslips" subtitle={`Run ${runId}`}>
      <PageHeader
        title="Payslips"
        description="Open a payslip and use the browser print dialog to save as PDF."
        actions={
          <Button
            variant="outline"
            nativeButton={false}
            render={<Link href="/payroll" />}
          >
            Back to payroll
          </Button>
        }
      />

      <div className="space-y-4">
        {slips.map((slip) => {
          const emp = byId.get(slip.employeeId);
          const breakdown = slip.breakdown as {
            payableDays?: number;
            workingDays?: number;
            gross?: number;
            deductions?: number;
            netPay?: number;
          };
          return (
            <Card
              key={slip.id}
              className="shadow-xs print:border-0 print:shadow-none print:ring-0"
            >
              <CardHeader className="flex flex-row items-start justify-between space-y-0 border-b">
                <div>
                  <CardTitle className="text-lg">
                    {emp?.name || slip.employeeId}
                  </CardTitle>
                  <CardDescription>
                    {emp?.employeeCode || "—"} · {slip.month}
                  </CardDescription>
                </div>
                <p className="text-xl font-semibold tabular-nums">
                  ₹{slip.netPay.toLocaleString("en-IN")}
                </p>
              </CardHeader>
              <CardContent>
                <dl className="grid gap-2 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="text-muted-foreground">Payable days</dt>
                    <dd className="font-medium">
                      {breakdown.payableDays ?? "—"} / {breakdown.workingDays ?? "—"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Gross</dt>
                    <dd className="font-medium">
                      ₹{Number(breakdown.gross || 0).toLocaleString("en-IN")}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Deductions</dt>
                    <dd className="font-medium">
                      ₹{Number(breakdown.deductions || 0).toLocaleString("en-IN")}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Net pay</dt>
                    <dd className="font-medium">
                      ₹{slip.netPay.toLocaleString("en-IN")}
                    </dd>
                  </div>
                </dl>
              </CardContent>
            </Card>
          );
        })}
        {slips.length === 0 ? (
          <Card className="shadow-xs">
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              No payslips for this run.
            </CardContent>
          </Card>
        ) : null}
      </div>
    </AdminShell>
  );
}
