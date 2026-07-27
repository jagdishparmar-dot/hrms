import { Building2Icon } from "lucide-react";

import { sanitizeLogoUrl } from "@/lib/branding";
import { cn } from "@/lib/utils";

type CompanyLogoProps = {
  logoUrl?: string | null;
  alt: string;
  variant?: "icon" | "banner";
  label?: string;
  className?: string;
  imageClassName?: string;
  fallbackClassName?: string;
  iconClassName?: string;
};

export function CompanyLogo({
  logoUrl,
  alt,
  variant = "icon",
  label,
  className,
  imageClassName,
  fallbackClassName,
  iconClassName,
}: CompanyLogoProps) {
  const safeUrl = sanitizeLogoUrl(logoUrl);
  const isBanner = variant === "banner";

  if (safeUrl) {
    return (
      <div
        className={cn(
          "flex shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border bg-white",
          isBanner
            ? "h-14 w-full border-border/60 px-3 py-2"
            : undefined,
          className,
        )}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- tenant-provided arbitrary logo hosts */}
        <img
          src={safeUrl}
          alt={alt}
          className={cn(
            isBanner
              ? "max-h-full max-w-full object-contain"
              : "size-full object-contain p-0.5",
            imageClassName,
          )}
          referrerPolicy="no-referrer"
        />
      </div>
    );
  }

  if (isBanner && label) {
    return (
      <div
        className={cn(
          "flex h-14 w-full items-center justify-center overflow-hidden rounded-xl border border-border/60 px-3 py-2",
          fallbackClassName,
        )}
      >
        <span className="truncate text-center text-sm font-semibold text-sidebar-foreground">
          {label}
        </span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center rounded-xl border shadow-sm",
        fallbackClassName,
      )}
    >
      <Building2Icon className={cn("size-4", iconClassName)} />
    </div>
  );
}
