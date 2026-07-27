"use client";

import { useEffect, useMemo, useRef } from "react";
import L from "leaflet";
import { MapPin, Radio, UserRound } from "lucide-react";

import type { LiveCheckIn } from "@/lib/sites-live";
import {
  buildMapPoints,
  computeMapBounds,
  employeeMarkerColor,
  type MapPoint,
} from "@/lib/sites-live";
import type { Site } from "@/lib/appwrite/types";
import { cn } from "@/lib/utils";

import "leaflet/dist/leaflet.css";

const OSM_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors';

function sitePopupHtml(point: MapPoint, onDuty: number) {
  return `
    <div style="min-width:140px">
      <p style="font-weight:600;margin:0 0 4px">${point.label}</p>
      <p style="margin:0;font-size:12px;color:#64748b">${onDuty} on duty · ${point.radiusMeters ?? 0}m geofence</p>
    </div>
  `;
}

function employeePopupHtml(point: MapPoint) {
  const status =
    point.geofenceStatus === "GPS_ONLY"
      ? "Field"
      : point.geofenceStatus === "OUTSIDE"
        ? "Outside geofence"
        : "Inside geofence";
  return `
    <div style="min-width:140px">
      <p style="font-weight:600;margin:0 0 4px">${point.label}</p>
      <p style="margin:0;font-size:12px;color:#64748b">${status}${point.clockInTime ? ` · in ${point.clockInTime}` : ""}</p>
    </div>
  `;
}

export function SitesLiveMap({
  sites,
  checkedIn,
  selectedSiteId,
  highlightedEmployeeId,
  onSiteSelect,
  className,
}: {
  sites: Site[];
  checkedIn: LiveCheckIn[];
  selectedSiteId: string | null;
  highlightedEmployeeId?: string | null;
  onSiteSelect?: (siteId: string) => void;
  className?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const onSiteSelectRef = useRef(onSiteSelect);
  onSiteSelectRef.current = onSiteSelect;
  const layersRef = useRef<{
    links: L.LayerGroup;
    geofences: L.LayerGroup;
    sites: L.LayerGroup;
    employees: L.LayerGroup;
  } | null>(null);

  const activeSites = useMemo(
    () => sites.filter((site) => site.status === "active"),
    [sites],
  );

  const onDutyBySite = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const row of checkedIn) {
      if (row.siteId) counts[row.siteId] = (counts[row.siteId] || 0) + 1;
    }
    return counts;
  }, [checkedIn]);

  const mapPoints = useMemo(
    () => buildMapPoints(sites, checkedIn, selectedSiteId),
    [sites, checkedIn, selectedSiteId],
  );

  const sitePoints = useMemo(
    () => mapPoints.filter((point) => point.kind === "site"),
    [mapPoints],
  );
  const employeePoints = useMemo(
    () => mapPoints.filter((point) => point.kind === "employee"),
    [mapPoints],
  );

  useEffect(() => {
    if (!containerRef.current || activeSites.length === 0) return;

    if (!mapRef.current) {
      mapRef.current = L.map(containerRef.current, {
        zoomControl: true,
        scrollWheelZoom: true,
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: OSM_ATTRIBUTION,
      }).addTo(mapRef.current);

      layersRef.current = {
        links: L.layerGroup().addTo(mapRef.current),
        geofences: L.layerGroup().addTo(mapRef.current),
        sites: L.layerGroup().addTo(mapRef.current),
        employees: L.layerGroup().addTo(mapRef.current),
      };
    }

    const map = mapRef.current;
    const layers = layersRef.current;
    if (!layers) return;

    layers.links.clearLayers();
    layers.geofences.clearLayers();
    layers.sites.clearLayers();
    layers.employees.clearLayers();

    for (const point of sitePoints) {
      const dimmed = selectedSiteId != null && point.id !== selectedSiteId;
      const selected = selectedSiteId === point.id;
      const opacity = dimmed ? 0.35 : 1;

      if (point.radiusMeters && point.radiusMeters > 0) {
        L.circle([point.lat, point.long], {
          radius: point.radiusMeters,
          color: selected ? "#6366f1" : "#818cf8",
          weight: selected ? 2.5 : 1.5,
          fillColor: "#6366f1",
          fillOpacity: dimmed ? 0.04 : 0.1,
          opacity,
        }).addTo(layers.geofences);
      }

      const marker = L.circleMarker([point.lat, point.long], {
        radius: selected ? 9 : 8,
        color: "#ffffff",
        weight: 2,
        fillColor: selected ? "#4f46e5" : "#6366f1",
        fillOpacity: opacity,
        opacity,
      }).addTo(layers.sites);

      marker.bindPopup(sitePopupHtml(point, onDutyBySite[point.id] || 0));
      marker.on("click", () => onSiteSelectRef.current?.(point.id));
    }

    if (selectedSiteId) {
      const site = sitePoints.find((point) => point.id === selectedSiteId);
      if (site) {
        for (const emp of employeePoints.filter((point) => point.siteId === selectedSiteId)) {
          L.polyline(
            [
              [site.lat, site.long],
              [emp.lat, emp.long],
            ],
            {
              color: "#34d399",
              weight: 2,
              opacity: 0.55,
              dashArray: "5 6",
            },
          ).addTo(layers.links);
        }
      }
    }

    for (const point of employeePoints) {
      const highlighted = highlightedEmployeeId === point.id;
      const color = employeeMarkerColor(point.geofenceStatus);

      if (highlighted) {
        L.circleMarker([point.lat, point.long], {
          radius: 14,
          color,
          weight: 1,
          fillColor: color,
          fillOpacity: 0.18,
          opacity: 0.9,
        }).addTo(layers.employees);
      }

      L.circleMarker([point.lat, point.long], {
        radius: highlighted ? 7 : 6,
        color: "#ffffff",
        weight: 2,
        fillColor: color,
        fillOpacity: 0.95,
      })
        .addTo(layers.employees)
        .bindPopup(employeePopupHtml(point));
    }

    const bounds = computeMapBounds(mapPoints);
    if (bounds) {
      map.fitBounds(L.latLngBounds(bounds.southWest, bounds.northEast), {
        animate: true,
        padding: [36, 36],
        maxZoom: selectedSiteId ? 16 : 15,
      });
    } else if (sitePoints[0]) {
      map.setView([sitePoints[0].lat, sitePoints[0].long], 14, { animate: true });
    }

    requestAnimationFrame(() => {
      map.invalidateSize();
    });
  }, [
    activeSites.length,
    employeePoints,
    highlightedEmployeeId,
    mapPoints,
    onDutyBySite,
    selectedSiteId,
    sitePoints,
  ]);

  useEffect(() => {
    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
      layersRef.current = null;
    };
  }, []);

  if (activeSites.length === 0) {
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
        "relative overflow-hidden rounded-2xl border bg-card shadow-xs",
        className,
      )}
    >
      <div className="absolute inset-x-0 top-0 z-[500] flex items-center justify-between px-4 py-3 pointer-events-none">
        <div className="flex items-center gap-2 rounded-full border bg-background/90 px-3 py-1.5 text-xs font-medium text-foreground shadow-sm backdrop-blur-sm">
          <Radio className="size-3.5 text-emerald-500" />
          Live map · OpenStreetMap
        </div>
        <div className="flex items-center gap-3 rounded-full border bg-background/90 px-3 py-1.5 text-[10px] uppercase tracking-wider text-muted-foreground shadow-sm backdrop-blur-sm">
          <span className="flex items-center gap-1">
            <span className="size-2 rounded-full bg-indigo-500" />
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

      <div ref={containerRef} className="h-[420px] w-full min-h-[420px] z-0" />

      {employeePoints.length === 0 ? (
        <div className="pointer-events-none absolute inset-x-0 bottom-4 z-[500] flex justify-center">
          <div className="rounded-full border bg-background/90 px-3 py-1 text-xs text-muted-foreground shadow-sm backdrop-blur-sm">
            <UserRound className="mr-1 inline size-3" />
            No open punches with GPS on the map right now
          </div>
        </div>
      ) : null}
    </div>
  );
}
