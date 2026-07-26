"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { TENANT_HELP_MODULES } from "@/lib/help/tenant-modules";
import type { HelpModule } from "@/lib/help/types";
import { cn } from "@/lib/utils";

export function HelpSidebarNav({
  currentSlug,
  currentModule,
  className,
}: {
  currentSlug?: string;
  currentModule?: HelpModule;
  className?: string;
}) {
  const pathname = usePathname();
  const isHub = pathname === "/help";

  return (
    <nav className={cn("flex flex-col gap-4", className)} aria-label="Help navigation">
      <div>
        <p className="mb-2 px-2 text-[10px] font-mono font-semibold uppercase tracking-wider text-muted-foreground">
          Modules
        </p>
        <ul className="flex flex-col gap-0.5">
          <li>
            <Link
              href="/help"
              className={cn(
                "block rounded-lg px-3 py-2 text-sm transition-colors",
                isHub
                  ? "bg-indigo-500/10 font-medium text-indigo-700 dark:text-indigo-300"
                  : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
              )}
            >
              All guides
            </Link>
          </li>
          {TENANT_HELP_MODULES.map((module) => (
            <li key={module.slug}>
              <Link
                href={`/help/${module.slug}`}
                className={cn(
                  "block rounded-lg px-3 py-2 text-sm transition-colors",
                  currentSlug === module.slug
                    ? "bg-indigo-500/10 font-medium text-indigo-700 dark:text-indigo-300"
                    : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                )}
              >
                {module.title}
              </Link>
            </li>
          ))}
        </ul>
      </div>

      {currentModule ? (
        <div>
          <p className="mb-2 px-2 text-[10px] font-mono font-semibold uppercase tracking-wider text-muted-foreground">
            On this page
          </p>
          <ul className="flex flex-col gap-0.5 border-l border-border pl-3">
            {currentModule.sections.map((section) => (
              <li key={section.id}>
                <a
                  href={`#${section.id}`}
                  className="block rounded-md py-1.5 pr-2 text-xs text-muted-foreground transition-colors hover:text-foreground"
                >
                  {section.title}
                </a>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </nav>
  );
}
