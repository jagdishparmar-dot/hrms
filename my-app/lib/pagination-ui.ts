export function getVisiblePages(
  current: number,
  total: number,
): Array<number | "ellipsis"> {
  if (total <= 5) {
    return Array.from({ length: total }, (_, index) => index + 1);
  }
  const pages: Array<number | "ellipsis"> = [1];
  if (current > 3) pages.push("ellipsis");
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  for (let page = start; page <= end; page += 1) pages.push(page);
  if (current < total - 2) pages.push("ellipsis");
  if (total > 1) pages.push(total);
  return pages;
}

export function formatMinutesShort(minutes: number) {
  if (minutes <= 0) return "0m";
  const hours = Math.floor(minutes / 60);
  const rem = minutes % 60;
  if (hours === 0) return `${rem}m`;
  return rem > 0 ? `${hours}h ${rem}m` : `${hours}h`;
}

export function resolvePageSize(
  raw: string | undefined,
  options: readonly number[],
  fallback: number,
) {
  const value = Number(raw);
  return options.includes(value as (typeof options)[number]) ? value : fallback;
}
