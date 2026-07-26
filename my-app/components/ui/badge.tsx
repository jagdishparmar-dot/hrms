import { mergeProps } from "@base-ui/react/merge-props"
import { useRender } from "@base-ui/react/use-render"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "group/badge inline-flex h-5 w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-full border px-2.5 py-0.5 text-[10px] font-mono font-semibold whitespace-nowrap transition-all focus-visible:ring-2 focus-visible:ring-rose-400/50 [&>svg]:pointer-events-none [&>svg]:size-3!",
  {
    variants: {
      variant: {
        default:
          "border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400",
        secondary:
          "border-slate-300 bg-slate-100 text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200",
        destructive:
          "border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400",
        outline:
          "border-slate-300 text-slate-700 dark:border-slate-700 dark:text-slate-300",
        emerald:
          "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
        indigo:
          "border-indigo-500/30 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400",
        amber:
          "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400",
        ghost:
          "border-transparent bg-transparent text-muted-foreground",
        link: "border-transparent text-primary underline-offset-4 hover:underline",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant = "default",
  render,
  ...props
}: useRender.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return useRender({
    defaultTagName: "span",
    props: mergeProps<"span">(
      {
        className: cn(badgeVariants({ variant }), className),
      },
      props
    ),
    render,
    state: {
      slot: "badge",
      variant,
    },
  })
}

export { Badge, badgeVariants }
