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
import { exportShiftRosterRegisterCsvAction } from "@/lib/appwrite/phase1-actions";
import type { WorkShift } from "@/lib/appwrite/types";
import { getVisiblePages } from "@/lib/pagination-ui";
import type { ShiftRosterEmployeeRow } from "@/lib/shift-roster-register";
import {
  SHIFT_ROSTER_REGISTER_PAGE_SIZE,
  SHIFT_ROSTER_REGISTER_PAGE_SIZE_OPTIONS,
  shiftTypeCellClass,
} from "@/lib/shift-roster-register";
import { cn } from "@/lib/utils";

const STICKY_COLUMNS = [
  { key: "code", label: "Code", width: "5.5rem", left: "0rem" },
  { key: "name", label: "Name", width: "9rem", left: "5.5rem" },
  { key: "designation", label: "Designation", width: "8rem", left: "14.5rem" },
] as const;

export type ShiftRosterMonthlyFilters = {
  month: string;
  search: string;
  department: string;
  branch: string;
  designation: string;
  sort: "code" | "name";
};

function buildQuery(
  pathname: string,
  filters: ShiftRosterMonthlyFilters,
  page = 1,
  pageSize = SHIFT_ROSTER_REGISTER_PAGE_SIZE,
) {
  const params = new URLSearchParams();
  params.set("month", filters.month);
  if (filters.search) params.set("q", filters.search);
  if (filters.department) params.set("department", filters.department);
  if (filters.branch) params.set("branch", filters.branch);
  if (filters.designation) params.set("designation", filters.designation);
  if (filters.sort !== "code") params.set("sort", filters.sort);
  if (page > 1) params.set("page", String(page));
  if (pageSize !== SHIFT_ROSTER_REGISTER_PAGE_SIZE) params.set("size", String(pageSize));
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

function rowStickyValue(row: ShiftRosterEmployeeRow, key: (typeof STICKY_COLUMNS)[number]["key"]) {
  switch (key) {
    case "code":
      return row.employeeCode || "—";
    case "name":
      return row.employeeName;
    case "designation":
      return row.designation || "—";
    default:
      return "";
  }
}

function shiftCellClass(label: string, styleByCode: Map<string, string>) {
  if (!label) return "bg-transparent text-muted-foreground/40";
  const primary = label.split("+")[0]?.trim().toUpperCase() || "";
  return styleByCode.get(primary) || "bg-muted text-muted-foreground";
}

export function ShiftRosterMonthlyGrid({
  register,
  filters,
  filterOptions,
  shifts,
}: {
  register: {
    month: string;
    daysInMonth: number;
    monthDays: string[];
    rows: ShiftRosterEmployeeRow[];
    total: number;
    page: number;
    pageSize: number;
    shiftCodes: string[];
  };
  filters: ShiftRosterMonthlyFilters;
  filterOptions: {
    departments: string[];
    designations: string[];
    branches: { id: string; name: string }[];
  };
  shifts: WorkShift[];
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

  const styleByCode = useMemo(() => {
    const styles = new Map<string, string>();
    for (const shift of shifts) {
      if (shift.status !== "active") continue;
      styles.set(shift.code.trim().toUpperCase(), shiftTypeCellClass(shift.shiftType));
    }
    return styles;
  }, [shifts]);

  const emptyColSpan = dayLabels.length + STICKY_COLUMNS.length + 2;

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

  function applyFilters(next: ShiftRosterMonthlyFilters) {
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

  function resetFilters() {
    const reset: ShiftRosterMonthlyFilters = {
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
      const result = await exportShiftRosterRegisterCsvAction({
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
      anchor.download = `shift-roster-${result.month}.csv`;
      anchor.click();
      URL.revokeObjectURL(url);
      toast.success(`Exported ${result.rowCount} employees`);
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-muted/20 px-4 py-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Shift roster views
          </p>
          <p className="text-sm font-medium">{filters.month}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="outline"
            nativeButton={false}
            render={<Link href="/shifts/roster" />}
          >
            Assignments
          </Button>
          <Button size="sm" variant="secondary" disabled>
            Monthly matrix
          </Button>
        </div>
      </div>

      {register.shiftCodes.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          {register.shiftCodes.map((code) => (
            <span
              key={code}
              className={cn(
                "inline-flex min-h-6 items-center rounded px-1.5 py-0.5 font-medium tabular-nums",
                shiftCellClass(code, styleByCode),
              )}
            >
              {code}
            </span>
          ))}
          <span className="hidden sm:inline">
            — scheduled shift codes · multi-shift days show as DAY+NIGHT
          </span>
        </div>
      ) : null}

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
            onSubmit={(event) => {
              event.preventDefault();
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
                  onChange={(event) => setDraft((state) => ({ ...state, month: event.target.value }))}
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
                    placeholder="Code, name, designation…"
                    value={draft.search}
                    onChange={(event) =>
                      setDraft((state) => ({ ...state, search: event.target.value }))
                    }
                  />
                </InputGroup>
              </div>
              <div className="flex gap-2">
                <Button type="submit" size="sm" disabled={pending} className="min-w-20">
                  {pending ? "…" : "Apply"}
                </Button>
                <Button type="button" size="sm" variant="outline" disabled={pending} onClick={resetFilters}>
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
                  onValueChange={(department) => setDraft((state) => ({ ...state, department }))}
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
                  onValueChange={(branch) => setDraft((state) => ({ ...state, branch }))}
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
                  onValueChange={(designation) =>
                    setDraft((state) => ({ ...state, designation }))
                  }
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
                    setDraft((state) => ({
                      ...state,
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
                </div>
              ) : null}
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Monthly shift matrix — {filters.month}</CardTitle>
          <CardAction className="text-muted-foreground text-xs tabular-nums">
            {rangeStart}-{rangeEnd} of {register.total} employees
          </CardAction>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-muted-foreground text-xs">
              Each cell shows the scheduled shift code for that employee and date. Import or assign
              roster entries from the assignments view.
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
            <table className="w-max min-w-full border-collapse text-[10px]">
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
                      className="min-w-9 px-0.5 py-2 text-center font-medium tabular-nums"
                    >
                      {day}
                    </th>
                  ))}
                  <th className="min-w-10 border-l px-1 py-2 text-center font-medium">Days</th>
                  <th className="min-w-10 px-1 py-2 text-center font-medium">Slots</th>
                </tr>
              </thead>
              <tbody>
                {register.rows.length === 0 ? (
                  <tr>
                    <td colSpan={emptyColSpan} className="px-4 py-12 text-center text-muted-foreground">
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
                      {row.days.map((label, index) => (
                        <td key={`${row.employeeId}-${index}`} className="p-0.5 text-center">
                          <span
                            title={`${register.monthDays[index]} — ${label || "No shift scheduled"}`}
                            className={cn(
                              "inline-flex min-h-7 min-w-9 max-w-14 items-center justify-center rounded px-0.5 py-0.5 text-[9px] leading-tight font-semibold",
                              shiftCellClass(label, styleByCode),
                            )}
                          >
                            {label || "·"}
                          </span>
                        </td>
                      ))}
                      <td className="border-l px-1 py-1.5 text-center tabular-nums">
                        {row.summary.scheduledDays}
                      </td>
                      <td className="px-1 py-1.5 text-center tabular-nums">
                        {row.summary.shiftSlots}
                      </td>
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
                    <SelectTrigger className="h-8 w-18" size="sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent align="start">
                      {SHIFT_ROSTER_REGISTER_PAGE_SIZE_OPTIONS.map((option) => (
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
                        href={buildQuery(pathname, filters, register.page - 1, register.pageSize)}
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
                            href={buildQuery(pathname, filters, pageNumber, register.pageSize)}
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
                        href={buildQuery(pathname, filters, register.page + 1, register.pageSize)}
                        className={
                          register.page >= totalPages ? "pointer-events-none opacity-50" : undefined
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
