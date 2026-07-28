import { AdminShell } from "@/components/admin-shell";
import { EmployeeLeaveView } from "@/components/employee-leave-view";
import { EmployeeShell } from "@/components/employee-shell";
import {
  LeaveAdminForms,
  LeaveApplyForm,
  LeaveAssignmentForm,
  LeaveReviewList,
} from "@/components/leave-forms";
import { PageHeader } from "@/components/page-header";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { requireTenantMember } from "@/lib/appwrite/auth";
import {
  listEmployeesAction,
  listHolidaysAction,
  listLeaveAssignmentsAction,
  listLeaveRequestsAction,
  listLeaveTypesAction,
  listMyLeaveBalancesAction,
} from "@/lib/appwrite/phase1-actions";
import { isCompanyAdminRole } from "@/lib/appwrite/types";
import { pageMetadata } from "@/lib/site-metadata";

export const metadata = pageMetadata({
  title: "Leave",
  description: "Apply for leave, review requests, and manage leave balances and types.",
  path: "/leave",
});

export default async function LeavePage() {
  const ctx = await requireTenantMember();
  const isAdmin = isCompanyAdminRole(ctx.membership.role);
  const currentYear = new Date().getFullYear();
  const [types, balances, holidays, requests, employeesResult, assignments] =
    await Promise.all([
      listLeaveTypesAction(),
      listMyLeaveBalancesAction(),
      listHolidaysAction(),
      isAdmin ? listLeaveRequestsAction("pending") : Promise.resolve([]),
      isAdmin ? listEmployeesAction() : Promise.resolve({ ok: true as const, employees: [], error: null }),
      isAdmin ? listLeaveAssignmentsAction(currentYear) : Promise.resolve([]),
    ]);
  const employees = employeesResult.employees;

  if (!isAdmin) {
    return (
      <EmployeeShell>
        <div className="mb-4 hidden md:block">
          <h2 className="text-2xl font-bold tracking-tight">Leave</h2>
          <p className="text-sm text-muted-foreground">
            Check balances, apply for time off, and view holidays.
          </p>
        </div>
        <EmployeeLeaveView balances={balances} types={types} holidays={holidays} />
      </EmployeeShell>
    );
  }

  return (
    <AdminShell title="Leave" subtitle="Balances, applications, and holidays">
      <PageHeader
        title="Leave"
        description="Check balances, apply for time off, and manage approvals."
      />

      <Tabs defaultValue="mine" className="flex flex-col gap-4">
        <TabsList variant="line">
          <TabsTrigger value="mine">My leave</TabsTrigger>
          <TabsTrigger value="approvals">
            Approvals{requests.length ? ` (${requests.length})` : ""}
          </TabsTrigger>
          <TabsTrigger value="config">Configure</TabsTrigger>
          <TabsTrigger value="assignments">Assignments</TabsTrigger>
        </TabsList>

        <TabsContent value="mine" className="flex flex-col gap-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <BalancesCard balances={balances} types={types} />
            <ApplyCard types={types} />
          </div>
        </TabsContent>

        <TabsContent value="approvals" className="flex flex-col gap-4">
          <Card className="shadow-xs">
            <CardHeader>
              <CardTitle>Pending approvals</CardTitle>
              <CardDescription>Review and act on leave requests</CardDescription>
            </CardHeader>
            <CardContent>
              <LeaveReviewList items={requests} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="config" className="flex flex-col gap-4">
          <Card className="shadow-xs">
            <CardHeader>
              <CardTitle>Configure leave & holidays</CardTitle>
              <CardDescription>Leave types and company holidays</CardDescription>
            </CardHeader>
            <CardContent>
              <LeaveAdminForms types={types} holidays={holidays} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="assignments" className="flex flex-col gap-4">
          <Card className="shadow-xs">
            <CardHeader>
              <CardTitle>Leave assignments</CardTitle>
              <CardDescription>
                Allocate and manage employee leave balances for {currentYear}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <LeaveAssignmentForm
                employees={employees}
                types={types}
                assignments={assignments}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </AdminShell>
  );
}

function BalancesCard({
  balances,
  types,
}: {
  balances: Awaited<ReturnType<typeof listMyLeaveBalancesAction>>;
  types: Awaited<ReturnType<typeof listLeaveTypesAction>>;
}) {
  return (
    <Card className="shadow-xs">
      <CardHeader>
        <CardTitle>My balances</CardTitle>
        <CardDescription>Available leave by type</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Type</TableHead>
              <TableHead className="text-right">Balance</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {balances.map((b) => {
              const type = types.find((t) => t.id === b.leaveTypeId);
              return (
                <TableRow key={b.id}>
                  <TableCell>{type?.name || b.leaveTypeId}</TableCell>
                  <TableCell className="text-right font-medium tabular-nums">
                    {b.balance}
                  </TableCell>
                </TableRow>
              );
            })}
            {balances.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={2}
                  className="h-24 text-center text-muted-foreground"
                >
                  No leave types configured yet.
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function ApplyCard({
  types,
}: {
  types: Awaited<ReturnType<typeof listLeaveTypesAction>>;
}) {
  return (
    <Card className="shadow-xs">
      <CardHeader>
        <CardTitle>Apply leave</CardTitle>
        <CardDescription>Submit a new leave request</CardDescription>
      </CardHeader>
      <CardContent>
        <LeaveApplyForm types={types.filter((t) => t.status === "active")} />
      </CardContent>
    </Card>
  );
}
