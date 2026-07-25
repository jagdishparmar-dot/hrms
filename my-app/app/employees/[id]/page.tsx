import Link from "next/link";
import { notFound } from "next/navigation";

import { AdminShell } from "@/components/admin-shell";
import { EditEmployeeForm, SalaryStructureForm } from "@/components/employee-forms";
import { EmployeeDocumentsPanel } from "@/components/employee-documents";
import { EmployeeDetailActions } from "@/components/employee-detail-actions";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { requireCompanyAdmin } from "@/lib/appwrite/auth";
import {
  getEmployeeAction,
  getSalaryStructureAction,
  listAttendanceAction,
  listEmployeeDocumentsAction,
  listShiftsAction,
  listSitesAction,
  listThreePlVendorsAction,
} from "@/lib/appwrite/phase1-actions";
import { formatAttendanceTime } from "@/lib/attendance-export";

export default async function EmployeeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ctx = await requireCompanyAdmin();
  let employee;
  try {
    employee = await getEmployeeAction(id);
  } catch {
    notFound();
  }
  const [sites, shifts, salary, attendanceResult, documents, vendors] = await Promise.all([
    listSitesAction(),
    listShiftsAction(),
    getSalaryStructureAction(id),
    listAttendanceAction({ userId: employee.userId, page: 1, pageSize: 15 }),
    listEmployeeDocumentsAction(id),
    listThreePlVendorsAction(),
  ]);
  const attendance = attendanceResult.rows;

  return (
    <AdminShell title={employee.name} subtitle={employee.email}>
      <PageHeader
        title={employee.name}
        description={employee.email}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              nativeButton={false}
              render={<Link href="/employees" />}
            >
              Back to directory
            </Button>
            <EmployeeDetailActions employee={employee} />
          </div>
        }
      />

      <div className="grid gap-4 lg:grid-cols-2 lg:gap-6">
        <Card className="shadow-xs">
          <CardHeader>
            <CardTitle>Profile</CardTitle>
            <CardDescription>Employment details and site assignment</CardDescription>
          </CardHeader>
          <CardContent>
            <EditEmployeeForm
              employee={employee}
              sites={sites}
              shifts={shifts}
              orgConfig={{
                departments: ctx.company.settings.departments,
                designations: ctx.company.settings.designations,
              }}
              vendors={vendors}
            />
          </CardContent>
        </Card>

        <div className="space-y-4 md:space-y-6">
          <Card className="shadow-xs">
            <CardHeader>
              <CardTitle>Salary structure</CardTitle>
              {salary ? (
                <CardDescription>
                  Active CTC/month: ₹{salary.ctcMonthly.toLocaleString("en-IN")}{" "}
                  (from {salary.effectiveFrom})
                </CardDescription>
              ) : (
                <CardDescription>No salary structure on file.</CardDescription>
              )}
            </CardHeader>
            <CardContent>
              <SalaryStructureForm employeeId={employee.id} />
            </CardContent>
          </Card>

          <EmployeeDocumentsPanel employeeId={employee.id} documents={documents} />
        </div>
      </div>

      <Card className="mt-4 shadow-xs md:mt-6">
        <CardHeader>
          <CardTitle>Recent attendance</CardTitle>
          <CardDescription>Last 15 punch records</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Clock in</TableHead>
                <TableHead>Clock out</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {attendance.map((record) => (
                <TableRow key={record.id}>
                  <TableCell>{record.dateIso}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{record.status}</Badge>
                  </TableCell>
                  <TableCell>{formatAttendanceTime(record.clockInTime)}</TableCell>
                  <TableCell>{formatAttendanceTime(record.clockOutTime)}</TableCell>
                </TableRow>
              ))}
              {attendance.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">
                    No attendance records yet.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </AdminShell>
  );
}
