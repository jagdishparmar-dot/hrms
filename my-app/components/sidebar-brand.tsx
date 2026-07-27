import { CompanyLogo } from "@/components/company-logo";
import { cn } from "@/lib/utils";

type SidebarBrandProps = {
  company: {
    name: string;
    logoUrl?: string;
  };
  mode?: "tenant" | "platform";
};

export function SidebarBrand({ company, mode = "tenant" }: SidebarBrandProps) {
  const isPlatform = mode === "platform";

  const bannerFallbackClass = cn(
    isPlatform
      ? "border-rose-500/25 bg-gradient-to-br from-rose-500/15 to-indigo-500/10"
      : "border-indigo-500/25 bg-gradient-to-br from-indigo-500/15 to-sky-500/10",
  );

  return (
    <div className="group-data-[collapsible=icon]:hidden">
      <CompanyLogo
        logoUrl={company.logoUrl}
        alt={`${company.name} logo`}
        variant="banner"
        label={company.name}
        fallbackClassName={bannerFallbackClass}
      />
    </div>
  );
}
