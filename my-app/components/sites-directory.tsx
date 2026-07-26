"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ChevronDown,
  ChevronRight,
  Clock,
  ExternalLink,
  MapPin,
  MoreHorizontal,
  Plus,
  Radio,
  RefreshCw,
  Search,
  Signal,
  Users,
} from "lucide-react";
import { toast } from "sonner";

import { SiteForm } from "@/components/site-form";
import { SitesLiveMap } from "@/components/sites-live-map";
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
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  deactivateSiteAction,
  deleteSiteAction,
  getSitesLivePresenceAction,
} from "@/lib/appwrite/phase1-actions";
import type { Site } from "@/lib/appwrite/types";
import type { LiveCheckIn, SitesLiveSnapshot } from "@/lib/sites-live";
import { formatLiveAge } from "@/lib/sites-live";
import { cn, getInitials } from "@/lib/utils";

const REFRESH_MS = 30_000;

function statusBadgeClass(status: Site["status"]) {
  if (status === "active") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300";
  }
  return "border-border bg-muted text-muted-foreground";
}

function mapsUrl(site: Site) {
  return `https://www.google.com/maps?q=${site.lat},${site.long}`;
}

function geofenceBadge(status: LiveCheckIn["geofenceStatus"]) {
  if (status === "GPS_ONLY") {
    return "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-300";
  }
  if (status === "INSIDE") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300";
  }
  return "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200";
}

export function SitesDirectory({
  sites,
  initialLive,
}: {
  sites: Site[];
  initialLive: SitesLiveSnapshot;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [live, setLive] = useState(initialLive);
  const [refreshing, setRefreshing] = useState(false);
  const [pending, startTransition] = useTransition();
  const [createOpen, setCreateOpen] = useState(false);
  const [editSite, setEditSite] = useState<Site | null>(null);
  const [deleteSite, setDeleteSite] = useState<Site | null>(null);
  const [registryOpen, setRegistryOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [highlightId, setHighlightId] = useState<string | null>(null);

  const selectedSiteId = searchParams.get("site");
  const activeSites = useMemo(
    () => sites.filter((site) => site.status === "active"),
    [sites],
  );

  const refreshLive = useCallback(async (silent = false) => {
    if (!silent) setRefreshing(true);
    try {
      const snapshot = await getSitesLivePresenceAction();
      setLive(snapshot);
    } catch {
      if (!silent) toast.error("Could not refresh live presence");
    } finally {
      if (!silent) setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      void refreshLive(true);
    }, REFRESH_MS);
    return () => window.clearInterval(timer);
  }, [refreshLive]);

  const filteredSites = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return sites;
    return sites.filter(
      (site) =>
        site.name.toLowerCase().includes(q) ||
        site.address.toLowerCase().includes(q),
    );
  }, [sites, search]);

  const roster = useMemo(() => {
    if (!selectedSiteId) return live.checkedIn;
    if (selectedSiteId === "field") {
      return live.checkedIn.filter(
        (row) => !row.siteId || !sites.some((s) => s.id === row.siteId),
      );
    }
    return live.checkedIn.filter((row) => row.siteId === selectedSiteId);
  }, [live.checkedIn, selectedSiteId, sites]);

  const selectedSite = selectedSiteId
    ? sites.find((site) => site.id === selectedSiteId)
    : null;

  function selectSite(siteId: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (siteId) params.set("site", siteId);
    else params.delete("site");
    router.replace(`/sites${params.size ? `?${params.toString()}` : ""}`, {
      scroll: false,
    });
  }

  function runAction(
    action: (fd: FormData) => Promise<{ ok: true } | { ok: false; error: string }>,
    siteId: string,
    successMessage: string,
  ) {
    const fd = new FormData();
    fd.set("siteId", siteId);
    startTransition(async () => {
      const result = await action(fd);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(successMessage);
      setDeleteSite(null);
      router.refresh();
      await refreshLive(true);
    });
  }

  async function copyCoords(site: Site) {
    try {
      await navigator.clipboard.writeText(`${site.lat}, ${site.long}`);
      toast.success("Coordinates copied");
    } catch {
      toast.error("Could not copy coordinates");
    }
  }

  const lastUpdated = new Date(live.fetchedAt).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  return (
    <>
      <div className="relative overflow-hidden rounded-2xl border bg-linear-to-br from-slate-950 via-indigo-950/80 to-slate-900 p-5 text-white shadow-lg sm:p-6">
        <div className="pointer-events-none absolute -right-16 -top-16 size-48 rounded-full bg-indigo-500/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 left-1/3 size-56 rounded-full bg-emerald-500/10 blur-3xl" />

        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.2em] text-indigo-200/80">
              <Signal className="size-3.5 text-emerald-400" />
              Site command center
            </div>
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              Live workforce map
            </h2>
            <p className="max-w-xl text-sm text-slate-300/90">
              Track who is on duty at each geofence in real time. Select a site to
              filter the roster and highlight connections on the map.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <MetricPill
              label="On duty"
              value={live.totalCheckedIn}
              accent="emerald"
            />
            <MetricPill label="Sites" value={activeSites.length} accent="indigo" />
            <MetricPill label="Field" value={live.fieldCount} accent="sky" />
            <Button
              variant="secondary"
              size="sm"
              className="border-white/10 bg-white/10 text-white hover:bg-white/15"
              disabled={refreshing}
              onClick={() => void refreshLive()}
            >
              <RefreshCw className={cn("size-4", refreshing && "animate-spin")} />
              Refresh
            </Button>
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              <Plus className="size-4" />
              Add site
            </Button>
          </div>
        </div>

        <p className="relative mt-4 text-xs text-slate-400">
          Auto-refresh every 30s · Last update {lastUpdated}
        </p>
      </div>

      <div className="grid gap-4 xl:grid-cols-12">
        <div className="space-y-4 xl:col-span-8">
          <SitesLiveMap
            sites={sites}
            checkedIn={live.checkedIn}
            selectedSiteId={selectedSiteId}
            highlightedEmployeeId={highlightId}
          />

          {selectedSite ? (
            <Card className="border-indigo-500/15 shadow-xs">
              <CardHeader className="pb-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <CardTitle className="text-lg">{selectedSite.name}</CardTitle>
                    <CardDescription>
                      {selectedSite.address || "No address"} · {selectedSite.radiusMeters}m
                      geofence
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={statusBadgeClass(selectedSite.status)}>
                      {selectedSite.status}
                    </Badge>
                    <Badge variant="secondary">
                      {live.bySiteId[selectedSite.id] || 0} on duty
                    </Badge>
                    <Button
                      variant="outline"
                      size="sm"
                      nativeButton={false}
                      render={
                        <a href={mapsUrl(selectedSite)} target="_blank" rel="noreferrer" />
                      }
                    >
                      <ExternalLink className="size-3.5" />
                      Maps
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => selectSite(null)}>
                      Clear
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="grid gap-3 sm:grid-cols-3">
                <InfoTile label="Latitude" value={selectedSite.lat.toFixed(5)} />
                <InfoTile label="Longitude" value={selectedSite.long.toFixed(5)} />
                <InfoTile
                  label="Checked in now"
                  value={String(live.bySiteId[selectedSite.id] || 0)}
                />
              </CardContent>
            </Card>
          ) : null}
        </div>

        <div className="flex flex-col gap-4 xl:col-span-4">
          <Card className="shadow-xs">
            <CardHeader className="border-b pb-4">
              <CardTitle className="text-base">Sites</CardTitle>
              <CardDescription>Tap to filter live roster & map</CardDescription>
            </CardHeader>
            <CardContent className="max-h-[220px] space-y-2 overflow-y-auto p-3">
              <button
                type="button"
                onClick={() => selectSite(null)}
                className={cn(
                  "flex w-full items-center justify-between rounded-xl border px-3 py-2.5 text-left text-sm transition-colors",
                  !selectedSiteId
                    ? "border-indigo-500/30 bg-indigo-500/5"
                    : "border-transparent hover:bg-muted/50",
                )}
              >
                <span className="font-medium">All locations</span>
                <Badge variant="secondary">{live.totalCheckedIn}</Badge>
              </button>
              {activeSites.map((site) => (
                <button
                  key={site.id}
                  type="button"
                  onClick={() => selectSite(site.id)}
                  className={cn(
                    "flex w-full items-center justify-between gap-2 rounded-xl border px-3 py-2.5 text-left text-sm transition-colors",
                    selectedSiteId === site.id
                      ? "border-indigo-500/30 bg-indigo-500/5"
                      : "border-transparent hover:bg-muted/50",
                  )}
                >
                  <span className="min-w-0 truncate font-medium">{site.name}</span>
                  <Badge
                    variant="outline"
                    className={cn(
                      "shrink-0 tabular-nums",
                      (live.bySiteId[site.id] || 0) > 0 &&
                        "border-emerald-500/30 text-emerald-700 dark:text-emerald-300",
                    )}
                  >
                    {live.bySiteId[site.id] || 0}
                  </Badge>
                </button>
              ))}
              {live.fieldCount > 0 ? (
                <button
                  type="button"
                  onClick={() => selectSite("field")}
                  className={cn(
                    "flex w-full items-center justify-between rounded-xl border px-3 py-2.5 text-left text-sm transition-colors",
                    selectedSiteId === "field"
                      ? "border-sky-500/30 bg-sky-500/5"
                      : "border-transparent hover:bg-muted/50",
                  )}
                >
                  <span className="font-medium">Field / mobile</span>
                  <Badge variant="outline">{live.fieldCount}</Badge>
                </button>
              ) : null}
            </CardContent>
          </Card>

          <Card className="min-h-[320px] flex-1 shadow-xs">
            <CardHeader className="border-b pb-4">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Radio className="size-4 text-emerald-500" />
                    Live roster
                  </CardTitle>
                  <CardDescription>
                    {roster.length} employee{roster.length === 1 ? "" : "s"} currently on duty
                  </CardDescription>
                </div>
                <Users className="size-4 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent className="max-h-[420px] space-y-2 overflow-y-auto p-3">
              {roster.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <Clock className="mb-2 size-8 text-muted-foreground/50" />
                  <p className="text-sm font-medium">No one checked in</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Open punches will appear here automatically.
                  </p>
                </div>
              ) : (
                roster.map((row) => (
                  <button
                    key={row.attendanceId}
                    type="button"
                    onMouseEnter={() => setHighlightId(row.attendanceId)}
                    onMouseLeave={() => setHighlightId(null)}
                    className="flex w-full items-start gap-3 rounded-xl border border-transparent p-2.5 text-left transition-colors hover:border-slate-200 hover:bg-muted/40 dark:hover:border-slate-800"
                  >
                    <Avatar className="size-9 rounded-lg">
                      <AvatarFallback className="rounded-lg bg-primary/10 text-xs font-semibold text-primary">
                        {getInitials(row.employeeName)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-semibold">{row.employeeName}</p>
                        <Badge
                          variant="outline"
                          className={cn("text-[10px]", geofenceBadge(row.geofenceStatus))}
                        >
                          {row.geofenceStatus === "GPS_ONLY" ? "Field" : row.geofenceStatus}
                        </Badge>
                      </div>
                      <p className="truncate text-xs text-muted-foreground">
                        {row.siteName} · in {row.clockInTime}
                      </p>
                      <p className="text-[11px] text-muted-foreground/80">
                        {formatLiveAge(row.clockInTimestamp)}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      nativeButton={false}
                      render={<Link href={`/employees/${row.employeeId}`} />}
                    >
                      <ChevronRight className="size-4" />
                    </Button>
                  </button>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Collapsible open={registryOpen} onOpenChange={setRegistryOpen}>
        <Card className="overflow-hidden shadow-xs">
          <CollapsibleTrigger className="flex w-full items-center justify-between border-b bg-muted/15 px-5 py-4 text-left transition-colors hover:bg-muted/25">
            <div>
              <p className="font-semibold">Site registry & management</p>
              <p className="text-sm text-muted-foreground">
                {sites.length} total sites · edit geofences, coordinates, and status
              </p>
            </div>
            <ChevronDown
              className={cn(
                "size-5 text-muted-foreground transition-transform",
                registryOpen && "rotate-180",
              )}
            />
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="flex flex-col gap-3 border-b px-5 py-4 sm:flex-row sm:items-center">
              <div className="relative flex-1 sm:max-w-sm">
                <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="h-10 pl-9"
                  placeholder="Search sites…"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </div>
              <Button variant="outline" onClick={() => setCreateOpen(true)}>
                <Plus className="size-4" />
                New site
              </Button>
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="pl-5">Site</TableHead>
                    <TableHead>On duty</TableHead>
                    <TableHead>Radius</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="pr-5 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSites.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                        No sites match your search.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredSites.map((site) => (
                      <TableRow
                        key={site.id}
                        className={cn(
                          "cursor-pointer",
                          selectedSiteId === site.id && "bg-indigo-500/5",
                        )}
                        onClick={() => selectSite(site.id)}
                      >
                        <TableCell className="pl-5 py-3">
                          <div className="min-w-0">
                            <p className="truncate font-medium">{site.name}</p>
                            <p className="truncate text-xs text-muted-foreground">
                              {site.lat.toFixed(4)}, {site.long.toFixed(4)}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={cn(
                              "tabular-nums",
                              (live.bySiteId[site.id] || 0) > 0 &&
                                "border-emerald-500/30 text-emerald-700 dark:text-emerald-300",
                            )}
                          >
                            {live.bySiteId[site.id] || 0}
                          </Badge>
                        </TableCell>
                        <TableCell className="tabular-nums">{site.radiusMeters}m</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={statusBadgeClass(site.status)}>
                            {site.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="pr-5 text-right" onClick={(e) => e.stopPropagation()}>
                          <SiteActions
                            site={site}
                            onEdit={() => setEditSite(site)}
                            onDelete={() => setDeleteSite(site)}
                            onDeactivate={() =>
                              runAction(
                                deactivateSiteAction,
                                site.id,
                                `${site.name} deactivated`,
                              )
                            }
                            onCopy={() => copyCoords(site)}
                          />
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-h-[90vh] gap-0 overflow-hidden p-0 sm:max-w-xl">
          <DialogHeader className="border-b bg-muted/20 px-6 py-5">
            <div className="flex items-start gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <MapPin className="size-5" />
              </div>
              <div className="space-y-1 text-left">
                <DialogTitle>Add site</DialogTitle>
                <DialogDescription>
                  Define a geofence center and punch radius for mobile check-in.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <div className="max-h-[calc(90vh-5.5rem)] overflow-y-auto px-6 py-5">
            <SiteForm
              onSuccess={() => {
                setCreateOpen(false);
                router.refresh();
                void refreshLive(true);
              }}
              submitLabel="Create site"
            />
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(editSite)} onOpenChange={(open) => !open && setEditSite(null)}>
        <DialogContent className="max-h-[90vh] gap-0 overflow-hidden p-0 sm:max-w-xl">
          <DialogHeader className="border-b bg-muted/20 px-6 py-5">
            <div className="flex items-start gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <MapPin className="size-5" />
              </div>
              <div className="space-y-1 text-left">
                <DialogTitle>Edit site</DialogTitle>
                <DialogDescription>Update location for {editSite?.name}.</DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <div className="max-h-[calc(90vh-5.5rem)] overflow-y-auto px-6 py-5">
            {editSite ? (
              <SiteForm
                key={editSite.id}
                site={editSite}
                onSuccess={() => {
                  setEditSite(null);
                  router.refresh();
                  void refreshLive(true);
                }}
                submitLabel="Save changes"
              />
            ) : null}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(deleteSite)} onOpenChange={(open) => !open && setDeleteSite(null)}>
        <DialogContent className="sm:max-w-md" showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Delete site?</DialogTitle>
            <DialogDescription>
              Permanently removes {deleteSite?.name}. Deactivate instead if employees still
              reference it.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" disabled={pending} onClick={() => setDeleteSite(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={pending || !deleteSite}
              onClick={() => {
                if (!deleteSite) return;
                runAction(deleteSiteAction, deleteSite.id, `${deleteSite.name} deleted`);
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

function MetricPill({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent: "emerald" | "indigo" | "sky";
}) {
  const tone =
    accent === "emerald"
      ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-100"
      : accent === "sky"
        ? "border-sky-400/20 bg-sky-400/10 text-sky-100"
        : "border-indigo-400/20 bg-indigo-400/10 text-indigo-100";

  return (
    <div className={cn("rounded-xl border px-3 py-2 text-center", tone)}>
      <p className="text-[10px] uppercase tracking-wider opacity-80">{label}</p>
      <p className="text-xl font-semibold tabular-nums">{value}</p>
    </div>
  );
}

function InfoTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border bg-muted/20 px-3 py-2.5">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-mono text-sm font-medium">{value}</p>
    </div>
  );
}

function SiteActions({
  site,
  onEdit,
  onDelete,
  onDeactivate,
  onCopy,
}: {
  site: Site;
  onEdit: () => void;
  onDelete: () => void;
  onDeactivate: () => void;
  onCopy: () => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="ghost" size="icon-sm">
            <MoreHorizontal className="size-4" />
          </Button>
        }
      />
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={onEdit}>Edit</DropdownMenuItem>
        <DropdownMenuItem onClick={onCopy}>Copy coordinates</DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => window.open(mapsUrl(site), "_blank", "noopener,noreferrer")}
        >
          Open in Maps
        </DropdownMenuItem>
        {site.status === "active" ? (
          <DropdownMenuItem onClick={onDeactivate}>Deactivate</DropdownMenuItem>
        ) : null}
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onClick={onDelete}>
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
