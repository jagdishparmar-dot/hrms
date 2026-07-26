"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

import { HelpModuleCard } from "@/components/help/help-module-card";
import { HelpSearch } from "@/components/help/help-search";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { filterHelpModules } from "@/lib/help/search";
import { TENANT_HELP_MODULES } from "@/lib/help/tenant-modules";

export function HelpHubContent() {
  const [query, setQuery] = useState("");
  const modules = useMemo(
    () => filterHelpModules(query, TENANT_HELP_MODULES),
    [query],
  );
  const gettingStarted = TENANT_HELP_MODULES.find((m) => m.slug === "getting-started");
  const gridModules = modules.filter((m) => m.slug !== "getting-started");

  return (
    <div className="flex flex-col gap-6">
      <HelpSearch
        className="max-w-md"
        query={query}
        onQueryChange={setQuery}
      />

      {gettingStarted && !query.trim() ? (
        <Card className="border-indigo-500/20 bg-indigo-500/5 shadow-xs">
          <CardHeader>
            <Badge variant="secondary" className="w-fit">
              Start here
            </Badge>
            <CardTitle className="text-base">{gettingStarted.title}</CardTitle>
            <CardDescription>{gettingStarted.summary}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              size="sm"
              nativeButton={false}
              render={<Link href={`/help/${gettingStarted.slug}`} />}
            >
              View setup guide
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {modules.length === 0 ? (
        <p className="rounded-xl border border-dashed py-10 text-center text-sm text-muted-foreground">
          No guides match your search — try &quot;roster&quot;, &quot;geofence&quot;, or &quot;payroll&quot;.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {(query.trim() ? modules : gridModules).map((module) => (
            <HelpModuleCard key={module.slug} module={module} />
          ))}
        </div>
      )}
    </div>
  );
}
