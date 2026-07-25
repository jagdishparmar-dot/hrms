import Link from "next/link";

import { AdminShell } from "@/components/admin-shell";
import { PayrollForms } from "@/components/payroll-forms";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { listPayrollRunsAction } from "@/lib/appwrite/phase1-actions";

export default async function PayrollPage() {
  const runs = await listPayrollRunsAction();
  const month = new Date().toISOString().slice(0, 7);

  return (
    <AdminShell title="Payroll" subtitle="Simple permanent payroll runs and bank CSV">
      <PageHeader
        title="Payroll"
        description="Run payroll, download bank CSV, and review past payslip runs."
      />

      <div className="grid gap-4 lg:grid-cols-2 lg:gap-6">
        <Card className="shadow-xs">
          <CardHeader>
            <CardTitle>Run payroll</CardTitle>
            <CardDescription>
              Computes payable days from attendance + approved leave (22 working-day
              base), generates payslips, and finalizes the run.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <PayrollForms defaultMonth={month} runs={runs} />
          </CardContent>
        </Card>

        <Card className="py-0 shadow-xs">
          <CardHeader className="border-b py-(--card-spacing)">
            <CardTitle>Past runs</CardTitle>
            <CardDescription>Open a run to view printable payslips</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Month</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Employees</TableHead>
                  <TableHead className="text-right">Net total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {runs.map((run) => (
                  <TableRow key={run.id}>
                    <TableCell>
                      <Link
                        href={`/payroll/${run.id}/payslips`}
                        className="font-medium hover:underline"
                      >
                        {run.month}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{run.status}</Badge>
                    </TableCell>
                    <TableCell className="tabular-nums">
                      {run.totals.employees ?? 0}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      ₹{Number(run.totals.totalNet || 0).toLocaleString("en-IN")}
                    </TableCell>
                  </TableRow>
                ))}
                {runs.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={4}
                      className="h-24 text-center text-muted-foreground"
                    >
                      No payroll runs yet.
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </AdminShell>
  );
}
