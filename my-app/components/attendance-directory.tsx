"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useTransition, type ComponentType } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowRight,
  Clock3,
  Download,
  Filter,
  Info,
  MapPinOff,
  Palmtree,
  Search,
  UserCheck,
  Users,
} from "lucide-react";
import { toast } from "sonner";

import { AttendanceScheduleList } from "@/components/attendance-schedule-list";
import { FilterSelect } from "@/components/form-fields";
import { RegularizationReview } from "@/components/regularization-review";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ATTENDANCE_PAGE_SIZE_OPTIONS } from "@/lib/attendance-list";
import { exportAttendanceCsvAction } from "@/lib/appwrite/phase1-actions";
import { formatMinutesShort, getVisiblePages } from "@/lib/pagination-ui";
import type {
  AttendanceRecord,
  AttendanceRegularization,
  EmployeeMembership,
  Site,
} from "@/lib/appwrite/types";
import { cn } from "@/lib/utils";

export type AttendanceFilters = {
  month: string;
  dateFrom: string;
  dateTo: string;
  status: string;
  userId: string;
  siteId: string;
  geofenceStatus: string;
  openShiftsOnly: boolean;
};

function monthBounds(month: string) {
  const [y, m] = month.split("-").map(Number);
  const last = new Date(y!, m!, 0).getDate();
  return {
    from: `${month}-01`,
    to: `${month}-${String(last).padStart(2, "0")}`,
  };
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function currentMonth() {
  return new Date().toISOString().slice(0, 7);
}

function buildAttendanceQuery(
  filters: AttendanceFilters,
  page = 1,
) {
  return {
    month: filters.dateFrom && filters.dateTo ? undefined : filters.month,
    dateFrom: filters.dateFrom || undefined,
    dateTo: filters.dateTo || undefined,
    status: filters.status || undefined,
    userId: filters.userId || undefined,
    siteId: filters.siteId || undefined,
    geofenceStatus: filters.geofenceStatus || undefined,
    openShiftsOnly: filters.openShiftsOnly,
    page,
  };
}

function buildPageHref(
  pathname: string,
  filters: AttendanceFilters,
  page: number,
  pageSize: number,
) {
  const params = new URLSearchParams();
  if (filters.month) params.set("month", filters.month);
  if (filters.dateFrom) params.set("from", filters.dateFrom);
  if (filters.dateTo) params.set("to", filters.dateTo);
  if (filters.status) params.set("status", filters.status);
  if (filters.userId) params.set("userId", filters.userId);
  if (filters.siteId) params.set("siteId", filters.siteId);
  if (filters.geofenceStatus) params.set("geofence", filters.geofenceStatus);
  if (filters.openShiftsOnly) params.set("open", "1");
  if (page > 1) params.set("page", String(page));
  if (pageSize !== 25) params.set("size", String(pageSize));
  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
}

function dateRangeLabel(filters: AttendanceFilters) {
  if (filters.dateFrom && filters.dateTo) {
    if (filters.dateFrom === filters.dateTo) return filters.dateFrom;
    return `${filters.dateFrom} → ${filters.dateTo}`;
  }
  return filters.month || "Current month";
}

export function AttendanceDirectory({
  rows,
  pagination,
  employees,
  sites,
  regularizations,
  filters,
}: {
  rows: AttendanceRecord[];
  pagination: { page: number; pageSize: number; total: number };
  employees: EmployeeMembership[];
  sites: Site[];
  regularizations: AttendanceRegularization[];
  filters: AttendanceFilters;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();
  const [search, setSearch] = useState("");
  const [advancedOpen, setAdvancedOpen] = useState(
    Boolean(
      filters.dateFrom ||
        filters.dateTo ||
        filters.siteId ||
        filters.geofenceStatus ||
        filters.openShiftsOnly,
    ),
  );
  const [draft, setDraft] = useState(filters);

  useEffect(() => {
    setDraft(filters);
  }, [filters]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) => {
      const haystack = [
        row.employeeName,
        row.employeeCode,
        row.locationName,
        row.status,
        row.geofenceStatus,
        row.note,
        row.deviceId,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [rows, search]);

  const stats = useMemo(() => {
    const present = filtered.filter(
      (r) => r.status === "PRESENT" || r.status === "LATE",
    ).length;
    const late = filtered.filter((r) => r.status === "LATE").length;
    const absent = filtered.filter((r) => r.status === "ABSENT").length;
    const onLeave = filtered.filter((r) => r.status === "ON_LEAVE").length;
    const leavePending = filtered.filter((r) => r.status === "LEAVE_PENDING").length;
    const open = filtered.filter(
      (r) => Boolean(r.clockInTime) && !r.clockOutTime,
    ).length;
    const outside = filtered.filter((r) => r.geofenceStatus === "OUTSIDE").length;
    const totalMinutes = filtered.reduce((sum, r) => sum + (r.totalMinutes || 0), 0);
    const uniqueEmployees = new Set(filtered.map((r) => r.userId)).size;
    return {
      present,
      late,
      absent,
      onLeave,
      leavePending,
      open,
      outside,
      uniqueEmployees,
      avgMinutes:
        filtered.length === 0 ? 0 : Math.round(totalMinutes / filtered.length),
    };
  }, [filtered]);

  function applyFilters(next: AttendanceFilters) {
    startTransition(() => {
      router.push(buildPageHref(pathname, next, 1, pagination.pageSize));
    });
  }

  function setPreset(preset: "today" | "week" | "month" | "lastMonth") {
    const now = new Date();
    if (preset === "today") {
      const day = todayIso();
      const next = {
        ...draft,
        month: currentMonth(),
        dateFrom: day,
        dateTo: day,
      };
      setDraft(next);
      applyFilters(next);
      return;
    }
    if (preset === "week") {
      const day = now.getDay();
      const mondayOffset = day === 0 ? -6 : 1 - day;
      const monday = new Date(now);
      monday.setDate(now.getDate() + mondayOffset);
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      const next = {
        ...draft,
        month: currentMonth(),
        dateFrom: monday.toISOString().slice(0, 10),
        dateTo: sunday.toISOString().slice(0, 10),
      };
      setDraft(next);
      applyFilters(next);
      return;
    }
    if (preset === "lastMonth") {
      const d = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const month = d.toISOString().slice(0, 7);
      const bounds = monthBounds(month);
      const next = {
        ...draft,
        month,
        dateFrom: bounds.from,
        dateTo: bounds.to,
      };
      setDraft(next);
      applyFilters(next);
      return;
    }
    const month = currentMonth();
    const bounds = monthBounds(month);
    const next = {
      ...draft,
      month,
      dateFrom: bounds.from,
      dateTo: bounds.to,
    };
    setDraft(next);
    applyFilters(next);
  }

  function clearFilters() {
    const day = todayIso();
    const next: AttendanceFilters = {
      month: currentMonth(),
      dateFrom: day,
      dateTo: day,
      status: "",
      userId: "",
      siteId: "",
      geofenceStatus: "",
      openShiftsOnly: false,
    };
    setDraft(next);
    setSearch("");
    applyFilters(next);
  }

  function exportCsv() {
    startTransition(async () => {
      const result = await exportAttendanceCsvAction(buildAttendanceQuery(filters));
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      const stamp =
        filters.dateFrom && filters.dateTo
          ? `${filters.dateFrom}_to_${filters.dateTo}`
          : filters.month || currentMonth();
      const blob = new Blob([result.csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `attendance-${stamp}.csv`;
      anchor.click();
      URL.revokeObjectURL(url);
      toast.success(`Exported ${result.rowCount} rows`);
    });
  }

  const totalPages = Math.max(1, Math.ceil(pagination.total / pagination.pageSize));
  const visiblePages = getVisiblePages(pagination.page, totalPages);
  const rangeStart =
    pagination.total === 0 ? 0 : (pagination.page - 1) * pagination.pageSize + 1;
  const rangeEnd = Math.min(pagination.page * pagination.pageSize, pagination.total);

  function goToPage(page: number) {
    startTransition(() => {
      router.push(buildPageHref(pathname, filters, page, pagination.pageSize));
    });
  }

  function setPageSize(size: number) {
    startTransition(() => {
      router.push(buildPageHref(pathname, filters, 1, size));
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-muted/20 px-4 py-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Daily attendance log
          </p>
          <p className="text-sm font-medium">{dateRangeLabel(filters)}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="secondary" disabled>
            Daily log
          </Button>
          <Button
            size="sm"
            variant="outline"
            nativeButton={false}
            render={<Link href="/attendance/monthly" />}
          >
            Monthly register
          </Button>
        </div>
      </div>

      <section className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-7">
        <CompactStat
          label="Present"
          value={stats.present}
          hint={`${stats.late} late`}
          icon={UserCheck}
          tone="emerald"
        />
        <CompactStat
          label="Absent"
          value={stats.absent}
          hint="This page"
          icon={AlertTriangle}
          tone="rose"
        />
        <CompactStat
          label="Leave"
          value={stats.onLeave + stats.leavePending}
          hint={`${stats.leavePending} pending`}
          icon={Palmtree}
          tone="sky"
        />
        <CompactStat
          label="Open"
          value={stats.open}
          hint="No punch-out"
          icon={Clock3}
          tone="violet"
        />
        <CompactStat
          label="Outside"
          value={stats.outside}
          hint="Geofence"
          icon={MapPinOff}
          tone="amber"
        />
        <CompactStat
          label="People"
          value={stats.uniqueEmployees}
          hint={`${pagination.total} filtered`}
          icon={Users}
          tone="indigo"
        />
        <CompactStat
          label="Avg time"
          value={formatMinutesShort(stats.avgMinutes)}
          hint="Per record"
          icon={Clock3}
          tone="indigo"
        />
      </section>

      <Tabs defaultValue="log" className="flex flex-col gap-4">
        <TabsList variant="line" className="h-auto w-full flex-wrap justify-start gap-1">
          <TabsTrigger value="log">Attendance log</TabsTrigger>
          <TabsTrigger value="regularizations">
            Regularizations
            {regularizations.length ? ` (${regularizations.length})` : ""}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="log" className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
            <div className="xl:col-span-8">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Attendance records</CardTitle>
                  <CardAction className="flex items-center gap-1 text-muted-foreground text-xs">
                    {rangeStart}-{rangeEnd} of {pagination.total}
                    <ArrowRight className="size-4" />
                  </CardAction>
                </CardHeader>
                <CardContent className="flex flex-col gap-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <InputGroup className="h-8 max-w-sm">
                      <InputGroupAddon align="inline-start">
                        <Search className="size-3.5" />
                      </InputGroupAddon>
                      <InputGroupInput
                        className="h-8"
                        placeholder="Search loaded results…"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                      />
                    </InputGroup>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={pending || pagination.total === 0}
                      onClick={exportCsv}
                    >
                      <Download className="size-4" />
                      Export CSV
                    </Button>
                  </div>
                  <AttendanceScheduleList rows={filtered} />
                  <div className="flex flex-col gap-3 border-t pt-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
                      <p className="text-sm text-muted-foreground">
                        Showing{" "}
                        <span className="font-medium text-foreground tabular-nums">
                          {rangeStart}–{rangeEnd}
                        </span>{" "}
                        of{" "}
                        <span className="font-medium text-foreground tabular-nums">
                          {pagination.total}
                        </span>
                      </p>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">Rows</span>
                        <Select
                          value={String(pagination.pageSize)}
                          onValueChange={(value) => {
                            if (!value) return;
                            setPageSize(Number(value));
                          }}
                        >
                          <SelectTrigger className="h-8 w-[4.5rem]" size="sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent align="start">
                            {ATTENDANCE_PAGE_SIZE_OPTIONS.map((option) => (
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
                              href={buildPageHref(
                                pathname,
                                filters,
                                pagination.page - 1,
                                pagination.pageSize,
                              )}
                              className={
                                pagination.page <= 1
                                  ? "pointer-events-none opacity-50"
                                  : undefined
                              }
                              onClick={(event) => {
                                event.preventDefault();
                                if (pagination.page <= 1) return;
                                goToPage(pagination.page - 1);
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
                                  href={buildPageHref(
                                    pathname,
                                    filters,
                                    pageNumber,
                                    pagination.pageSize,
                                  )}
                                  isActive={pageNumber === pagination.page}
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
                              href={buildPageHref(
                                pathname,
                                filters,
                                pagination.page + 1,
                                pagination.pageSize,
                              )}
                              className={
                                pagination.page >= totalPages
                                  ? "pointer-events-none opacity-50"
                                  : undefined
                              }
                              onClick={(event) => {
                                event.preventDefault();
                                if (pagination.page >= totalPages) return;
                                goToPage(pagination.page + 1);
                              }}
                            />
                          </PaginationItem>
                        </PaginationContent>
                      </Pagination>
                    ) : null}
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="xl:col-span-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Filters</CardTitle>
                  <CardAction>
                    <Info className="size-3 text-muted-foreground" />
                  </CardAction>
                </CardHeader>
                <CardContent className="flex flex-col gap-4">
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="secondary" onClick={() => setPreset("today")}>
                      Today
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setPreset("week")}>
                      This week
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setPreset("month")}>
                      This month
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setPreset("lastMonth")}>
                      Last month
                    </Button>
                    <Button size="sm" variant="ghost" onClick={clearFilters}>
                      Reset
                    </Button>
                  </div>

                  <form
                    className="grid gap-3"
                    onSubmit={(e) => {
                      e.preventDefault();
                      applyFilters(draft);
                    }}
                  >
                    <div className="grid gap-1.5">
                      <Label htmlFor="month">Month</Label>
                      <Input
                        id="month"
                        type="month"
                        value={draft.month}
                        onChange={(e) =>
                          setDraft((d) => ({
                            ...d,
                            month: e.target.value,
                            dateFrom: "",
                            dateTo: "",
                          }))
                        }
                      />
                    </div>
                    <FilterSelect
                      id="status"
                      label="Status"
                      allLabel="All statuses"
                      value={draft.status}
                      onValueChange={(status) => setDraft((d) => ({ ...d, status }))}
                      options={[
                        { value: "PRESENT", label: "Present" },
                        { value: "LATE", label: "Late" },
                        { value: "HALF_DAY", label: "Half day" },
                        { value: "ABSENT", label: "Absent" },
                        { value: "ON_LEAVE", label: "On leave" },
                        { value: "LEAVE_PENDING", label: "Leave pending" },
                      ]}
                    />
                    <FilterSelect
                      id="userId"
                      label="Employee"
                      allLabel="All employees"
                      value={draft.userId}
                      onValueChange={(userId) => setDraft((d) => ({ ...d, userId }))}
                      options={employees.map((employee) => ({
                        value: employee.userId,
                        label: employee.name,
                      }))}
                    />

                    <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
                      <CollapsibleTrigger className="inline-flex h-8 items-center gap-1.5 rounded-2xl px-0 text-sm font-medium text-muted-foreground hover:text-foreground">
                        <Filter className="size-3.5" />
                        {advancedOpen ? "Hide advanced filters" : "Show advanced filters"}
                      </CollapsibleTrigger>
                      <CollapsibleContent className="mt-3 grid gap-3">
                        <div className="grid gap-1.5">
                          <Label htmlFor="from">From date</Label>
                          <Input
                            id="from"
                            type="date"
                            value={draft.dateFrom}
                            onChange={(e) =>
                              setDraft((d) => ({ ...d, dateFrom: e.target.value }))
                            }
                          />
                        </div>
                        <div className="grid gap-1.5">
                          <Label htmlFor="to">To date</Label>
                          <Input
                            id="to"
                            type="date"
                            value={draft.dateTo}
                            onChange={(e) =>
                              setDraft((d) => ({ ...d, dateTo: e.target.value }))
                            }
                          />
                        </div>
                        <FilterSelect
                          id="siteId"
                          label="Site"
                          allLabel="All sites"
                          value={draft.siteId}
                          onValueChange={(siteId) => setDraft((d) => ({ ...d, siteId }))}
                          options={sites.map((site) => ({
                            value: site.id,
                            label: site.name,
                          }))}
                        />
                        <FilterSelect
                          id="geofence"
                          label="Geofence"
                          allLabel="All geofence states"
                          value={draft.geofenceStatus}
                          onValueChange={(geofenceStatus) =>
                            setDraft((d) => ({ ...d, geofenceStatus }))
                          }
                          options={[
                            { value: "INSIDE", label: "Inside" },
                            { value: "OUTSIDE", label: "Outside" },
                            { value: "GPS_ONLY", label: "GPS only" },
                            { value: "UNKNOWN", label: "Unknown" },
                          ]}
                        />
                        <label className="flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            className="size-4 rounded border"
                            checked={draft.openShiftsOnly}
                            onChange={(e) =>
                              setDraft((d) => ({
                                ...d,
                                openShiftsOnly: e.target.checked,
                              }))
                            }
                          />
                          Open shifts only
                        </label>
                      </CollapsibleContent>
                    </Collapsible>

                    <Button type="submit" disabled={pending} className="w-full">
                      {pending ? "Applying…" : "Apply filters"}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="regularizations" className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Pending regularizations</CardTitle>
              <CardAction className="flex items-center gap-1 text-muted-foreground text-xs">
                {regularizations.length} pending
                <ArrowRight className="size-4" />
              </CardAction>
            </CardHeader>
            <CardContent>
              {regularizations.length > 0 ? (
                <RegularizationReview items={regularizations} />
              ) : (
                <div className="rounded-2xl border border-dashed py-12 text-center text-sm text-muted-foreground">
                  No pending regularization requests.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function CompactStat({
  label,
  value,
  hint,
  icon: Icon,
  tone = "indigo",
}: {
  label: string;
  value: string | number;
  hint: string;
  icon: ComponentType<{ className?: string }>;
  tone?: "indigo" | "emerald" | "amber" | "rose" | "sky" | "violet";
}) {
  const toneClass = {
    indigo:
      "border-indigo-200/80 bg-indigo-50 text-indigo-600 dark:border-indigo-500/30 dark:bg-indigo-500/10 dark:text-indigo-400",
    emerald:
      "border-emerald-200/80 bg-emerald-50 text-emerald-600 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-400",
    amber:
      "border-amber-200/80 bg-amber-50 text-amber-600 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-400",
    rose: "border-rose-200/80 bg-rose-50 text-rose-600 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-400",
    sky: "border-sky-200/80 bg-sky-50 text-sky-600 dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-400",
    violet:
      "border-violet-200/80 bg-violet-50 text-violet-600 dark:border-violet-500/30 dark:bg-violet-500/10 dark:text-violet-400",
  }[tone];

  return (
    <Card size="sm" className="shadow-xs">
      <CardContent className="flex items-center gap-2.5 py-2.5">
        <div
          className={cn(
            "flex size-7 shrink-0 items-center justify-center rounded-md border",
            toneClass,
          )}
        >
          <Icon className="size-3.5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            {label}
          </p>
          <p className="text-base font-bold tabular-nums leading-tight">{value}</p>
          <p className="truncate text-[10px] text-muted-foreground">{hint}</p>
        </div>
      </CardContent>
    </Card>
  );
}
