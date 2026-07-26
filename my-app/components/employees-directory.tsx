"use client";

import Link from "next/link";
import type { ComponentType } from "react";
import { useMemo, useRef, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Briefcase,
  Building2,
  Contact,
  Mail,
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
import { Input } from "@/components/ui/input";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
const PAGE_SIZE_OPTIONS = [10, 20, 50] as const;

type StatusFilter = (typeof STATUS_FILTERS)[number];
type TypeFilter = (typeof TYPE_FILTERS)[number];

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
  return "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-300";
}

function getVisiblePages(
  current: number,
  total: number,
): Array<number | "ellipsis"> {
  if (total <= 5) {
    return Array.from({ length: total }, (_, index) => index + 1);
  }

  const pages: Array<number | "ellipsis"> = [1];

  if (current > 3) {
    pages.push("ellipsis");
  }

  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);

  for (let page = start; page <= end; page += 1) {
    pages.push(page);
  }

  if (current < total - 2) {
    pages.push("ellipsis");
  }

  if (total > 1) {
    pages.push(total);
  }

  return pages;
}

function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "blue",
  active = false,
  onClick,
}: {
  label: string;
  value: number | string;
  hint: string;
  icon: ComponentType<{ className?: string }>;
  tone?: "blue" | "emerald" | "amber" | "indigo";
  active?: boolean;
  onClick?: () => void;
}) {
  const toneClass = {
    blue: "border-blue-200/80 bg-blue-50 text-blue-600 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-400",
    emerald:
      "border-emerald-200/80 bg-emerald-50 text-emerald-600 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-400",
    amber:
      "border-amber-200/80 bg-amber-50 text-amber-600 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-400",
    indigo:
      "border-indigo-200/80 bg-indigo-50 text-indigo-600 dark:border-indigo-500/30 dark:bg-indigo-500/10 dark:text-indigo-400",
  }[tone];

  const card = (
    <Card
      size="sm"
      className={cn(
        "shadow-xs transition-colors",
        onClick && "cursor-pointer hover:bg-accent/20",
        active && "ring-2 ring-primary/40",
      )}
    >
      <CardContent className="flex items-center gap-3 py-3">
        <div
          className={cn(
            "flex size-8 shrink-0 items-center justify-center rounded-lg border",
            toneClass,
          )}
        >
          <Icon className="size-3.5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            {label}
          </p>
          <p className="text-xl font-bold tabular-nums leading-tight">{value}</p>
          <p className="truncate text-[11px] text-muted-foreground">{hint}</p>
        </div>
      </CardContent>
    </Card>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="block h-full w-full rounded-xl text-left outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
      >
        {card}
      </button>
    );
  }

  return card;
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

  return rows.filter((row) => row.count > 0);
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
    <Card size="sm" className={cn("flex h-full flex-col shadow-xs", className)}>
      <CardHeader className="flex-row items-center gap-2 space-y-0 border-b px-3 py-2.5">
        <div className="flex size-7 shrink-0 items-center justify-center rounded-md border border-indigo-500/20 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
          <Icon className="size-3.5" />
        </div>
        <CardTitle className="min-w-0 flex-1 truncate text-sm">{title}</CardTitle>
        <Badge variant="outline" className="shrink-0 px-1.5 py-0 text-[10px] tabular-nums">
          {total}
        </Badge>
      </CardHeader>
      <CardContent className="px-3 py-2.5">
        {rows.length === 0 ? (
          <p className="text-xs text-muted-foreground">{emptyMessage}</p>
        ) : (
          <ul className="max-h-28 space-y-2 overflow-y-auto pr-0.5">
            {rows.map((row) => (
              <li key={row.label} className="space-y-1">
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="truncate font-medium">{row.label}</span>
                  <span className="shrink-0 tabular-nums text-muted-foreground">
                    {row.count}
                  </span>
                </div>
                <div className="h-1 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-indigo-500/70 dark:bg-indigo-400/80"
                    style={{ width: `${(row.count / maxCount) * 100}%` }}
                  />
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
  const searchParams = useSearchParams();
  const listRef = useRef<HTMLDivElement>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [editEmployee, setEditEmployee] = useState<EmployeeMembership | null>(
    null,
  );
  const [deleteEmployee, setDeleteEmployee] = useState<EmployeeMembership | null>(
    null,
  );
  const [pending, startTransition] = useTransition();

  const search = searchParams.get("q") ?? "";
  const statusFilter = (STATUS_FILTERS.includes(
    (searchParams.get("status") ?? "All") as StatusFilter,
  )
    ? (searchParams.get("status") ?? "All")
    : "All") as StatusFilter;
  const typeFilter = (TYPE_FILTERS.includes(
    (searchParams.get("type") ?? "All") as TypeFilter,
  )
    ? (searchParams.get("type") ?? "All")
    : "All") as TypeFilter;
  const pageSize = PAGE_SIZE_OPTIONS.includes(
    Number(searchParams.get("size")) as (typeof PAGE_SIZE_OPTIONS)[number],
  )
    ? Number(searchParams.get("size"))
    : 20;
  const page = Math.max(1, Number(searchParams.get("page")) || 1);

  function updateQuery(
    updates: Record<string, string | number | null | undefined>,
    options?: { scrollToList?: boolean },
  ) {
    const params = new URLSearchParams(searchParams.toString());

    for (const [key, value] of Object.entries(updates)) {
      if (
        value == null ||
        value === "" ||
        value === "All" ||
        (key === "page" && Number(value) <= 1) ||
        (key === "size" && Number(value) === 20)
      ) {
        params.delete(key);
      } else {
        params.set(key, String(value));
      }
    }

    const query = params.toString();
    router.replace(query ? `/employees?${query}` : "/employees", {
      scroll: false,
    });

    if (options?.scrollToList) {
      requestAnimationFrame(() => {
        listRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }
  }

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
      buildActiveBreakdown(employees, "department", orgConfig.departments),
    [employees, orgConfig.departments],
  );

  const designationBreakdown = useMemo(
    () =>
      buildActiveBreakdown(employees, "designation", orgConfig.designations),
    [employees, orgConfig.designations],
  );

  const employmentTypeBreakdown = useMemo(() => {
    const active = employees.filter((employee) => employee.status === "active");
    const counts = new Map<string, number>();
    const commonTypes = ["Permanent", "3PL", "Intern", "Consultant"];

    for (const type of commonTypes) {
      counts.set(type, 0);
    }

    for (const employee of active) {
      const type = employee.employmentType || "Permanent";
      counts.set(type, (counts.get(type) ?? 0) + 1);
    }

    return Array.from(counts.entries())
      .map(([label, count]) => ({ label, count }))
      .filter((row) => row.count > 0)
      .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
  }, [employees]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return employees.filter((employee) => {
      if (statusFilter !== "All" && employee.status !== statusFilter) {
        return false;
      }
      if (typeFilter !== "All" && employee.employmentType !== typeFilter) {
        return false;
      }
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

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageStart = (currentPage - 1) * pageSize;
  const pageRows = filtered.slice(pageStart, pageStart + pageSize);
  const visiblePages = getVisiblePages(currentPage, totalPages);

  const hasActiveFilters =
    search.trim().length > 0 || statusFilter !== "All" || typeFilter !== "All";

  function clearFilters() {
    updateQuery({
      q: null,
      status: null,
      type: null,
      page: null,
    });
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
      ? `${employees.length} / ${maxEmployees} seats used`
      : `${employees.length} on roster`;

  return (
    <>
      <div className="grid grid-cols-1 gap-3">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard
            label="Workforce"
            value={employees.length}
            hint={seatLabel}
            icon={Users}
            tone="blue"
            onClick={() => {
              clearFilters();
              updateQuery({}, { scrollToList: true });
            }}
            active={!hasActiveFilters}
          />
          <StatCard
            label="Active"
            value={stats.active}
            hint="Enabled accounts"
            icon={UserCheck}
            tone="emerald"
            active={statusFilter === "active"}
            onClick={() => {
              updateQuery(
                {
                  status: statusFilter === "active" ? null : "active",
                  page: null,
                },
                { scrollToList: true },
              );
            }}
          />
          <StatCard
            label="Pending"
            value={stats.inactive + stats.invited}
            hint={`${stats.inactive} inactive · ${stats.invited} invited`}
            icon={UserX}
            tone="amber"
            active={statusFilter === "inactive" || statusFilter === "invited"}
            onClick={() => {
              updateQuery(
                {
                  status:
                    statusFilter === "inactive" ? "invited" : "inactive",
                  page: null,
                },
                { scrollToList: true },
              );
            }}
          />
          <StatCard
            label="Departments"
            value={stats.departments}
            hint={`${stats.threePl} on 3PL`}
            icon={Building2}
            tone="indigo"
          />
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <BreakdownWidget
            title="By employment type"
            icon={Briefcase}
            rows={employmentTypeBreakdown}
            emptyMessage="No active employees."
          />
          <BreakdownWidget
            title="By department"
            icon={Building2}
            rows={departmentBreakdown}
            emptyMessage="No active employees."
          />
          <BreakdownWidget
            title="By designation"
            icon={Contact}
            rows={designationBreakdown}
            emptyMessage="No active employees."
          />
        </div>
      </div>

      <div ref={listRef} className="scroll-mt-24">
      <Card className="overflow-hidden shadow-xs">
        <CardHeader className="gap-4 border-b bg-muted/15 pb-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-1">
              <CardTitle className="text-xl">People directory</CardTitle>
              <CardDescription>
                Search, filter, and open profiles. {filtered.length} result
                {filtered.length === 1 ? "" : "s"}
                {hasActiveFilters ? ` of ${employees.length}` : ""}.
              </CardDescription>
            </div>
            <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center lg:w-auto">
              <div className="relative w-full sm:w-72">
                <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="h-10 pl-9"
                  placeholder="Search name, email, code…"
                  value={search}
                  onChange={(event) => {
                    updateQuery({
                      q: event.target.value || null,
                      page: null,
                    });
                  }}
                />
              </div>
              <Button
                className="h-10 shrink-0 shadow-xs"
                onClick={() => setCreateOpen(true)}
              >
                <UserPlus className="size-4" />
                Add employee
              </Button>
            </div>
          </div>

          <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-slate-900/40 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <FilterPills
                label="Status"
                value={statusFilter}
                options={STATUS_FILTERS}
                counts={employees.reduce<Record<string, number>>((acc, employee) => {
                  acc[employee.status] = (acc[employee.status] || 0) + 1;
                  return acc;
                }, {})}
                onChange={(value) => {
                  updateQuery({ status: value === "All" ? null : value, page: null });
                }}
              />
              <span className="hidden h-4 w-px bg-border sm:block" aria-hidden />
              <FilterPills
                label="Type"
                value={typeFilter}
                options={TYPE_FILTERS}
                counts={employees.reduce<Record<string, number>>((acc, employee) => {
                  const key = employee.employmentType || "Permanent";
                  acc[key] = (acc[key] || 0) + 1;
                  return acc;
                }, {})}
                onChange={(value) => {
                  updateQuery({ type: value === "All" ? null : value, page: null });
                }}
              />
              {hasActiveFilters ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 gap-1 text-muted-foreground"
                  onClick={clearFilters}
                >
                  <X className="size-3.5" />
                  Clear
                </Button>
              ) : null}
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {pageRows.length > 0 ? (
            <>
              <div className="overflow-x-auto [&_[data-slot=table-container]]:rounded-none [&_[data-slot=table-container]]:border-0">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="pl-6">Employee</TableHead>
                      <TableHead>Code</TableHead>
                      <TableHead>Role & type</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="pr-6 text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pageRows.map((employee) => (
                      <TableRow key={employee.id} className="group">
                        <TableCell className="pl-6 py-3.5">
                          <div className="flex items-center gap-3">
                            <Avatar className="size-10 ring-1 ring-border/60">
                              <AvatarFallback className="bg-primary/10 text-sm font-semibold text-primary">
                                {getInitials(employee.name)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <Link
                                href={`/employees/${employee.id}`}
                                className="block truncate font-semibold transition-colors hover:text-primary"
                              >
                                {employee.name}
                              </Link>
                              <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-muted-foreground">
                                <Mail className="size-3 shrink-0" />
                                {employee.email}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <code className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-xs text-muted-foreground">
                            {employee.employeeCode || "—"}
                          </code>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col items-start gap-1.5">
                            <span className="truncate text-sm font-medium">
                              {employee.designation || "—"}
                            </span>
                            <Badge
                              variant="outline"
                              className={cn(
                                "text-[10px] font-medium",
                                typeBadgeClass(employee.employmentType || "Permanent"),
                              )}
                            >
                              {employee.employmentType || "Permanent"}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground">
                            {employee.department || "Unassigned"}
                          </span>
                        </TableCell>
                        <TableCell>
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

              <div className="flex flex-col gap-4 border-t bg-muted/10 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
                  <p className="text-sm text-muted-foreground">
                    Showing{" "}
                    <span className="font-medium text-foreground">
                      {pageStart + 1}–
                      {Math.min(pageStart + pageSize, filtered.length)}
                    </span>{" "}
                    of{" "}
                    <span className="font-medium text-foreground">
                      {filtered.length}
                    </span>
                  </p>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Rows</span>
                    <Select
                      value={String(pageSize)}
                      onValueChange={(value) => {
                        if (!value) return;
                        updateQuery({
                          size: Number(value) === 20 ? null : Number(value),
                          page: null,
                        });
                      }}
                    >
                      <SelectTrigger className="h-8 w-[4.5rem]" size="sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent align="start">
                        {PAGE_SIZE_OPTIONS.map((option) => (
                          <SelectItem key={option} value={String(option)}>
                            {option}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Pagination className="mx-0 w-auto justify-start lg:justify-end">
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious
                        href="#"
                        onClick={(event) => {
                          event.preventDefault();
                          if (currentPage <= 1) return;
                          updateQuery({ page: currentPage - 1 });
                        }}
                        className={
                          currentPage <= 1 ? "pointer-events-none opacity-50" : ""
                        }
                      />
                    </PaginationItem>

                    {visiblePages.map((pageNumber, index) =>
                      pageNumber === "ellipsis" ? (
                        <PaginationItem key={`ellipsis-${index}`}>
                          <PaginationEllipsis />
                        </PaginationItem>
                      ) : (
                        <PaginationItem key={pageNumber}>
                          <PaginationLink
                            href="#"
                            isActive={pageNumber === currentPage}
                            onClick={(event) => {
                              event.preventDefault();
                              updateQuery({ page: pageNumber });
                            }}
                          >
                            {pageNumber}
                          </PaginationLink>
                        </PaginationItem>
                      ),
                    )}

                    <PaginationItem>
                      <PaginationNext
                        href="#"
                        onClick={(event) => {
                          event.preventDefault();
                          if (currentPage >= totalPages) return;
                          updateQuery({ page: currentPage + 1 });
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
      </div>

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
      <span className="mr-0.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      {options.map((option) => {
        const count =
          option === "All"
            ? Object.values(counts).reduce((a, b) => a + b, 0)
            : (counts[option] ?? 0);
        const active = value === option;
        return (
          <Button
            key={option}
            type="button"
            size="sm"
            variant={active ? "secondary" : "ghost"}
            className={cn(
              "h-8 gap-1.5 rounded-full px-3 capitalize",
              active && "bg-white shadow-xs ring-1 ring-border dark:bg-slate-800",
            )}
            onClick={() => onChange(option)}
          >
            {option}
            <span
              className={cn(
                "rounded-full px-1.5 py-0.5 text-[10px] tabular-nums",
                active ? "bg-muted" : "bg-muted/60",
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
      <div className="flex size-14 items-center justify-center rounded-2xl border border-dashed bg-muted/40 text-muted-foreground">
        {hasFilters ? (
          <Search className="size-6" />
        ) : (
          <Briefcase className="size-6" />
        )}
      </div>
      <h3 className="mt-4 text-base font-semibold">
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
