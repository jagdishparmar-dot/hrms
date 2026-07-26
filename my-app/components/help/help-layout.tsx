import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export function HelpLayout({
  sidebar,
  children,
  className,
}: {
  sidebar: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-8 xl:grid-cols-[240px_minmax(0,1fr)]",
        className,
      )}
    >
      <aside className="lg:sticky lg:top-6 lg:self-start">{sidebar}</aside>
      <div className="min-w-0">{children}</div>
    </div>
  );
}
