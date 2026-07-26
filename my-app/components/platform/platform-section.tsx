import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

export function PlatformSection({
  title,
  description,
  action,
  children,
  className,
  icon: Icon,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  icon?: LucideIcon;
}) {
  return (
    <section
      className={cn(
        'rounded-2xl border border-border bg-card shadow-sm transition-colors hover:border-rose-500/25',
        className,
      )}
    >
      <div className="flex flex-row items-start justify-between gap-4 border-b border-border/80 px-5 py-4 md:px-6">
        <div className="flex min-w-0 items-start gap-3">
          {Icon ? (
            <div className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-rose-500/20 bg-rose-500/10 text-rose-400">
              <Icon className="size-4" />
            </div>
          ) : null}
          <div className="min-w-0 space-y-1">
            <h2 className="text-base font-bold tracking-tight text-foreground">
              {title}
            </h2>
            {description ? (
              <p className="text-xs leading-relaxed text-muted-foreground">
                {description}
              </p>
            ) : null}
          </div>
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      <div className="px-5 py-4 md:px-6 md:py-5">{children}</div>
    </section>
  );
}

export function PlatformStat({
  label,
  value,
  hint,
  icon: Icon,
  tone = 'rose',
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon?: LucideIcon;
  tone?: 'rose' | 'indigo' | 'emerald' | 'sky' | 'amber';
}) {
  const toneClass = {
    rose: 'border-rose-500/20 bg-rose-500/10 text-rose-400 hover:border-rose-500/40',
    indigo:
      'border-indigo-500/20 bg-indigo-500/10 text-indigo-400 hover:border-indigo-500/40',
    emerald:
      'border-emerald-500/20 bg-emerald-500/10 text-emerald-400 hover:border-emerald-500/40',
    sky: 'border-sky-500/20 bg-sky-500/10 text-sky-400 hover:border-sky-500/40',
    amber:
      'border-amber-500/20 bg-amber-500/10 text-amber-400 hover:border-amber-500/40',
  }[tone];

  const hintClass = {
    rose: 'text-rose-300',
    indigo: 'text-indigo-300',
    emerald: 'text-emerald-400',
    sky: 'text-sky-400',
    amber: 'text-amber-400',
  }[tone];

  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-sm transition-all hover:border-rose-500/30 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-1">
          <p className="text-xs font-medium text-muted-foreground">{label}</p>
          <p className="font-mono text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            {value}
          </p>
          {hint ? (
            <p className={cn('text-[11px] font-medium', hintClass)}>{hint}</p>
          ) : null}
        </div>
        {Icon ? (
          <div
            className={cn(
              'flex size-10 shrink-0 items-center justify-center rounded-xl border',
              toneClass.split(' hover:')[0],
            )}
          >
            <Icon className="size-5" />
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function PlatformTableShell({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'overflow-x-auto rounded-2xl border border-border bg-background/40',
        className,
      )}
    >
      {children}
    </div>
  );
}

export function PlatformStatusBadge({
  status,
  className,
}: {
  status: string;
  className?: string;
}) {
  const normalized = status.toLowerCase();
  const styles: Record<string, string> = {
    active:
      'border-emerald-500/30 bg-emerald-500/10 text-emerald-400',
    suspended: 'border-rose-500/30 bg-rose-500/10 text-rose-400',
    pending: 'border-amber-500/30 bg-amber-500/10 text-amber-400',
    archived: 'border-slate-500/30 bg-slate-500/10 text-slate-300',
    protected: 'border-rose-500/30 bg-rose-500/10 text-rose-300',
  };
  const style =
    styles[normalized] ||
    'border-border bg-muted/50 text-muted-foreground';

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-semibold capitalize',
        style,
        className,
      )}
    >
      {(normalized === 'active' || normalized === 'connected') && (
        <span className="size-1.5 rounded-full bg-current animate-pulse" />
      )}
      {status.replaceAll('_', ' ')}
    </span>
  );
}

export function PlatformPageBanner({
  badge,
  title,
  description,
  action,
  icon: Icon,
}: {
  badge: string;
  title: string;
  description: string;
  action?: ReactNode;
  icon?: LucideIcon;
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-linear-to-br from-white via-rose-100/30 to-indigo-50 p-6 shadow-xl dark:border-border dark:from-card dark:via-rose-950/20 dark:to-card md:p-8">
      <div className="pointer-events-none absolute top-0 right-0 h-64 w-64 rounded-full bg-rose-500/10 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 left-1/3 h-48 w-48 rounded-full bg-indigo-500/10 blur-3xl" />

      <div className="relative z-10 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-500/30 bg-rose-500/10 px-2.5 py-0.5 text-[10px] font-mono font-semibold uppercase tracking-wider text-rose-300">
              {Icon ? <Icon className="size-3.5 text-rose-400" /> : null}
              {badge}
            </span>
          </div>
          <h2 className="text-xl font-bold tracking-tight text-foreground md:text-2xl">
            {title}
          </h2>
          <p className="max-w-2xl text-xs leading-relaxed text-muted-foreground md:text-sm">
            {description}
          </p>
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
    </div>
  );
}

export function PlatformNavGrid({
  items,
}: {
  items: { label: string; href: string }[];
}) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {items.map((item) => (
        <a
          key={item.href}
          href={item.href}
          className="flex items-center justify-between rounded-xl border border-border bg-background/50 px-3.5 py-2.5 text-sm font-medium text-foreground transition-colors hover:border-rose-500/40 hover:bg-muted/40"
        >
          <span>{item.label}</span>
          <span className="text-xs text-rose-400">→</span>
        </a>
      ))}
    </div>
  );
}

export function PlatformInfoList({
  items,
}: {
  items: ReactNode[];
}) {
  return (
    <ul className="space-y-2.5 text-sm text-muted-foreground">
      {items.map((item, i) => (
        <li
          key={i}
          className="flex gap-2 rounded-xl border border-border/60 bg-background/30 px-3 py-2.5 leading-relaxed"
        >
          <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-rose-500/80" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

export function PlatformKeyValueList({
  items,
}: {
  items: { label: string; value: ReactNode; mono?: boolean }[];
}) {
  return (
    <dl className="space-y-2.5 text-sm">
      {items.map((item) => (
        <div
          key={item.label}
          className="flex justify-between gap-4 rounded-xl border border-border/60 bg-background/30 px-3 py-2.5"
        >
          <dt className="text-muted-foreground">{item.label}</dt>
          <dd
            className={cn(
              'text-right text-foreground',
              item.mono && 'font-mono text-xs',
            )}
          >
            {item.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

export function PlatformIntegrationRow({
  name,
  detail,
  status = 'Connected',
}: {
  name: string;
  detail: string;
  status?: string;
}) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-border bg-background/40 px-3.5 py-3 transition-colors hover:border-rose-500/30">
      <div className="min-w-0">
        <p className="font-semibold text-foreground">{name}</p>
        <p className="truncate font-mono text-xs text-muted-foreground">
          {detail}
        </p>
      </div>
      <PlatformStatusBadge status={status === 'Connected' ? 'active' : status} />
    </div>
  );
}
