"use client";

import * as React from "react";
import { useState } from "react";

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
  React.ComponentProps<typeof Input>,
  "name" | "type" | "className" | "defaultValue" | "value" | "onChange"
> & {
    defaultValue?: string | number | readonly string[];
    value?: string | number | readonly string[];
    onChange?: React.ComponentProps<typeof Input>["onChange"];
  }) {
  const isControlled = valueProp !== undefined;
  const [uncontrolledValue, setUncontrolledValue] = useState(() =>
    String(defaultValue ?? ""),
  );
  const value = isControlled ? String(valueProp) : uncontrolledValue;

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
            setUncontrolledValue(event.target.value);
          }
          onChange?.(event);
        }}
        {...props}
      />
    </div>
  );
}

const FILTER_ALL_VALUE = "__all__";

export function FilterSelect({
  id,
  label,
  value,
  onValueChange,
  options,
  allLabel,
  className,
  size = "default",
}: {
  id?: string;
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  options: { value: string; label: string }[];
  allLabel?: string;
  className?: string;
  size?: "sm" | "default";
}) {
  const selectValue = value ? value : allLabel ? FILTER_ALL_VALUE : null;

  return (
    <div className={cn("grid gap-1.5", className)}>
      <Label htmlFor={id}>{label}</Label>
      <Select
        value={selectValue}
        onValueChange={(next) => {
          if (!next || next === FILTER_ALL_VALUE) {
            onValueChange("");
            return;
          }
          onValueChange(next);
        }}
      >
        <SelectTrigger id={id} size={size} className="w-full">
          <SelectValue placeholder={allLabel || "Select…"} />
        </SelectTrigger>
        <SelectContent>
          {allLabel ? (
            <SelectItem value={FILTER_ALL_VALUE}>{allLabel}</SelectItem>
          ) : null}
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

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
    typeof o === 'string' ? { value: o, label: o } : o,
  );

  const initial =
    defaultValue ??
    (placeholder ? '' : normalized[0]?.value ?? '');

  const [value, setValue] = useState(initial);

  const handleChange = (next: string | null) => {
    const resolved = next ?? '';
    setValue(resolved);
    onValueChange?.(resolved);
  };

  // Empty optional selects use null so SelectValue shows the placeholder label.
  const selectValue = value ? value : null;

  return (
    <div className={cn('grid gap-2', className)}>
      <Label htmlFor={name}>{label}</Label>
      <Input
        type="hidden"
        name={name}
        value={value}
        required={required && !value}
      />
      <Select value={selectValue} onValueChange={handleChange}>
        <SelectTrigger id={name} className="w-full">
          <SelectValue placeholder={placeholder || 'Select…'} />
        </SelectTrigger>
        <SelectContent>
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
      <Input type="hidden" name={name} value={checked ? "on" : ""} />
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
} & Omit<React.ComponentProps<typeof Textarea>, "name" | "className">) {
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
