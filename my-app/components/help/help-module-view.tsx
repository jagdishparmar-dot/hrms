"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ExternalLinkIcon, SearchIcon, XIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  SHIFT_FIELD_GUIDE,
  SHIFT_PRESETS,
  SHIFT_PUNCH_WINDOW_FORMULA,
} from "@/lib/help/shift-field-guide";
import { filterHelpSections } from "@/lib/help/search";
import { getHelpModule } from "@/lib/help/tenant-modules";
import type { HelpModule, HelpSection } from "@/lib/help/types";
import { cn } from "@/lib/utils";

function HelpSectionBlock({ section }: { section: HelpSection }) {
  return (
    <section id={section.id} className="scroll-mt-6 space-y-3">
      <h2 className="text-lg font-semibold tracking-tight">{section.title}</h2>

      {section.paragraphs?.map((p) => (
        <p key={p.slice(0, 40)} className="text-sm leading-relaxed text-muted-foreground">
          {p}
        </p>
      ))}

      {section.steps?.length ? (
        <ol className="list-decimal space-y-2 pl-5 text-sm text-muted-foreground">
          {section.steps.map((step) => (
            <li key={step.slice(0, 40)} className="leading-relaxed">
              {step}
            </li>
          ))}
        </ol>
      ) : null}

      {section.bullets?.length ? (
        <ul className="list-disc space-y-1.5 pl-5 text-sm text-muted-foreground">
          {section.bullets.map((bullet) => (
            <li key={bullet.slice(0, 40)} className="leading-relaxed">
              {bullet}
            </li>
          ))}
        </ul>
      ) : null}

      {section.workflows?.map((workflow) => (
        <div
          key={workflow.title}
          className="rounded-xl border bg-muted/20 px-4 py-3"
        >
          <div className="mb-2 flex items-center gap-2">
            <Badge variant="outline" className="text-[10px]">
              Workflow
            </Badge>
            <span className="text-sm font-medium">{workflow.title}</span>
          </div>
          <ol className="list-decimal space-y-1.5 pl-5 text-sm text-muted-foreground">
            {workflow.steps.map((step) => (
              <li key={step.slice(0, 40)} className="leading-relaxed">
                {step}
              </li>
            ))}
          </ol>
        </div>
      ))}

      {section.callout ? (
        <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/5 px-4 py-3 text-sm text-muted-foreground">
          {section.callout}
        </div>
      ) : null}
    </section>
  );
}

function ShiftFieldReference() {
  return (
    <div className="space-y-6">
      <section id="shift-presets" className="scroll-mt-6 space-y-3">
        <h2 className="text-lg font-semibold tracking-tight">Example shifts</h2>
        <div className="overflow-x-auto rounded-xl border">
          <table className="w-full min-w-[520px] text-left text-xs">
            <thead className="border-b bg-muted/30 text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium">Preset</th>
                <th className="px-3 py-2 font-medium">Code</th>
                <th className="px-3 py-2 font-medium">Type</th>
                <th className="px-3 py-2 font-medium">Start</th>
                <th className="px-3 py-2 font-medium">End</th>
                <th className="px-3 py-2 font-medium">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {SHIFT_PRESETS.map((preset) => (
                <tr key={preset.code}>
                  <td className="px-3 py-2 font-medium">{preset.name}</td>
                  <td className="px-3 py-2 font-mono">{preset.code}</td>
                  <td className="px-3 py-2">{preset.type}</td>
                  <td className="px-3 py-2 font-mono">{preset.start}</td>
                  <td className="px-3 py-2 font-mono">{preset.end}</td>
                  <td className="px-3 py-2 text-muted-foreground">{preset.notes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section id="shift-punch-windows" className="scroll-mt-6 space-y-3">
        <h2 className="text-lg font-semibold tracking-tight">Punch windows</h2>
        <div className="rounded-xl border bg-muted/20 px-4 py-3 font-mono text-xs leading-relaxed text-muted-foreground">
          <p>{SHIFT_PUNCH_WINDOW_FORMULA.punchIn}</p>
          <p>{SHIFT_PUNCH_WINDOW_FORMULA.punchOut}</p>
        </div>
        <p className="text-sm text-muted-foreground">
          Defaults (120 min before, 240 min after) suit most day shifts. Night shifts often need a
          larger Out window after (e.g. 360–480) so employees can punch out after midnight.
        </p>
      </section>

      <section id="shift-field-reference" className="scroll-mt-6 space-y-3">
        <h2 className="text-lg font-semibold tracking-tight">Catalog field reference</h2>
        <div className="space-y-2">
          {SHIFT_FIELD_GUIDE.map((item) => (
            <div key={item.field} className="rounded-xl border px-3 py-2.5">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="text-sm font-medium">{item.field}</span>
                <span className="font-mono text-xs text-muted-foreground">
                  e.g. {item.example}
                </span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{item.help}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

export function HelpModuleView({ module }: { module: HelpModule }) {
  const [query, setQuery] = useState("");
  const sections = useMemo(
    () => filterHelpSections(module, query),
    [module, query],
  );

  const relatedModules = (module.relatedSlugs ?? [])
    .map((slug) => getHelpModule(slug))
    .filter(Boolean) as HelpModule[];

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">{module.summary}</p>
          {module.appRoute ? (
            <Button
              size="sm"
              variant="outline"
              nativeButton={false}
              render={<Link href={module.appRoute} />}
            >
              Go to {module.title}
              <ExternalLinkIcon className="size-3.5" />
            </Button>
          ) : null}
        </div>
        <div className="relative w-full sm:max-w-xs">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter this guide…"
            className="pl-9 pr-9"
            aria-label="Filter sections in this guide"
          />
          {query ? (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="absolute top-1/2 right-3 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label="Clear filter"
            >
              <XIcon className="size-4" />
            </button>
          ) : null}
        </div>
      </div>

      {sections.length === 0 ? (
        <p className="rounded-xl border border-dashed py-8 text-center text-sm text-muted-foreground">
          No sections match your filter.
        </p>
      ) : (
        <div className="flex flex-col gap-8">
          {sections.map((section) => (
            <HelpSectionBlock key={section.id} section={section} />
          ))}
        </div>
      )}

      {module.slug === "shifts" && !query.trim() ? <ShiftFieldReference /> : null}

      {relatedModules.length > 0 ? (
        <section className={cn("border-t pt-6")}>
          <h2 className="mb-3 text-sm font-semibold">Related guides</h2>
          <div className="flex flex-wrap gap-2">
            {relatedModules.map((related) => (
              <Button
                key={related.slug}
                size="sm"
                variant="ghost"
                nativeButton={false}
                className="h-8"
                render={<Link href={`/help/${related.slug}`} />}
              >
                {related.title}
              </Button>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
