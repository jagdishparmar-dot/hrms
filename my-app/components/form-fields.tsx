"use client";

import type { ComponentProps } from "react";
import { useEffect, useState } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export function FormField({
  name,
  label,
  type = "text",
  className,
  defaultValue,
  value: valueProp,
  onChange,
  ...props
}: {
  name: string;
  label: string;
  type?: string;
  className?: string;
} & Omit<
  ComponentProps<typeof Input>,
  "name" | "type" | "className" | "defaultValue" | "value" | "onChange"
> & {
    defaultValue?: string | number | readonly string[];
    value?: string | number | readonly string[];
    onChange?: ComponentProps<typeof Input>["onChange"];
  }) {
  const isControlled = valueProp !== undefined;
  const [value, setValue] = useState(() =>
    String(isControlled ? valueProp : (defaultValue ?? "")),
  );

  useEffect(() => {
    if (isControlled) {
      setValue(String(valueProp));
      return;
    }
    setValue(String(defaultValue ?? ""));
  }, [defaultValue, isControlled, valueProp]);

  return (
    <div className={cn("grid gap-2", className)}>
      <Label htmlFor={name}>{label}</Label>
      <Input
        id={name}
        name={name}
        type={type}
        value={value}
        onChange={(event) => {
          if (!isControlled) {
            setValue(event.target.value);
          }
          onChange?.(event);
        }}
        {...props}
      />
    </div>
  );
}

const EMPTY_SELECT_VALUE = "__empty__";

export function FormSelect({
  name,
  label,
  options,
  defaultValue,
  placeholder,
  className,
  required,
  onValueChange,
}: {
  name: string;
  label: string;
  options: { value: string; label: string }[] | string[];
  defaultValue?: string;
  placeholder?: string;
  className?: string;
  required?: boolean;
  onValueChange?: (value: string) => void;
}) {
  const normalized = options.map((o) =>
    typeof o === "string" ? { value: o, label: o } : o,
  );

  const initial =
    defaultValue ??
    (placeholder ? "" : normalized[0]?.value ?? "");

  const [value, setValue] = useState(initial);

  const handleChange = (next: string | null) => {
    const resolved = next === EMPTY_SELECT_VALUE || next === null ? "" : next;
    setValue(resolved);
    onValueChange?.(resolved);
  };

  const selectValue = value || (placeholder ? EMPTY_SELECT_VALUE : undefined);

  return (
    <div className={cn("grid gap-2", className)}>
      <Label htmlFor={name}>{label}</Label>
      <input
        type="hidden"
        name={name}
        value={value}
        required={required && !value}
      />
      <Select value={selectValue} onValueChange={handleChange}>
        <SelectTrigger id={name} className="w-full">
          <SelectValue placeholder={placeholder || "Select…"} />
        </SelectTrigger>
        <SelectContent>
          {placeholder ? (
            <SelectItem value={EMPTY_SELECT_VALUE}>{placeholder}</SelectItem>
          ) : null}
          {normalized.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export function FormCheckbox({
  name,
  label,
  defaultChecked,
  className,
}: {
  name: string;
  label: string;
  defaultChecked?: boolean;
  className?: string;
}) {
  const [checked, setChecked] = useState(Boolean(defaultChecked));

  return (
    <label className={cn("flex items-center gap-2 text-sm", className)}>
      <Checkbox
        checked={checked}
        onCheckedChange={(value) => setChecked(value === true)}
      />
      <input type="hidden" name={name} value={checked ? "on" : ""} />
      <span>{label}</span>
    </label>
  );
}

export function FormTextarea({
  name,
  label,
  className,
  ...props
}: {
  name: string;
  label: string;
  className?: string;
} & Omit<ComponentProps<typeof Textarea>, "name" | "className">) {
  return (
    <div className={cn("grid gap-2", className)}>
      <Label htmlFor={name}>{label}</Label>
      <Textarea id={name} name={name} {...props} />
    </div>
  );
}

export function FormError({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <Alert variant="destructive">
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  );
}

export function FormSuccess({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <Alert>
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  );
}
