import type { HelpModule, HelpSearchResult } from "@/lib/help/types";
import { TENANT_HELP_MODULES } from "@/lib/help/tenant-modules";
import { SHIFT_FIELD_GUIDE, SHIFT_PRESETS } from "@/lib/help/shift-field-guide";

function collectSectionText(section: HelpModule["sections"][number]): string {
  const parts: string[] = [
    section.title,
    ...(section.paragraphs ?? []),
    ...(section.steps ?? []),
    ...(section.bullets ?? []),
    ...(section.workflows?.flatMap((w) => [w.title, ...w.steps]) ?? []),
    section.callout ?? "",
  ];
  return parts.join(" ").toLowerCase();
}

function moduleSearchText(module: HelpModule): string {
  const sectionText = module.sections.map(collectSectionText).join(" ");
  const shiftExtra =
    module.slug === "shifts"
      ? [
          ...SHIFT_PRESETS.flatMap((p) => [p.name, p.code, p.notes]),
          ...SHIFT_FIELD_GUIDE.flatMap((f) => [f.field, f.help]),
        ].join(" ")
      : "";
  return [
    module.title,
    module.summary,
    ...module.keywords,
    sectionText,
    shiftExtra,
  ]
    .join(" ")
    .toLowerCase();
}

export function searchHelpModules(
  query: string,
  modules: HelpModule[] = TENANT_HELP_MODULES,
): HelpSearchResult[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  const results: HelpSearchResult[] = [];

  for (const module of modules) {
    const haystack = moduleSearchText(module);
    if (!haystack.includes(q)) continue;

    const sectionMatch = module.sections.find((s) =>
      collectSectionText(s).includes(q),
    );

    const snippet =
      sectionMatch?.paragraphs?.[0] ??
      sectionMatch?.steps?.[0] ??
      sectionMatch?.bullets?.[0] ??
      module.summary;

    results.push({
      slug: module.slug,
      moduleTitle: module.title,
      sectionId: sectionMatch?.id,
      sectionTitle: sectionMatch?.title,
      snippet,
      href: sectionMatch
        ? `/help/${module.slug}#${sectionMatch.id}`
        : `/help/${module.slug}`,
    });
  }

  return results;
}

export function filterHelpModules(
  query: string,
  modules: HelpModule[] = TENANT_HELP_MODULES,
): HelpModule[] {
  const q = query.trim().toLowerCase();
  if (!q) return modules;
  return modules.filter((m) => moduleSearchText(m).includes(q));
}

export function filterHelpSections(
  module: HelpModule,
  query: string,
): HelpModule["sections"] {
  const q = query.trim().toLowerCase();
  if (!q) return module.sections;
  return module.sections.filter((s) => collectSectionText(s).includes(q));
}
