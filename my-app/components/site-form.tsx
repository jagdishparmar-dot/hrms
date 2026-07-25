"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { LocateFixed } from "lucide-react";
import { toast } from "sonner";

import { FormError, FormField, FormSelect } from "@/components/form-fields";
import { Button } from "@/components/ui/button";
import { upsertSiteAction } from "@/lib/appwrite/phase1-actions";
import type { Site } from "@/lib/appwrite/types";

export function SiteForm({
  site,
  onSuccess,
  submitLabel,
}: {
  site?: Site;
  onSuccess?: () => void;
  submitLabel?: string;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [locating, setLocating] = useState(false);
  const [coords, setCoords] = useState({
    lat: site ? String(site.lat) : "",
    long: site ? String(site.long) : "",
  });

  function useMyLocation() {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported in this browser.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCoords({
          lat: position.coords.latitude.toFixed(6),
          long: position.coords.longitude.toFixed(6),
        });
        setLocating(false);
        toast.success("Coordinates filled from your location");
      },
      () => {
        setLocating(false);
        toast.error("Unable to read your location. Check browser permissions.");
      },
      { enableHighAccuracy: true, timeout: 12000 },
    );
  }

  return (
    <form
      className="grid gap-4 sm:grid-cols-2"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        setError(null);
        startTransition(async () => {
          const result = await upsertSiteAction(fd);
          if (!result.ok) {
            setError(result.error);
            return;
          }
          toast.success(site ? "Site updated" : "Site created");
          onSuccess?.();
          if (!site) {
            (e.target as HTMLFormElement).reset();
            setCoords({ lat: "", long: "" });
          }
          router.refresh();
        });
      }}
    >
      {site ? <input type="hidden" name="siteId" value={site.id} /> : null}
      <FormField
        name="name"
        label="Site name"
        defaultValue={site?.name}
        required
        placeholder="Head office"
      />
      <FormField
        name="radiusMeters"
        label="Geofence radius (m)"
        type="number"
        min={20}
        max={50000}
        defaultValue={String(site?.radiusMeters ?? 150)}
        required
      />
      <div className="grid gap-2 sm:col-span-2">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-medium">Coordinates</span>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={locating || pending}
            onClick={useMyLocation}
          >
            <LocateFixed className="size-3.5" />
            {locating ? "Locating…" : "Use my location"}
          </Button>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            name="lat"
            label="Latitude"
            type="number"
            step="any"
            required
            value={coords.lat}
            onChange={(e) => setCoords((c) => ({ ...c, lat: e.target.value }))}
          />
          <FormField
            name="long"
            label="Longitude"
            type="number"
            step="any"
            required
            value={coords.long}
            onChange={(e) => setCoords((c) => ({ ...c, long: e.target.value }))}
          />
        </div>
      </div>
      <FormField
        name="address"
        label="Address"
        className="sm:col-span-2"
        defaultValue={site?.address}
        placeholder="Street, city, PIN"
      />
      <FormSelect
        name="status"
        label="Status"
        defaultValue={site?.status || "active"}
        options={[
          { value: "active", label: "Active" },
          { value: "inactive", label: "Inactive" },
        ]}
      />
      <div className="sm:col-span-2">
        <FormError message={error} />
      </div>
      <div className="sm:col-span-2 flex justify-end gap-2">
        <Button type="submit" disabled={pending}>
          {pending
            ? "Saving…"
            : submitLabel || (site ? "Save changes" : "Create site")}
        </Button>
      </div>
    </form>
  );
}
