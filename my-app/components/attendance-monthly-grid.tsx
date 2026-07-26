"use client";

import { useEffect, useMemo, useState, useTransition, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Download, Search, X } from "lucide-react";
import { toast } from "sonner";

import { FilterSelect } from "@/components/form-fields";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { Label } from "@/components/ui/label";
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
import { exportAttendanceRegisterCsvAction } from "@/lib/appwrite/phase1-actions";
import type { RegisterCellCode, RegisterEmployeeRow } from "@/lib/attendance-register";
import { REGISTER_PAGE_SIZE, REGISTER_PAGE_SIZE_OPTIONS } from "@/lib/attendance-register";
import { getVisiblePages } from "@/lib/pagination-ui";
import { cn } from "@/lib/utils";

const STICKY_COLUMNS = [
  { key: "code", label: "Code", width: "5.5rem", left: "0rem" },
  { key: "name", label: "Name", width: "8.5rem", left: "5.5rem" },
  { key: "department", label: "Department", width: "7rem", left: "14rem" },
  { key: "designation", label: "Designation", width: "7rem", left: "21rem" },
  { key: "employmentType", label: "Employment", width: "6.5rem", left: "28rem" },
] as const;

export type MonthlyRegisterFilters = {
  month: string;
  search: string;
  department: string;
  branch: string;
  designation: string;
  sort: "code" | "name";
};

const CELL_STYLES: Record<RegisterCellCode, string> = {
  P: "bg-emerald-100 text-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-200",
  LT: "bg-yellow-100 text-yellow-900 dark:bg-yellow-950/60 dark:text-yellow-200",
  E: "bg-orange-100 text-orange-900 dark:bg-orange-950/60 dark:text-orange-200",
  HD: "bg-amber-100 text-amber-900 dark:bg-amber-950/60 dark:text-amber-200",
  AB: "bg-red-100 text-red-900 dark:bg-red-950/60 dark:text-red-200",
  L: "bg-blue-100 text-blue-900 dark:bg-blue-950/60 dark:text-blue-200",
  OFF: "bg-muted text-muted-foreground",
  "": "text-muted-foreground/40",
};

const LEGEND: { code: RegisterCellCode; label: string }[] = [
  { code: "P", label: "Present" },
  { code: "LT", label: "Late" },
  { code: "E", label: "Early out" },
  { code: "HD", label: "Half day" },
  { code: "AB", label: "Absent" },
  { code: "L", label: "Leave" },
  { code: "OFF", label: "Weekly off / Holiday" },
];

function buildQuery(
  pathname: string,
  filters: MonthlyRegisterFilters,
  page = 1,
  pageSize = REGISTER_PAGE_SIZE,
) {
  const params = new URLSearchParams();
  params.set("month", filters.month);
  if (filters.search) params.set("q", filters.search);
  if (filters.department) params.set("department", filters.department);
  if (filters.branch) params.set("branch", filters.branch);
  if (filters.designation) params.set("designation", filters.designation);
  if (filters.sort !== "code") params.set("sort", filters.sort);
  if (page > 1) params.set("page", String(page));
  if (pageSize !== REGISTER_PAGE_SIZE) params.set("size", String(pageSize));
  return `${pathname}?${params.toString()}`;
}

function stickyCellStyle(column: (typeof STICKY_COLUMNS)[number], isHeader = false) {
  return {
    width: column.width,
    minWidth: column.width,
    maxWidth: column.width,
    left: column.left,
    zIndex: isHeader ? 20 : 10,
  };
}

function RegisterStickyCell({
  column,
  isHeader,
  className,
  children,
}: {
  column: (typeof STICKY_COLUMNS)[number];
  isHeader?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <td
      className={cn(
        "sticky border-r px-2 py-1.5",
        isHeader ? "bg-muted/95 py-2 font-medium" : "bg-background",
        className,
      )}
      style={stickyCellStyle(column, isHeader)}
    >
      {children}
    </td>
  );
}

function rowStickyValue(row: RegisterEmployeeRow, key: (typeof STICKY_COLUMNS)[number]["key"]) {
  switch (key) {
    case "code":
      return row.employeeCode;
    case "name":
      return row.employeeName;
    case "department":
      return row.department || "—";
    case "designation":
      return row.designation || "—";
    case "employmentType":
      return row.employmentType || "—";
    default:
      return "";
  }
}

export function AttendanceMonthlyGrid({
  register,
  filters,
  filterOptions,
}: {
  register: {
    month: string;
    daysInMonth: number;
    monthDays: string[];
    rows: RegisterEmployeeRow[];
    total: number;
    page: number;
    pageSize: number;
  };
  filters: MonthlyRegisterFilters;
  filterOptions: {
    departments: string[];
    designations: string[];
    branches: { id: string; name: string }[];
  };
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();
  const [draft, setDraft] = useState(filters);

  useEffect(() => {
    setDraft(filters);
  }, [filters]);

  const totalPages = Math.max(1, Math.ceil(register.total / register.pageSize));
  const visiblePages = getVisiblePages(register.page, totalPages);
  const rangeStart =
    register.total === 0 ? 0 : (register.page - 1) * register.pageSize + 1;
  const rangeEnd = Math.min(register.page * register.pageSize, register.total);

  const dayLabels = useMemo(
    () => register.monthDays.map((dateIso) => Number(dateIso.slice(-2))),
    [register.monthDays],
  );

  const emptyColSpan = dayLabels.length + STICKY_COLUMNS.length + 7;

  function applyFilters(next: MonthlyRegisterFilters) {
    startTransition(() => {
      router.push(buildQuery(pathname, next, 1, register.pageSize));
    });
  }

  function goToPage(page: number) {
    startTransition(() => {
      router.push(buildQuery(pathname, filters, page, register.pageSize));
    });
  }

  function setPageSize(size: number) {
    startTransition(() => {
      router.push(buildQuery(pathname, filters, 1, size));
    });
  }

  const hasActiveFilters =
    filters.search.trim().length > 0 ||
    Boolean(filters.department) ||
    Boolean(filters.branch) ||
    Boolean(filters.designation) ||
    filters.sort !== "code";

  const branchLabel = useMemo(() => {
    if (!filters.branch) return "";
    return filterOptions.branches.find((site) => site.id === filters.branch)?.name ?? filters.branch;
  }, [filterOptions.branches, filters.branch]);

  function resetFilters() {
    const reset: MonthlyRegisterFilters = {
      month: draft.month,
      search: "",
      department: "",
      branch: "",
      designation: "",
      sort: "code",
    };
    setDraft(reset);
    applyFilters(reset);
  }

  function exportCsv() {
    startTransition(async () => {
      const result = await exportAttendanceRegisterCsvAction({
        month: filters.month,
        search: filters.search || undefined,
        department: filters.department || undefined,
        branch: filters.branch || undefined,
        designation: filters.designation || undefined,
        sort: filters.sort,
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      const blob = new Blob([result.csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `attendance-register-${result.month}.csv`;
      anchor.click();
      URL.revokeObjectURL(url);
      toast.success(`Exported ${result.rowCount} employees (Excel-compatible CSV)`);
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="outline"
            nativeButton={false}
            render={<Link href="/attendance" />}
          >
            Daily log
          </Button>
          <Button size="sm" variant="secondary" disabled>
            Monthly register
          </Button>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          {LEGEND.map((item) => (
            <span
              key={item.code}
              className={cn(
                "inline-flex min-w-8 items-center justify-center rounded px-1.5 py-0.5 font-medium tabular-nums",
                CELL_STYLES[item.code],
              )}
            >
              {item.code}
            </span>
          ))}
          <span className="hidden sm:inline">— {LEGEND.map((i) => i.label).join(" · ")}</span>
        </div>
      </div>

      <Card size="sm">
        <CardHeader className="border-b pb-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle className="text-sm">Register filters</CardTitle>
              <CardDescription className="text-xs">
                {register.total} employee{register.total === 1 ? "" : "s"} · {filters.month}
              </CardDescription>
            </div>
            {hasActiveFilters ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 gap-1 text-muted-foreground"
                disabled={pending}
                onClick={resetFilters}
              >
                <X className="size-3.5" />
                Clear filters
              </Button>
            ) : null}
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 pt-4">
          <form
            className="flex flex-col gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              applyFilters(draft);
            }}
          >
            <div className="grid gap-3 md:grid-cols-[10rem_minmax(0,1fr)_auto] md:items-end">
              <div className="grid gap-1.5">
                <Label htmlFor="month">Month</Label>
                <Input
                  id="month"
                  type="month"
                  className="h-9"
                  value={draft.month}
                  onChange={(e) => setDraft((d) => ({ ...d, month: e.target.value }))}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="search">Search</Label>
                <InputGroup>
                  <InputGroupAddon align="inline-start">
                    <Search className="size-3.5" />
                  </InputGroupAddon>
                  <InputGroupInput
                    id="search"
                    placeholder="Code, name, department…"
                    value={draft.search}
                    onChange={(e) => setDraft((d) => ({ ...d, search: e.target.value }))}
                  />
                </InputGroup>
              </div>
              <div className="flex gap-2">
                <Button type="submit" size="sm" disabled={pending} className="min-w-20">
                  {pending ? "…" : "Apply"}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={pending}
                  onClick={resetFilters}
                >
                  Reset
                </Button>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-slate-900/40">
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <FilterSelect
                  id="department"
                  label="Department"
                  size="sm"
                  allLabel="All departments"
                  value={draft.department}
                  onValueChange={(department) => setDraft((d) => ({ ...d, department }))}
                  options={filterOptions.departments.map((dept) => ({
                    value: dept,
                    label: dept,
                  }))}
                />
                <FilterSelect
                  id="branch"
                  label="Branch (site)"
                  size="sm"
                  allLabel="All branches"
                  value={draft.branch}
                  onValueChange={(branch) => setDraft((d) => ({ ...d, branch }))}
                  options={filterOptions.branches.map((site) => ({
                    value: site.id,
                    label: site.name,
                  }))}
                />
                <FilterSelect
                  id="designation"
                  label="Designation"
                  size="sm"
                  allLabel="All designations"
                  value={draft.designation}
                  onValueChange={(designation) => setDraft((d) => ({ ...d, designation }))}
                  options={filterOptions.designations.map((item) => ({
                    value: item,
                    label: item,
                  }))}
                />
                <FilterSelect
                  id="sort"
                  label="Sort by"
                  size="sm"
                  value={draft.sort}
                  onValueChange={(sort) =>
                    setDraft((d) => ({
                      ...d,
                      sort: sort as "code" | "name",
                    }))
                  }
                  options={[
                    { value: "code", label: "Employee code" },
                    { value: "name", label: "Name" },
                  ]}
                />
              </div>

              {hasActiveFilters ? (
                <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-200/80 pt-3 dark:border-slate-800">
                  <span className="text-xs font-medium text-muted-foreground">Active</span>
                  {filters.search.trim() ? (
                    <Badge variant="secondary" className="font-normal">
                      Search: {filters.search.trim()}
                    </Badge>
                  ) : null}
                  {filters.department ? (
                    <Badge variant="secondary" className="font-normal">
                      Dept: {filters.department}
                    </Badge>
                  ) : null}
                  {filters.branch ? (
                    <Badge variant="secondary" className="font-normal">
                      Branch: {branchLabel}
                    </Badge>
                  ) : null}
                  {filters.designation ? (
                    <Badge variant="secondary" className="font-normal">
                      Role: {filters.designation}
                    </Badge>
                  ) : null}
                  {filters.sort !== "code" ? (
                    <Badge variant="secondary" className="font-normal">
                      Sort: Name
                    </Badge>
                  ) : null}
                </div>
              ) : null}
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">
            Monthly attendance matrix — {filters.month}
          </CardTitle>
          <CardAction className="text-muted-foreground text-xs tabular-nums">
            {rangeStart}-{rangeEnd} of {register.total} employees
          </CardAction>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-muted-foreground text-xs">
              Statuses sync from attendance punches, approved leave, holidays, and weekly offs.
            </p>
            <Button
              size="sm"
              variant="outline"
              disabled={pending || register.total === 0}
              onClick={exportCsv}
            >
              <Download className="size-4" />
              Export CSV
            </Button>
          </div>

          <div className="overflow-x-auto rounded-xl border">
            <table className="w-max min-w-full border-collapse text-xs">
              <thead>
                <tr className="border-b bg-muted/40">
                  {STICKY_COLUMNS.map((column) => (
                    <th
                      key={column.key}
                      className="sticky border-r bg-muted/95 px-2 py-2 text-left font-medium"
                      style={stickyCellStyle(column, true)}
                    >
                      {column.label}
                    </th>
                  ))}
                  {dayLabels.map((day) => (
                    <th
                      key={day}
                      className="min-w-8 px-0.5 py-2 text-center font-medium tabular-nums"
                    >
                      {day}
                    </th>
                  ))}
                  <th className="min-w-8 border-l px-1 py-2 text-center font-medium">P</th>
                  <th className="min-w-8 px-1 py-2 text-center font-medium">LT</th>
                  <th className="min-w-8 px-1 py-2 text-center font-medium">E</th>
                  <th className="min-w-8 px-1 py-2 text-center font-medium">HD</th>
                  <th className="min-w-8 px-1 py-2 text-center font-medium">AB</th>
                  <th className="min-w-8 px-1 py-2 text-center font-medium">L</th>
                  <th className="min-w-8 px-1 py-2 text-center font-medium">OFF</th>
                </tr>
              </thead>
              <tbody>
                {register.rows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={emptyColSpan}
                      className="px-4 py-12 text-center text-muted-foreground"
                    >
                      No employees match the selected filters.
                    </td>
                  </tr>
                ) : (
                  register.rows.map((row) => (
                    <tr key={row.employeeId} className="border-b last:border-b-0">
                      {STICKY_COLUMNS.map((column) => (
                        <RegisterStickyCell
                          key={column.key}
                          column={column}
                          className={cn(
                            column.key === "code" && "font-medium tabular-nums",
                            column.key !== "code" && "truncate",
                          )}
                        >
                          {rowStickyValue(row, column.key)}
                        </RegisterStickyCell>
                      ))}
                      {row.days.map((code, index) => (
                        <td key={`${row.employeeId}-${index}`} className="p-0.5 text-center">
                          <span
                            title={`${register.monthDays[index]} — ${code || "Future / no data"}`}
                            className={cn(
                              "inline-flex size-7 items-center justify-center rounded font-semibold tabular-nums",
                              CELL_STYLES[code],
                            )}
                          >
                            {code || "·"}
                          </span>
                        </td>
                      ))}
                      <td className="border-l px-1 py-1.5 text-center tabular-nums">{row.summary.P}</td>
                      <td className="px-1 py-1.5 text-center tabular-nums">{row.summary.LT}</td>
                      <td className="px-1 py-1.5 text-center tabular-nums">{row.summary.E}</td>
                      <td className="px-1 py-1.5 text-center tabular-nums">{row.summary.HD}</td>
                      <td className="px-1 py-1.5 text-center tabular-nums">{row.summary.AB}</td>
                      <td className="px-1 py-1.5 text-center tabular-nums">{row.summary.L}</td>
                      <td className="px-1 py-1.5 text-center tabular-nums">{row.summary.OFF}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {register.total > 0 ? (
            <div className="flex flex-col gap-3 border-t pt-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
                <p className="text-sm text-muted-foreground">
                  Showing{" "}
                  <span className="font-medium text-foreground tabular-nums">
                    {rangeStart}–{rangeEnd}
                  </span>{" "}
                  of{" "}
                  <span className="font-medium text-foreground tabular-nums">
                    {register.total}
                  </span>{" "}
                  employees
                </p>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Rows</span>
                  <Select
                    value={String(register.pageSize)}
                    onValueChange={(value) => {
                      if (!value) return;
                      setPageSize(Number(value));
                    }}
                  >
                    <SelectTrigger className="h-8 w-[4.5rem]" size="sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent align="start">
                      {REGISTER_PAGE_SIZE_OPTIONS.map((option) => (
                        <SelectItem key={option} value={String(option)}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {totalPages > 1 ? (
                <Pagination className="mx-0 w-auto justify-start lg:justify-end">
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious
                        href={buildQuery(
                          pathname,
                          filters,
                          register.page - 1,
                          register.pageSize,
                        )}
                        className={
                          register.page <= 1 ? "pointer-events-none opacity-50" : undefined
                        }
                        onClick={(event) => {
                          event.preventDefault();
                          if (register.page <= 1) return;
                          goToPage(register.page - 1);
                        }}
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
                            href={buildQuery(
                              pathname,
                              filters,
                              pageNumber,
                              register.pageSize,
                            )}
                            isActive={pageNumber === register.page}
                            onClick={(event) => {
                              event.preventDefault();
                              goToPage(pageNumber);
                            }}
                          >
                            {pageNumber}
                          </PaginationLink>
                        </PaginationItem>
                      ),
                    )}
                    <PaginationItem>
                      <PaginationNext
                        href={buildQuery(
                          pathname,
                          filters,
                          register.page + 1,
                          register.pageSize,
                        )}
                        className={
                          register.page >= totalPages
                            ? "pointer-events-none opacity-50"
                            : undefined
                        }
                        onClick={(event) => {
                          event.preventDefault();
                          if (register.page >= totalPages) return;
                          goToPage(register.page + 1);
                        }}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              ) : null}
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
