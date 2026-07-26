"use client";

import { useMemo } from "react";
import { MapPin, Radio, UserRound } from "lucide-react";

import type { LiveCheckIn } from "@/lib/sites-live";
import {
  buildMapPoints,
  projectMapPoints,
  type ProjectedPoint,
} from "@/lib/sites-live";
import type { Site } from "@/lib/appwrite/types";
import { cn } from "@/lib/utils";

const MAP_W = 720;
const MAP_H = 420;

function geofenceDotClass(status?: string) {
  if (status === "GPS_ONLY") {
    return "fill-sky-400 stroke-sky-300";
  }
  if (status === "OUTSIDE") {
    return "fill-amber-400 stroke-amber-300";
  }
  return "fill-emerald-400 stroke-emerald-300";
}

function SiteMarker({ point }: { point: ProjectedPoint }) {
  const dimmed = point.active === false;
  return (
    <g
      className={cn("transition-opacity duration-300", dimmed && "opacity-35")}
      aria-label={point.label}
    >
      <circle
        cx={point.x}
        cy={point.y}
        r={point.r}
        className="fill-indigo-500/8 stroke-indigo-400/50"
        strokeWidth={1.5}
        strokeDasharray="5 4"
      />
      <circle
        cx={point.x}
        cy={point.y}
        r={7}
        className="fill-indigo-500 stroke-indigo-300"
        strokeWidth={2}
      />
      <circle cx={point.x} cy={point.y} r={2.5} className="fill-white" />
    </g>
  );
}

function EmployeeMarker({
  point,
  selected,
}: {
  point: ProjectedPoint;
  selected: boolean;
}) {
  return (
    <g aria-label={point.label}>
      {selected ? (
        <circle
          cx={point.x}
          cy={point.y}
          r={14}
          className="fill-emerald-400/20 stroke-emerald-400/40 animate-pulse"
          strokeWidth={1}
        />
      ) : null}
      <circle
        cx={point.x}
        cy={point.y}
        r={6}
        className={cn("stroke-2", geofenceDotClass(point.geofenceStatus))}
      />
    </g>
  );
}

export function SitesLiveMap({
  sites,
  checkedIn,
  selectedSiteId,
  highlightedEmployeeId,
  className,
}: {
  sites: Site[];
  checkedIn: LiveCheckIn[];
  selectedSiteId: string | null;
  highlightedEmployeeId?: string | null;
  className?: string;
}) {
  const projected = useMemo(() => {
    const points = buildMapPoints(sites, checkedIn, selectedSiteId);
    return projectMapPoints(points, MAP_W, MAP_H);
  }, [sites, checkedIn, selectedSiteId]);

  const sitePoints = projected.filter((p) => p.kind === "site");
  const employeePoints = projected.filter((p) => p.kind === "employee");

  const links = useMemo(() => {
    if (!selectedSiteId) return [];
    const site = sitePoints.find((p) => p.id === selectedSiteId);
    if (!site) return [];
    return employeePoints
      .filter((emp) => emp.siteId === selectedSiteId)
      .map((emp) => ({ site, emp }));
  }, [selectedSiteId, sitePoints, employeePoints]);

  if (sites.filter((s) => s.status === "active").length === 0) {
    return (
      <div
        className={cn(
          "flex min-h-[420px] flex-col items-center justify-center rounded-2xl border border-dashed bg-muted/20 p-8 text-center",
          className,
        )}
      >
        <MapPin className="mb-3 size-10 text-muted-foreground/60" />
        <p className="font-medium">No active sites on the map</p>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">
          Add a site to start tracking geofences and live check-ins.
        </p>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border border-slate-800/80 bg-[#0b1220] shadow-inner",
        className,
      )}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(79,70,229,0.12),transparent_65%)]" />
      <div className="absolute inset-x-0 top-0 z-10 flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2 text-xs font-medium text-slate-300">
          <Radio className="size-3.5 text-emerald-400" />
          Live operations map
        </div>
        <div className="flex items-center gap-3 text-[10px] uppercase tracking-wider text-slate-500">
          <span className="flex items-center gap-1">
            <span className="size-2 rounded-full bg-indigo-400" />
            Site
          </span>
          <span className="flex items-center gap-1">
            <span className="size-2 rounded-full bg-emerald-400" />
            On duty
          </span>
          <span className="flex items-center gap-1">
            <span className="size-2 rounded-full bg-sky-400" />
            Field
          </span>
        </div>
      </div>

      <svg
        viewBox={`0 0 ${MAP_W} ${MAP_H}`}
        className="h-full min-h-[420px] w-full"
        role="img"
        aria-label="Live site and employee map"
      >
        <defs>
          <pattern
            id="sites-grid"
            width="28"
            height="28"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M 28 0 L 0 0 0 28"
              fill="none"
              stroke="rgba(148,163,184,0.08)"
              strokeWidth="1"
            />
          </pattern>
          <radialGradient id="sites-map-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(56,189,248,0.08)" />
            <stop offset="100%" stopColor="rgba(15,23,42,0)" />
          </radialGradient>
        </defs>

        <rect width={MAP_W} height={MAP_H} fill="url(#sites-grid)" />
        <rect width={MAP_W} height={MAP_H} fill="url(#sites-map-glow)" />

        {links.map(({ site, emp }) => (
          <line
            key={`${site.id}-${emp.id}`}
            x1={site.x}
            y1={site.y}
            x2={emp.x}
            y2={emp.y}
            stroke="rgba(52,211,153,0.35)"
            strokeWidth={1}
            strokeDasharray="4 3"
          />
        ))}

        {sitePoints.map((point) => (
          <SiteMarker key={point.id} point={point} />
        ))}
        {employeePoints.map((point) => (
          <EmployeeMarker
            key={point.id}
            point={point}
            selected={highlightedEmployeeId === point.id}
          />
        ))}
      </svg>

      {employeePoints.length === 0 ? (
        <div className="pointer-events-none absolute inset-x-0 bottom-14 flex justify-center">
          <div className="rounded-full border border-slate-700/80 bg-slate-900/80 px-3 py-1 text-xs text-slate-400 backdrop-blur-sm">
            <UserRound className="mr-1 inline size-3" />
            No open punches with GPS on the map right now
          </div>
        </div>
      ) : null}
    </div>
  );
}
