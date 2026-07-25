import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  Briefcase,
  Building2,
  CalendarDays,
  Clock,
  Mail,
  MapPin,
  Phone,
} from "lucide-react";

import { AdminShell } from "@/components/admin-shell";
import { EditEmployeeForm, SalaryStructureForm } from "@/components/employee-forms";
import { EmployeeDocumentsPanel } from "@/components/employee-documents";
import { EmployeeDetailActions } from "@/components/employee-detail-actions";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
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
import { getInitials } from "@/lib/utils";
import { pageMetadata } from "@/lib/site-metadata";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  try {
    const employee = await getEmployeeAction(id);
    return pageMetadata({
      title: employee.name,
      description: `Employee profile for ${employee.name}${employee.designation ? ` — ${employee.designation}` : ""}.`,
      path: `/employees/${id}`,
    });
  } catch {
    return pageMetadata({
      title: "Employee profile",
      description: "View and manage employee profile, salary, documents, and attendance.",
      path: `/employees/${id}`,
    });
  }
}

function statusBadgeClass(status: string) {
  if (status === "active") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300";
  }
  if (status === "inactive") {
    return "border-border bg-muted text-muted-foreground";
  }
  return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300";
}

function typeBadgeClass(type: string) {
  if (type === "3PL") return "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-500/30 dark:bg-violet-500/10 dark:text-violet-300";
  if (type === "Intern") return "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-300";
  if (type === "Consultant") return "border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-500/30 dark:bg-orange-500/10 dark:text-orange-300";
  return "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-300";
}

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

  const primarySite = sites.find((s) => s.id === employee.primarySiteId);

  return (
    <AdminShell title={employee.name} subtitle={employee.email}>
      {/* Modern Profile Header */}
      <div className="relative mb-6 overflow-hidden rounded-2xl border bg-card shadow-xs">
        {/* Cover Area (Flat Gradient) */}
        <div className="h-32 bg-linear-to-r from-blue-100 via-indigo-50 to-purple-100 dark:from-blue-950/40 dark:via-indigo-900/30 dark:to-purple-950/40" />
        
        <div className="relative px-4 pb-4 sm:px-6 sm:pb-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            {/* Avatar & Name */}
            <div className="-mt-12 flex flex-col gap-4 sm:flex-row sm:items-end">
              <Avatar className="size-24 rounded-2xl border-4 border-card bg-muted shadow-sm sm:size-28">
                <AvatarFallback className="rounded-2xl bg-primary/10 text-3xl font-semibold text-primary">
                  {getInitials(employee.name)}
                </AvatarFallback>
              </Avatar>
              <div className="pb-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl font-bold tracking-tight">{employee.name}</h1>
                  <Badge variant="outline" className={statusBadgeClass(employee.status)}>
                    {employee.status}
                  </Badge>
                  <Badge variant="outline" className={typeBadgeClass(employee.employmentType || "Permanent")}>
                    {employee.employmentType || "Permanent"}
                  </Badge>
                </div>
                <p className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                  <Briefcase className="size-4" />
                  {employee.designation || "No designation"} 
                  <span className="text-border">•</span> 
                  <Building2 className="size-4" />
                  {employee.department || "No department"}
                </p>
              </div>
            </div>
            
            {/* Top Actions */}
            <div className="flex shrink-0 items-center gap-2 pb-1">
              <Button variant="outline" nativeButton={false} render={<Link href="/employees" />}>
                Back to directory
              </Button>
              <EmployeeDetailActions employee={employee} />
            </div>
          </div>

          {/* Quick Info Grid */}
          <div className="mt-6 grid grid-cols-1 gap-4 rounded-xl bg-muted/40 p-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="flex items-center gap-3">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-background text-muted-foreground shadow-xs">
                <Mail className="size-4" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium text-muted-foreground">Email address</p>
                <p className="truncate text-sm font-medium">{employee.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-background text-muted-foreground shadow-xs">
                <Phone className="size-4" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium text-muted-foreground">Phone number</p>
                <p className="truncate text-sm font-medium">{employee.phone || "—"}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-background text-muted-foreground shadow-xs">
                <MapPin className="size-4" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium text-muted-foreground">Primary site</p>
                <p className="truncate text-sm font-medium">{primarySite?.name || "Unassigned"}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-background text-muted-foreground shadow-xs">
                <Clock className="size-4" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium text-muted-foreground">Shift hours</p>
                <p className="truncate text-sm font-medium">
                  {employee.workShiftStart} - {employee.workShiftEnd}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="compensation">Compensation & Docs</TabsTrigger>
          <TabsTrigger value="attendance">Attendance</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="outline-none">
          <Card className="shadow-xs lg:w-[60%]">
            <CardHeader>
              <CardTitle>Profile settings</CardTitle>
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
        </TabsContent>

        <TabsContent value="compensation" className="outline-none">
          <div className="grid gap-4 lg:grid-cols-2 lg:gap-6">
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
                <SalaryStructureForm employeeId={employee.id} salary={salary} />
              </CardContent>
            </Card>

            <EmployeeDocumentsPanel employeeId={employee.id} documents={documents} />
          </div>
        </TabsContent>

        <TabsContent value="attendance" className="outline-none">
          <Card className="shadow-xs">
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
        </TabsContent>
      </Tabs>
    </AdminShell>
  );
}
