import Link from "next/link";
import { AlertTriangle, Clock3, UserCheck, Users } from "lucide-react";

import { AdminShell } from "@/components/admin-shell";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardAction,
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
import { getTenantDashboardAction } from "@/lib/appwrite/actions";
import { getDashboardStatsAction } from "@/lib/appwrite/phase1-actions";
import { formatAttendanceTime } from "@/lib/attendance-export";
import { pageMetadata } from "@/lib/site-metadata";

export const metadata = pageMetadata({
  title: "Dashboard",
  description: "Overview of workforce activity, attendance alerts, and HR operations.",
  path: "/dashboard",
});

export default async function DashboardPage() {
  const [stats, tenant] = await Promise.all([
    getDashboardStatsAction(),
    getTenantDashboardAction(),
  ]);

  const cards = [
    {
      label: "Employees",
      value: stats.employees,
      icon: Users,
      href: "/employees",
      hint: "Active headcount",
    },
    {
      label: "Present today",
      value: stats.presentToday,
      icon: UserCheck,
      href: "/attendance",
      hint: "Checked in",
    },
    {
      label: "Late today",
      value: stats.lateToday,
      icon: AlertTriangle,
      href: "/attendance",
      hint: "Needs attention",
    },
    {
      label: "Open shifts",
      value: stats.openShifts,
      icon: Clock3,
      href: "/attendance",
      hint: "Still punched in",
    },
  ];

  return (
    <AdminShell
      title="Dashboard"
      subtitle={`${tenant.company.name} · ${tenant.membership.role.replaceAll("_", " ")}`}
    >
      <div className="@container/main flex flex-col gap-4 md:gap-6">
        <PageHeader
          title="Overview"
          description="Today’s attendance snapshot and recent punches."
        />

        <div className="grid grid-cols-1 gap-4 *:data-[slot=card]:bg-linear-to-t *:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card *:data-[slot=card]:shadow-xs sm:grid-cols-2 xl:grid-cols-4 dark:*:data-[slot=card]:bg-card">
          {cards.map((card) => (
            <Link key={card.label} href={card.href} className="block">
              <Card className="h-full transition-colors hover:bg-accent/30">
                <CardHeader>
                  <CardTitle>
                    <div className="flex size-7 items-center justify-center rounded-lg border bg-muted text-muted-foreground">
                      <card.icon className="size-4" />
                    </div>
                  </CardTitle>
                  <CardDescription>{card.label}</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-1">
                  <div className="text-3xl font-medium tabular-nums leading-none tracking-tight">
                    {card.value}
                  </div>
                  <p className="text-sm text-muted-foreground">{card.hint}</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        <Card className="py-0 shadow-xs">
          <CardHeader className="border-b py-(--card-spacing)">
            <CardTitle>Recent attendance</CardTitle>
            <CardDescription>Latest punches across the company</CardDescription>
            <CardAction>
              <Link
                href="/attendance"
                className="text-sm font-medium text-primary hover:underline"
              >
                View all
              </Link>
            </CardAction>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>In</TableHead>
                  <TableHead>Out</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Site</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats.recent.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium">{row.employeeName}</TableCell>
                    <TableCell className="tabular-nums">{row.dateIso}</TableCell>
                    <TableCell className="tabular-nums">
                      {formatAttendanceTime(row.clockInTime)}
                    </TableCell>
                    <TableCell className="tabular-nums">
                      {formatAttendanceTime(row.clockOutTime)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{row.status}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {row.locationName || "—"}
                    </TableCell>
                  </TableRow>
                ))}
                {stats.recent.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="h-24 text-center text-muted-foreground"
                    >
                      No attendance yet. Assign a site and punch from mobile.
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
