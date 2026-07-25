"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ArrowRight, Download, Filter, Info, Search } from "lucide-react";
import { toast } from "sonner";

import { AttendanceScheduleList } from "@/components/attendance-schedule-list";
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
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { exportAttendanceCsvAction } from "@/lib/appwrite/phase1-actions";
import type {
  AttendanceRecord,
  AttendanceRegularization,
  EmployeeMembership,
  Site,
} from "@/lib/appwrite/types";

const selectClassName =
  "h-9 w-full min-w-0 rounded-lg border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

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

function buildPageHref(pathname: string, filters: AttendanceFilters, page: number) {
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
  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
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
    const params = new URLSearchParams();
    if (next.month) params.set("month", next.month);
    if (next.dateFrom) params.set("from", next.dateFrom);
    if (next.dateTo) params.set("to", next.dateTo);
    if (next.status) params.set("status", next.status);
    if (next.userId) params.set("userId", next.userId);
    if (next.siteId) params.set("siteId", next.siteId);
    if (next.geofenceStatus) params.set("geofence", next.geofenceStatus);
    if (next.openShiftsOnly) params.set("open", "1");
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
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
  const rangeStart =
    pagination.total === 0 ? 0 : (pagination.page - 1) * pagination.pageSize + 1;
  const rangeEnd = Math.min(pagination.page * pagination.pageSize, pagination.total);

  return (
    <div className="flex flex-col gap-4">
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

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <AttendanceKpiCard
          label="Present / late"
          value={stats.present}
          hint={`${stats.late} late on this page`}
        />
        <AttendanceKpiCard
          label="Absent / leave"
          value={stats.absent}
          hint={`${stats.onLeave} on leave · ${stats.leavePending} pending`}
        />
        <AttendanceKpiCard
          label="Open shifts"
          value={stats.open}
          hint={`${stats.outside} outside geofence on page`}
        />
        <AttendanceKpiCard
          label="People tracked"
          value={stats.uniqueEmployees}
          hint={`${pagination.total} total in filter`}
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
                  {totalPages > 1 ? (
                    <Pagination className="justify-start">
                      <PaginationContent>
                        <PaginationItem>
                          <PaginationPrevious
                            href={buildPageHref(pathname, filters, pagination.page - 1)}
                            className={
                              pagination.page <= 1 ? "pointer-events-none opacity-50" : undefined
                            }
                          />
                        </PaginationItem>
                        <PaginationItem>
                          <span className="px-3 text-sm text-muted-foreground tabular-nums">
                            Page {pagination.page} of {totalPages}
                          </span>
                        </PaginationItem>
                        <PaginationItem>
                          <PaginationNext
                            href={buildPageHref(pathname, filters, pagination.page + 1)}
                            className={
                              pagination.page >= totalPages
                                ? "pointer-events-none opacity-50"
                                : undefined
                            }
                          />
                        </PaginationItem>
                      </PaginationContent>
                    </Pagination>
                  ) : null}
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
                    <div className="grid gap-1.5">
                      <Label htmlFor="status">Status</Label>
                      <select
                        id="status"
                        className={selectClassName}
                        value={draft.status}
                        onChange={(e) =>
                          setDraft((d) => ({ ...d, status: e.target.value }))
                        }
                      >
                        <option value="">All statuses</option>
                        <option value="PRESENT">PRESENT</option>
                        <option value="LATE">LATE</option>
                        <option value="HALF_DAY">HALF_DAY</option>
                        <option value="ABSENT">ABSENT</option>
                        <option value="ON_LEAVE">ON_LEAVE</option>
                        <option value="LEAVE_PENDING">LEAVE_PENDING</option>
                      </select>
                    </div>
                    <div className="grid gap-1.5">
                      <Label htmlFor="userId">Employee</Label>
                      <select
                        id="userId"
                        className={selectClassName}
                        value={draft.userId}
                        onChange={(e) =>
                          setDraft((d) => ({ ...d, userId: e.target.value }))
                        }
                      >
                        <option value="">All employees</option>
                        {employees.map((employee) => (
                          <option key={employee.userId} value={employee.userId}>
                            {employee.name}
                          </option>
                        ))}
                      </select>
                    </div>

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
                        <div className="grid gap-1.5">
                          <Label htmlFor="siteId">Site</Label>
                          <select
                            id="siteId"
                            className={selectClassName}
                            value={draft.siteId}
                            onChange={(e) =>
                              setDraft((d) => ({ ...d, siteId: e.target.value }))
                            }
                          >
                            <option value="">All sites</option>
                            {sites.map((site) => (
                              <option key={site.id} value={site.id}>
                                {site.name}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="grid gap-1.5">
                          <Label htmlFor="geofence">Geofence</Label>
                          <select
                            id="geofence"
                            className={selectClassName}
                            value={draft.geofenceStatus}
                            onChange={(e) =>
                              setDraft((d) => ({
                                ...d,
                                geofenceStatus: e.target.value,
                              }))
                            }
                          >
                            <option value="">All</option>
                            <option value="INSIDE">INSIDE</option>
                            <option value="OUTSIDE">OUTSIDE</option>
                            <option value="UNKNOWN">UNKNOWN</option>
                          </select>
                        </div>
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

function AttendanceKpiCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | number;
  hint: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">{label}</CardTitle>
        <CardAction>
          <Info className="size-3 text-muted-foreground" />
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col">
        <div className="text-3xl text-foreground leading-none tracking-tight tabular-nums">
          {value}
        </div>
        <div className="text-right text-muted-foreground text-xs">{hint}</div>
      </CardContent>
    </Card>
  );
}
