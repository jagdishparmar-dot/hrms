"use client";

import { Moon, Sun } from "lucide-react";

import { useTheme } from "@/components/theme-provider";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function ThemeToggle({
  className,
  showLabel = true,
}: {
  className?: string;
  showLabel?: boolean;
}) {
  const { theme, toggleTheme } = useTheme();
  const isLight = theme === "light";

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={toggleTheme}
      aria-label={`Switch to ${isLight ? "dark" : "light"} mode`}
      title={`Switch to ${isLight ? "dark" : "light"} mode`}
      className={cn(
        "gap-2 border-slate-300 bg-slate-100 font-semibold text-slate-800 hover:bg-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700",
        className,
      )}
    >
      {isLight ? (
        <Sun className="size-4 text-amber-500" />
      ) : (
        <Moon className="size-4 text-indigo-400" />
      )}
      {showLabel ? (
        <span className="hidden font-mono text-xs sm:inline">
          {isLight ? "Light" : "Dark"}
        </span>
      ) : null}
    </Button>
  );
}
