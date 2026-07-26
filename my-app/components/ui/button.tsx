import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-lg border border-transparent bg-clip-padding text-xs font-medium whitespace-nowrap transition-all outline-none select-none focus-visible:ring-2 focus-visible:ring-rose-500/50 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default:
          "bg-rose-600 text-white shadow-sm hover:bg-rose-500 dark:bg-rose-600 dark:hover:bg-rose-500",
        outline:
          "border-slate-300 bg-transparent text-slate-900 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-100 dark:hover:bg-slate-800",
        secondary:
          "bg-slate-200 text-slate-900 hover:bg-slate-300 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700",
        ghost:
          "text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800",
        destructive:
          "bg-red-600 text-white shadow-sm hover:bg-red-500",
        link: "text-rose-600 underline-offset-4 hover:underline dark:text-rose-400",
        indigo:
          "bg-indigo-600 text-white font-semibold shadow-sm hover:bg-indigo-500 dark:bg-indigo-600 dark:hover:bg-indigo-500",
        gradient:
          "bg-linear-to-r from-rose-500 to-indigo-600 text-white shadow-md hover:opacity-90",
      },
      size: {
        default: "h-9 gap-1.5 px-4 py-2",
        xs: "h-7 gap-1 px-2.5 text-[11px] [&_svg:not([class*='size-'])]:size-3",
        sm: "h-8 gap-1 px-3",
        lg: "h-10 gap-1.5 rounded-lg px-6 text-sm font-semibold",
        icon: "size-9 p-0",
        "icon-xs": "size-7 [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-8",
        "icon-lg": "size-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  nativeButton,
  render,
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  const resolvedNativeButton =
    nativeButton ?? (render !== undefined ? false : true)

  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      nativeButton={resolvedNativeButton}
      render={render}
      {...props}
    />
  )
}

export { Button, buttonVariants }
