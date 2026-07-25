"use client";

import Link from "next/link";
import type { ComponentType } from "react";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Briefcase,
  Building2,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Trash2,
  UserCheck,
  UserPlus,
  UserRound,
  Users,
  UserX,
  X,
} from "lucide-react";
import { toast } from "sonner";

import {
  CreateEmployeeForm,
  EditEmployeeForm,
  type EmployeeCodeFormConfig,
} from "@/components/employee-forms";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  deactivateEmployeeAction,
  deleteEmployeeAction,
} from "@/lib/appwrite/phase1-actions";
import type {
  EmployeeMembership,
  Site,
  ThreePlVendor,
  WorkShift,
} from "@/lib/appwrite/types";
import { cn, getInitials } from "@/lib/utils";

const STATUS_FILTERS = ["All", "active", "inactive", "invited"] as const;
const TYPE_FILTERS = ["All", "Permanent", "3PL", "Intern", "Consultant"] as const;
const PAGE_SIZE = 20;

function statusBadgeClass(status: EmployeeMembership["status"]) {
  if (status === "active") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300";
  }
  if (status === "inactive") {
    return "border-border bg-muted text-muted-foreground";
  }
  return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300";
}

function typeBadgeClass(type: string) {
  if (type === "3PL") {
    return "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-500/30 dark:bg-violet-500/10 dark:text-violet-300";
  }
  if (type === "Intern") {
    return "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-300";
  }
  if (type === "Consultant") {
    return "border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-500/30 dark:bg-orange-500/10 dark:text-orange-300";
  }
  return "border-border bg-muted/50 text-foreground";
}

function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  colorClass = "bg-primary/10 text-primary",
}: {
  label: string;
  value: number | string;
  hint: string;
  icon: ComponentType<{ className?: string }>;
  colorClass?: string;
}) {
  return (
    <Card className="h-full shadow-xs">
      <CardContent className="flex items-center gap-4 p-4 sm:p-5">
        <div className={cn("flex size-12 shrink-0 items-center justify-center rounded-2xl", colorClass)}>
          <Icon className="size-5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          <div className="flex items-baseline gap-2 mt-0.5">
            <p className="text-2xl font-bold tracking-tight tabular-nums">{value}</p>
            <p className="text-xs text-muted-foreground truncate">{hint}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

type BreakdownRow = { label: string; count: number };

function buildActiveBreakdown(
  employees: EmployeeMembership[],
  field: "department" | "designation",
  configured: string[],
): BreakdownRow[] {
  const active = employees.filter((employee) => employee.status === "active");
  const counts = new Map<string, number>();

  for (const label of configured) {
    counts.set(label, 0);
  }

  for (const employee of active) {
    const label = employee[field].trim() || "Unassigned";
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }

  const rows: BreakdownRow[] = [];
  const seen = new Set<string>();

  for (const label of configured) {
    rows.push({ label, count: counts.get(label) ?? 0 });
    seen.add(label);
  }

  const extras = [...counts.entries()]
    .filter(([label]) => !seen.has(label) && label !== "Unassigned")
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([label, count]) => ({ label, count }));

  rows.push(...extras);

  const unassigned = counts.get("Unassigned") ?? 0;
  if (unassigned > 0) {
    rows.push({ label: "Unassigned", count: unassigned });
  }

  return rows;
}

function BreakdownWidget({
  title,
  icon: Icon,
  rows,
  emptyMessage,
  className,
}: {
  title: string;
  icon: ComponentType<{ className?: string }>;
  rows: BreakdownRow[];
  emptyMessage: string;
  className?: string;
}) {
  const total = rows.reduce((sum, row) => sum + row.count, 0);
  const maxCount = Math.max(...rows.map((row) => row.count), 1);

  return (
    <Card className={cn("flex flex-col shadow-xs", className)}>
      <CardHeader className="p-4 pb-0 border-b">
        <div className="flex items-center gap-2 pb-3">
          <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
            <Icon className="size-3.5" />
          </div>
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
          <span className="ml-auto text-xs text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-full">
            {total} active
          </span>
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-4 flex-1">
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">{emptyMessage}</p>
        ) : (
          <ul className="max-h-[220px] space-y-3 overflow-y-auto pr-1">
            {rows.map((row) => (
              <li key={row.label} className="group flex items-center justify-between gap-3 text-sm">
                <span className="truncate text-muted-foreground group-hover:text-foreground transition-colors">{row.label}</span>
                <div className="flex items-center gap-3 shrink-0">
                  <div className="hidden sm:block w-24 h-1.5 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary/40 group-hover:bg-primary/70 transition-all"
                      style={{ width: `${(row.count / maxCount) * 100}%` }}
                    />
                  </div>
                  <span className="tabular-nums font-medium w-6 text-right">{row.count}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

export function EmployeesDirectory({
  employees,
  sites,
  shifts = [],
  orgConfig,
  vendors,
  employeeCodeConfig,
  maxEmployees,
}: {
  employees: EmployeeMembership[];
  sites: Site[];
  shifts?: WorkShift[];
  orgConfig: { departments: string[]; designations: string[] };
  vendors: ThreePlVendor[];
  employeeCodeConfig: EmployeeCodeFormConfig;
  maxEmployees?: number;
}) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] =
    useState<(typeof STATUS_FILTERS)[number]>("All");
  const [typeFilter, setTypeFilter] =
    useState<(typeof TYPE_FILTERS)[number]>("All");
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);
  const [editEmployee, setEditEmployee] = useState<EmployeeMembership | null>(null);
  const [deleteEmployee, setDeleteEmployee] = useState<EmployeeMembership | null>(
    null,
  );
  const [pending, startTransition] = useTransition();

  const stats = useMemo(() => {
    const active = employees.filter((e) => e.status === "active").length;
    const inactive = employees.filter((e) => e.status === "inactive").length;
    const invited = employees.filter((e) => e.status === "invited").length;
    const threePl = employees.filter((e) => e.employmentType === "3PL").length;
    const departments = new Set(
      employees.map((e) => e.department).filter(Boolean),
    ).size;
    return { active, inactive, invited, threePl, departments };
  }, [employees]);

  const departmentBreakdown = useMemo(
    () =>
      buildActiveBreakdown(
        employees,
        "department",
        orgConfig.departments,
      ),
    [employees, orgConfig.departments],
  );

  const employmentTypeBreakdown = useMemo(() => {
    const active = employees.filter((employee) => employee.status === "active");
    const counts = new Map<string, number>();
    
    // Initialize common types so they appear even if 0
    const commonTypes = ["Permanent", "3PL", "Intern", "Consultant"];
    for (const t of commonTypes) counts.set(t, 0);

    for (const employee of active) {
      const type = employee.employmentType || "Permanent";
      counts.set(type, (counts.get(type) ?? 0) + 1);
    }

    return Array.from(counts.entries())
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
  }, [employees]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return employees.filter((employee) => {
      if (statusFilter !== "All" && employee.status !== statusFilter) return false;
      if (typeFilter !== "All" && employee.employmentType !== typeFilter) return false;
      if (!q) return true;
      return (
        employee.name.toLowerCase().includes(q) ||
        employee.email.toLowerCase().includes(q) ||
        employee.employeeCode.toLowerCase().includes(q) ||
        employee.department.toLowerCase().includes(q) ||
        employee.designation.toLowerCase().includes(q)
      );
    });
  }, [employees, search, statusFilter, typeFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageStart = (currentPage - 1) * PAGE_SIZE;
  const pageRows = filtered.slice(pageStart, pageStart + PAGE_SIZE);

  const hasActiveFilters =
    search.trim().length > 0 || statusFilter !== "All" || typeFilter !== "All";

  function clearFilters() {
    setSearch("");
    setStatusFilter("All");
    setTypeFilter("All");
    setPage(1);
  }

  function runAction(
    action: (fd: FormData) => Promise<{ ok: true } | { ok: false; error: string }>,
    employeeId: string,
    successMessage: string,
  ) {
    const fd = new FormData();
    fd.set("employeeId", employeeId);
    startTransition(async () => {
      const result = await action(fd);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(successMessage);
      setDeleteEmployee(null);
      router.refresh();
    });
  }

  const seatLabel =
    maxEmployees != null
      ? `${employees.length} / ${maxEmployees} seats`
      : `${employees.length} total`;

  return (
    <>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        {/* Left Col: KPIs stacked over Employment Type */}
        <div className="flex flex-col gap-4 lg:col-span-8">
          {/* KPI Cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Workforce"
              value={employees.length}
              hint={seatLabel}
              icon={Users}
              colorClass="bg-blue-100/50 text-blue-600 dark:bg-blue-900/50 dark:text-blue-400"
            />
            <StatCard
              label="Active"
              value={stats.active}
              hint="Can sign in and use apps"
              icon={UserCheck}
              colorClass="bg-emerald-100/50 text-emerald-600 dark:bg-emerald-900/50 dark:text-emerald-400"
            />
            <StatCard
              label="Inactive / invited"
              value={stats.inactive + stats.invited}
              hint={`${stats.inactive} inactive · ${stats.invited} invited`}
              icon={UserX}
              colorClass="bg-amber-100/50 text-amber-600 dark:bg-amber-900/50 dark:text-amber-400"
            />
            <StatCard
              label="Organization"
              value={stats.departments}
              hint={`${stats.threePl} on 3PL · ${orgConfig.departments.length} depts`}
              icon={Building2}
              colorClass="bg-purple-100/50 text-purple-600 dark:bg-purple-900/50 dark:text-purple-400"
            />
          </div>

          <BreakdownWidget
            title="By employment type"
            icon={Briefcase}
            rows={employmentTypeBreakdown}
            emptyMessage="No active employees yet."
            className="flex-1"
          />
        </div>

        {/* Right Col: Department Breakdown */}
        <div className="lg:col-span-4 h-full">
          <BreakdownWidget
            title="By department"
            icon={Building2}
            rows={departmentBreakdown}
            emptyMessage="No active employees or departments configured yet."
            className="h-full"
          />
        </div>
      </div>

      <Card className="overflow-hidden shadow-xs mt-2">
        <CardHeader className="gap-4 border-b bg-muted/20 pb-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-1">
              <CardTitle className="text-xl">People directory</CardTitle>
              <CardDescription>
                Search, filter, and manage employee profiles and access.
              </CardDescription>
            </div>
            <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center lg:w-auto">
              <InputGroup className="h-10 w-full sm:w-72 bg-muted/30">
                <InputGroupAddon align="inline-start">
                  <Search className="size-4 text-muted-foreground" />
                </InputGroupAddon>
                <InputGroupInput
                  className="h-10 border-none bg-transparent focus-visible:ring-0"
                  placeholder="Search name, email, code, dept…"
                  value={search}
                  onChange={(event) => {
                    setSearch(event.target.value);
                    setPage(1);
                  }}
                />
              </InputGroup>
              <Button className="h-10 shrink-0 shadow-xs" onClick={() => setCreateOpen(true)}>
                <UserPlus className="size-4" />
                Add employee
              </Button>
            </div>
          </div>

          <div className="flex flex-col gap-3 rounded-lg border bg-muted/20 p-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <FilterPills
                label="Status"
                value={statusFilter}
                options={STATUS_FILTERS}
                counts={employees.reduce<Record<string, number>>((acc, e) => {
                  acc[e.status] = (acc[e.status] || 0) + 1;
                  return acc;
                }, {})}
                onChange={(value) => {
                  setStatusFilter(value);
                  setPage(1);
                }}
              />
              <span className="hidden h-4 w-px bg-border sm:block" aria-hidden />
              <FilterPills
                label="Type"
                value={typeFilter}
                options={TYPE_FILTERS}
                counts={employees.reduce<Record<string, number>>((acc, e) => {
                  const key = e.employmentType || "Unknown";
                  acc[key] = (acc[key] || 0) + 1;
                  return acc;
                }, {})}
                onChange={(value) => {
                  setTypeFilter(value);
                  setPage(1);
                }}
              />
              {hasActiveFilters ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 gap-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                  onClick={clearFilters}
                >
                  <X className="size-3" />
                  Clear filters
                </Button>
              ) : null}
            </div>
            <p className="px-2 text-xs font-medium tabular-nums text-muted-foreground">
              {filtered.length === employees.length
                ? `${filtered.length} employees`
                : `${filtered.length} of ${employees.length} shown`}
            </p>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {pageRows.length > 0 ? (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-b bg-muted/40 text-muted-foreground hover:bg-muted/40">
                      <TableHead className="pl-6 h-10 font-medium">Employee</TableHead>
                      <TableHead className="h-10 font-medium">Code</TableHead>
                      <TableHead className="h-10 font-medium">Role & Type</TableHead>
                      <TableHead className="h-10 font-medium">Department</TableHead>
                      <TableHead className="h-10 font-medium">Status</TableHead>
                      <TableHead className="pr-6 text-right h-10 font-medium">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pageRows.map((employee) => (
                      <TableRow
                        key={employee.id}
                        className="group transition-colors hover:bg-muted/20"
                      >
                        <TableCell className="pl-6 py-3">
                          <div className="flex items-center gap-3">
                            <Avatar size="default" className="ring-1 ring-border/60">
                              <AvatarFallback className="bg-primary/5 font-medium text-primary">
                                {getInitials(employee.name)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <Link
                                href={`/employees/${employee.id}`}
                                className="block truncate font-medium transition-colors hover:text-primary"
                              >
                                {employee.name}
                              </Link>
                              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                                <span className="truncate">{employee.email}</span>
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="py-3">
                          <span className="font-mono text-xs text-muted-foreground">
                            {employee.employeeCode || "—"}
                          </span>
                        </TableCell>
                        <TableCell className="py-3">
                          <div className="flex flex-col items-start gap-1">
                            <p className="truncate text-sm font-medium text-foreground">
                              {employee.designation || "—"}
                            </p>
                            <Badge
                              variant="outline"
                              className={cn(
                                "w-fit text-[10px] font-medium leading-none px-1.5 py-0.5",
                                typeBadgeClass(employee.employmentType || "Permanent"),
                              )}
                            >
                              {employee.employmentType || "Permanent"}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell className="py-3">
                          <span className="text-sm font-medium text-muted-foreground">
                            {employee.department || (
                              <span>Unassigned</span>
                            )}
                          </span>
                        </TableCell>
                        <TableCell className="py-3">
                          <Badge
                            variant="outline"
                            className={cn(
                              "gap-1.5 capitalize",
                              statusBadgeClass(employee.status),
                            )}
                          >
                            <span className="size-1.5 rounded-full bg-current opacity-70" />
                            {employee.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="pr-6 text-right">
                          <div className="flex items-center justify-end gap-1 opacity-100 sm:opacity-0 sm:transition-opacity sm:group-hover:opacity-100 sm:focus-within:opacity-100">
                            <Button
                              size="icon-sm"
                              variant="ghost"
                              className="hidden text-muted-foreground sm:inline-flex"
                              render={<Link href={`/employees/${employee.id}`} />}
                            >
                              <UserRound className="size-4" />
                            </Button>
                            <Button
                              size="icon-sm"
                              variant="ghost"
                              className="hidden text-muted-foreground sm:inline-flex"
                              onClick={() => setEditEmployee(employee)}
                            >
                              <Pencil className="size-4" />
                            </Button>
                            <DropdownMenu>
                              <DropdownMenuTrigger
                                render={
                                  <Button
                                    aria-label={`Open actions for ${employee.name}`}
                                    className="size-8 text-muted-foreground"
                                    size="icon-sm"
                                    variant="ghost"
                                  />
                                }
                              >
                                <MoreHorizontal className="size-4" />
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="min-w-44">
                                <DropdownMenuItem
                                  onClick={() =>
                                    router.push(`/employees/${employee.id}`)
                                  }
                                >
                                  <UserRound className="size-4" />
                                  View profile
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => setEditEmployee(employee)}
                                >
                                  <Pencil className="size-4" />
                                  Edit employee
                                </DropdownMenuItem>
                                {employee.status !== "inactive" ? (
                                  <DropdownMenuItem
                                    onClick={() =>
                                      runAction(
                                        deactivateEmployeeAction,
                                        employee.id,
                                        `${employee.name} deactivated`,
                                      )
                                    }
                                  >
                                    <UserX className="size-4" />
                                    Deactivate
                                  </DropdownMenuItem>
                                ) : null}
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  variant="destructive"
                                  onClick={() => setDeleteEmployee(employee)}
                                >
                                  <Trash2 className="size-4" />
                                  Delete employee
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {totalPages > 1 ? (
                <div className="flex flex-col items-center justify-between gap-3 border-t px-6 py-4 sm:flex-row">
                  <p className="text-sm text-muted-foreground">
                    Showing {pageStart + 1}–
                    {Math.min(pageStart + PAGE_SIZE, filtered.length)} of{" "}
                    {filtered.length}
                  </p>
                  <Pagination className="mx-0 w-auto">
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious
                          href="#"
                          onClick={(event) => {
                            event.preventDefault();
                            setPage((p) => Math.max(1, p - 1));
                          }}
                          className={
                            currentPage <= 1 ? "pointer-events-none opacity-50" : ""
                          }
                        />
                      </PaginationItem>
                      <PaginationItem>
                        <span className="px-2 text-sm tabular-nums text-muted-foreground">
                          Page {currentPage} of {totalPages}
                        </span>
                      </PaginationItem>
                      <PaginationItem>
                        <PaginationNext
                          href="#"
                          onClick={(event) => {
                            event.preventDefault();
                            setPage((p) => Math.min(totalPages, p + 1));
                          }}
                          className={
                            currentPage >= totalPages
                              ? "pointer-events-none opacity-50"
                              : ""
                          }
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>
              ) : null}
            </>
          ) : (
            <EmptyState
              hasFilters={hasActiveFilters}
              onClear={clearFilters}
              onAdd={() => setCreateOpen(true)}
            />
          )}
        </CardContent>
      </Card>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-h-[90vh] gap-0 overflow-hidden p-0 sm:max-w-2xl">
          <DialogHeader className="border-b bg-muted/20 px-6 py-5">
            <div className="flex items-start gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <UserPlus className="size-5" />
              </div>
              <div className="space-y-1 text-left">
                <DialogTitle>Add employee</DialogTitle>
                <DialogDescription>
                  Creates an account, team membership, and employee profile in one
                  step.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <div className="max-h-[calc(90vh-5.5rem)] overflow-y-auto px-6 py-5">
            <CreateEmployeeForm
              key={`create-${employeeCodeConfig.suggestedCode}`}
              sites={sites}
              shifts={shifts}
              orgConfig={orgConfig}
              vendors={vendors}
              employeeCodeConfig={employeeCodeConfig}
              redirectOnSuccess={false}
              onSuccess={() => {
                setCreateOpen(false);
                toast.success("Employee created");
              }}
            />
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(editEmployee)}
        onOpenChange={(open) => {
          if (!open) setEditEmployee(null);
        }}
      >
        <DialogContent className="max-h-[90vh] gap-0 overflow-hidden p-0 sm:max-w-2xl">
          <DialogHeader className="border-b bg-muted/20 px-6 py-5">
            <div className="flex items-start gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Pencil className="size-5" />
              </div>
              <div className="space-y-1 text-left">
                <DialogTitle>Edit employee</DialogTitle>
                <DialogDescription>
                  Update profile details for {editEmployee?.name}.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <div className="max-h-[calc(90vh-5.5rem)] overflow-y-auto px-6 py-5">
            {editEmployee ? (
              <EditEmployeeForm
                key={editEmployee.id}
                employee={editEmployee}
                sites={sites}
                shifts={shifts}
                orgConfig={orgConfig}
                vendors={vendors}
                showExtendedFields={false}
                onSuccess={() => {
                  setEditEmployee(null);
                  toast.success("Employee updated");
                }}
              />
            ) : null}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(deleteEmployee)}
        onOpenChange={(open) => {
          if (!open) setDeleteEmployee(null);
        }}
      >
        <DialogContent className="sm:max-w-md" showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Delete employee?</DialogTitle>
            <DialogDescription>
              This removes {deleteEmployee?.name} from the company directory and team
              membership. The auth user is deleted only if they have no other company
              memberships.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              disabled={pending}
              onClick={() => setDeleteEmployee(null)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={pending || !deleteEmployee}
              onClick={() => {
                if (!deleteEmployee) return;
                runAction(
                  deleteEmployeeAction,
                  deleteEmployee.id,
                  `${deleteEmployee.name} deleted`,
                );
              }}
            >
              {pending ? "Deleting…" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function FilterPills<T extends string>({
  label,
  value,
  options,
  counts,
  onChange,
}: {
  label: string;
  value: T;
  options: readonly T[];
  counts: Record<string, number>;
  onChange: (value: T) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="mr-0.5 text-xs font-medium text-muted-foreground">{label}</span>
      {options.map((option) => {
        const count =
          option === "All" ? Object.values(counts).reduce((a, b) => a + b, 0) : counts[option] ?? 0;
        const active = value === option;
        return (
          <Button
            key={option}
            type="button"
            size="sm"
            variant={active ? "secondary" : "ghost"}
            className={cn(
              "h-8 gap-1.5 rounded-full px-3 capitalize",
              active && "ring-1 ring-border",
            )}
            onClick={() => onChange(option)}
          >
            {option}
            <span
              className={cn(
                "rounded-full px-1.5 py-0.5 text-[10px] tabular-nums",
                active ? "bg-background/80" : "bg-muted",
              )}
            >
              {count}
            </span>
          </Button>
        );
      })}
    </div>
  );
}

function EmptyState({
  hasFilters,
  onClear,
  onAdd,
}: {
  hasFilters: boolean;
  onClear: () => void;
  onAdd: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      <div className="flex size-14 items-center justify-center rounded-2xl bg-muted/60 text-muted-foreground">
        {hasFilters ? (
          <Search className="size-6" />
        ) : (
          <Briefcase className="size-6" />
        )}
      </div>
      <h3 className="mt-4 text-base font-medium">
        {hasFilters ? "No matches found" : "No employees yet"}
      </h3>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">
        {hasFilters
          ? "Try adjusting your search or filters to find who you are looking for."
          : "Add your first team member to start managing profiles, attendance, and payroll."}
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
        {hasFilters ? (
          <Button variant="outline" onClick={onClear}>
            Clear filters
          </Button>
        ) : null}
        <Button onClick={onAdd}>
          <Plus className="size-4" />
          Add employee
        </Button>
      </div>
    </div>
  );
}
