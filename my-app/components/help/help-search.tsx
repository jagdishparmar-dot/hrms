"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { SearchIcon, XIcon } from "lucide-react";

import { Input } from "@/components/ui/input";
import { searchHelpModules } from "@/lib/help/search";
import { cn } from "@/lib/utils";

type HelpSearchProps = {
  className?: string;
  placeholder?: string;
  onNavigate?: () => void;
  query?: string;
  onQueryChange?: (query: string) => void;
  showDropdown?: boolean;
};

export function HelpSearch({
  className,
  placeholder = "Search guides…",
  onNavigate,
  query: controlledQuery,
  onQueryChange,
  showDropdown = true,
}: HelpSearchProps) {
  const [internalQuery, setInternalQuery] = useState("");
  const query = controlledQuery ?? internalQuery;
  const setQuery = onQueryChange ?? setInternalQuery;

  const results = useMemo(() => searchHelpModules(query), [query]);
  const showResults = showDropdown && query.trim().length > 0;

  return (
    <div className={cn("relative", className)}>
      <div className="relative">
        <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          className="pl-9 pr-9"
          aria-label="Search help documentation"
        />
        {query ? (
          <button
            type="button"
            onClick={() => setQuery("")}
            className="absolute top-1/2 right-3 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            aria-label="Clear search"
          >
            <XIcon className="size-4" />
          </button>
        ) : null}
      </div>

      {showResults ? (
        <div className="absolute z-20 mt-2 w-full overflow-hidden rounded-xl border bg-popover shadow-lg">
          {results.length === 0 ? (
            <p className="px-4 py-3 text-sm text-muted-foreground">
              No topics found — try &quot;roster&quot;, &quot;geofence&quot;, or &quot;payroll&quot;.
            </p>
          ) : (
            <ul className="max-h-72 overflow-y-auto py-1">
              {results.map((result) => (
                <li key={`${result.slug}-${result.sectionId ?? "module"}`}>
                  <Link
                    href={result.href}
                    onClick={() => {
                      setQuery("");
                      onNavigate?.();
                    }}
                    className="block px-4 py-2.5 hover:bg-muted/60"
                  >
                    <div className="text-sm font-medium">{result.moduleTitle}</div>
                    {result.sectionTitle ? (
                      <div className="text-xs text-muted-foreground">{result.sectionTitle}</div>
                    ) : null}
                    <div className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                      {result.snippet}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}
