"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Copy,
  ExternalLink,
  LayoutGrid,
  MapPin,
  MoreHorizontal,
  Plus,
  Rows3,
  Search,
} from "lucide-react";
import { toast } from "sonner";

import { SiteForm } from "@/components/site-form";
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
} from "@/lib/appwrite/phase1-actions";
import type { Site } from "@/lib/appwrite/types";
import { cn } from "@/lib/utils";

const STATUS_FILTERS = ["All", "active", "inactive"] as const;

function statusBadgeClass(status: Site["status"]) {
  if (status === "active") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300";
  }
  return "border-border bg-muted text-muted-foreground";
}

function mapsUrl(site: Site) {
  return `https://www.google.com/maps?q=${site.lat},${site.long}`;
}

function GeofencePreview({ radiusMeters }: { radiusMeters: number }) {
  const maxRadius = 2000;
  const scale = Math.min(1, Math.sqrt(radiusMeters / maxRadius));
  const ring = 18 + scale * 22;

  return (
    <div
      className="relative flex size-14 shrink-0 items-center justify-center rounded-xl border bg-linear-to-b from-primary/10 to-card"
      aria-hidden
    >
      <div
        className="absolute rounded-full border border-primary/30 bg-primary/10"
        style={{ width: ring, height: ring }}
      />
      <MapPin className="relative size-4 text-primary" />
    </div>
  );
}

export function SitesDirectory({ sites }: { sites: Site[] }) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] =
    useState<(typeof STATUS_FILTERS)[number]>("All");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [createOpen, setCreateOpen] = useState(false);
  const [editSite, setEditSite] = useState<Site | null>(null);
  const [deleteSite, setDeleteSite] = useState<Site | null>(null);
  const [pending, startTransition] = useTransition();

  const stats = useMemo(() => {
    const active = sites.filter((s) => s.status === "active").length;
    const avgRadius =
      sites.length === 0
        ? 0
        : Math.round(
            sites.reduce((sum, s) => sum + s.radiusMeters, 0) / sites.length,
          );
    return {
      total: sites.length,
      active,
      inactive: sites.length - active,
      avgRadius,
    };
  }, [sites]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return sites.filter((site) => {
      if (statusFilter !== "All" && site.status !== statusFilter) return false;
      if (!q) return true;
      return (
        site.name.toLowerCase().includes(q) ||
        site.address.toLowerCase().includes(q) ||
        String(site.lat).includes(q) ||
        String(site.long).includes(q)
      );
    });
  }, [sites, search, statusFilter]);

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
    });
  }

  async function copyCoords(site: Site) {
    const text = `${site.lat}, ${site.long}`;
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Coordinates copied");
    } catch {
      toast.error("Could not copy coordinates");
    }
  }

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total sites" value={stats.total} hint="All geofences" />
        <StatCard label="Active" value={stats.active} hint="Usable for punch" />
        <StatCard
          label="Inactive"
          value={stats.inactive}
          hint="Hidden from mobile"
        />
        <StatCard
          label="Avg radius"
          value={`${stats.avgRadius}m`}
          hint="Across all sites"
        />
      </div>

      <Card className="shadow-xs">
        <CardHeader className="border-b has-data-[slot=card-action]:grid-cols-1 md:has-data-[slot=card-action]:grid-cols-[1fr_auto]">
          <CardTitle className="text-xl leading-none">Geofence sites</CardTitle>
          <CardDescription className="max-w-md leading-snug">
            Manage office locations and punch radii for mobile check-in.
          </CardDescription>
          <CardAction className="col-start-1 row-start-auto flex w-full flex-wrap justify-start gap-2 justify-self-stretch md:col-start-2 md:row-span-2 md:row-start-1 md:w-auto md:flex-nowrap md:justify-end md:justify-self-end">
            <InputGroup className="h-8 w-full md:w-64">
              <InputGroupAddon align="inline-start">
                <Search className="size-3.5" />
              </InputGroupAddon>
              <InputGroupInput
                className="h-8"
                placeholder="Search name, address, coords…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </InputGroup>
            <div className="flex rounded-xl border p-0.5">
              <Button
                size="icon-sm"
                variant={view === "grid" ? "secondary" : "ghost"}
                onClick={() => setView("grid")}
                aria-label="Grid view"
              >
                <LayoutGrid className="size-3.5" />
              </Button>
              <Button
                size="icon-sm"
                variant={view === "list" ? "secondary" : "ghost"}
                onClick={() => setView("list")}
                aria-label="List view"
              >
                <Rows3 className="size-3.5" />
              </Button>
            </div>
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              <Plus className="size-4" />
              Add site
            </Button>
          </CardAction>
        </CardHeader>

        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs text-muted-foreground">Status:</span>
              {STATUS_FILTERS.map((option) => (
                <Button
                  key={option}
                  size="sm"
                  variant={statusFilter === option ? "secondary" : "ghost"}
                  className="h-7 px-2.5 capitalize"
                  onClick={() => setStatusFilter(option)}
                >
                  {option}
                </Button>
              ))}
            </div>
            <p className="text-sm text-muted-foreground">
              {filtered.length} of {sites.length}
            </p>
          </div>

          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed py-16 text-center">
              <div className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <MapPin className="size-5" />
              </div>
              <div className="space-y-1">
                <p className="font-medium">No sites match</p>
                <p className="text-sm text-muted-foreground">
                  Try a different search, or create your first geofence.
                </p>
              </div>
              <Button size="sm" onClick={() => setCreateOpen(true)}>
                <Plus className="size-4" />
                Add site
              </Button>
            </div>
          ) : view === "grid" ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {filtered.map((site) => (
                <Card key={site.id} size="sm" className="shadow-xs">
                  <CardHeader className="flex flex-row items-start gap-3 space-y-0">
                    <GeofencePreview radiusMeters={site.radiusMeters} />
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-start justify-between gap-2">
                        <CardTitle className="truncate">{site.name}</CardTitle>
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
                      </div>
                      <CardDescription className="line-clamp-2">
                        {site.address || "No address"}
                      </CardDescription>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge
                        variant="outline"
                        className={cn(
                          "gap-1.5 capitalize",
                          statusBadgeClass(site.status),
                        )}
                      >
                        <span className="size-1.5 rounded-full bg-current opacity-70" />
                        {site.status}
                      </Badge>
                      <Badge variant="secondary">{site.radiusMeters}m radius</Badge>
                    </div>
                    <p className="font-mono text-xs text-muted-foreground">
                      {site.lat.toFixed(5)}, {site.long.toFixed(5)}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setEditSite(site)}
                      >
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        nativeButton={false}
                        render={
                          <a
                            href={mapsUrl(site)}
                            target="_blank"
                            rel="noreferrer"
                          />
                        }
                      >
                        <ExternalLink className="size-3.5" />
                        Maps
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="-mx-(--card-spacing)">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-4">Site</TableHead>
                    <TableHead>Coordinates</TableHead>
                    <TableHead>Radius</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="pr-4 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((site) => (
                    <TableRow key={site.id}>
                      <TableCell className="pl-4">
                        <div className="flex items-center gap-3">
                          <GeofencePreview radiusMeters={site.radiusMeters} />
                          <div className="min-w-0">
                            <p className="truncate font-medium">{site.name}</p>
                            <p className="truncate text-xs text-muted-foreground">
                              {site.address || "No address"}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-xs tabular-nums">
                        {site.lat.toFixed(5)}, {site.long.toFixed(5)}
                      </TableCell>
                      <TableCell className="tabular-nums">
                        {site.radiusMeters}m
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={cn(
                            "gap-1.5 capitalize",
                            statusBadgeClass(site.status),
                          )}
                        >
                          <span className="size-1.5 rounded-full bg-current opacity-70" />
                          {site.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="pr-4 text-right">
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
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Add site</DialogTitle>
            <DialogDescription>
              Set the geofence center and radius used for mobile punch validation.
            </DialogDescription>
          </DialogHeader>
          <SiteForm
            onSuccess={() => setCreateOpen(false)}
            submitLabel="Create site"
          />
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(editSite)}
        onOpenChange={(open) => {
          if (!open) setEditSite(null);
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Edit site</DialogTitle>
            <DialogDescription>
              Update location details for {editSite?.name}.
            </DialogDescription>
          </DialogHeader>
          {editSite ? (
            <SiteForm
              key={editSite.id}
              site={editSite}
              onSuccess={() => setEditSite(null)}
              submitLabel="Save changes"
            />
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(deleteSite)}
        onOpenChange={(open) => {
          if (!open) setDeleteSite(null);
        }}
      >
        <DialogContent className="sm:max-w-md" showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Delete site?</DialogTitle>
            <DialogDescription>
              This permanently removes {deleteSite?.name}. Sites assigned as an
              employee primary location cannot be deleted — deactivate them
              instead.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              disabled={pending}
              onClick={() => setDeleteSite(null)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={pending || !deleteSite}
              onClick={() => {
                if (!deleteSite) return;
                runAction(
                  deleteSiteAction,
                  deleteSite.id,
                  `${deleteSite.name} deleted`,
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

function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | number;
  hint: string;
}) {
  return (
    <Card className="bg-linear-to-t from-primary/5 to-card shadow-xs dark:bg-card">
      <CardHeader className="pb-0">
        <CardDescription>{label}</CardDescription>
        <CardTitle className="text-3xl font-medium tabular-nums tracking-tight">
          {value}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">{hint}</p>
      </CardContent>
    </Card>
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
          <Button
            aria-label={`Open actions for ${site.name}`}
            className="size-8 text-muted-foreground"
            size="icon-sm"
            variant="ghost"
          />
        }
      >
        <MoreHorizontal className="size-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-44">
        <DropdownMenuItem onClick={onEdit}>Edit site</DropdownMenuItem>
        <DropdownMenuItem onClick={onCopy}>
          <Copy className="size-4" />
          Copy coordinates
        </DropdownMenuItem>
        <DropdownMenuItem
          render={
            <a href={mapsUrl(site)} target="_blank" rel="noreferrer" />
          }
        >
          <ExternalLink className="size-4" />
          Open in Maps
        </DropdownMenuItem>
        {site.status !== "inactive" ? (
          <DropdownMenuItem onClick={onDeactivate}>Deactivate</DropdownMenuItem>
        ) : null}
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onClick={onDelete}>
          Delete site
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
