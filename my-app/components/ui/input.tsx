import * as React from "react"

import { cn } from "@/lib/utils"

/** Shared border, background, focus, and disabled styles for form controls. */
const formControlClassName =
  "rounded-lg border border-slate-300 bg-white text-slate-900 shadow-sm transition-colors outline-none placeholder:text-slate-400 focus-visible:border-rose-500 focus-visible:ring-2 focus-visible:ring-rose-500/50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500"

const inputClassName = cn(
  formControlClassName,
  "flex h-9 w-full min-w-0 px-3 py-1.5 text-xs md:text-sm",
)

const textareaClassName = cn(
  formControlClassName,
  "field-sizing-content flex min-h-16 w-full resize-none px-3 py-2 text-xs md:text-sm",
)

const selectTriggerClassName = cn(
  formControlClassName,
  "flex w-full items-center justify-between gap-1.5 px-3 py-2 text-xs whitespace-nowrap md:text-sm data-placeholder:text-slate-400 dark:data-placeholder:text-slate-500",
)

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(inputClassName, className)}
      {...props}
    />
  )
}

export {
  Input,
  formControlClassName,
  inputClassName,
  selectTriggerClassName,
  textareaClassName,
}
