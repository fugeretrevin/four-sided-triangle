import * as React from "react"
import { cn } from "@/lib/utils"

// FieldGroup: wraps a set of form fields with vertical spacing
function FieldGroup({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-slot="field-group"
      className={cn("flex flex-col gap-4", className)}
      {...props}
    />
  )
}

// Field: individual field container, stacks children vertically
function Field({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-slot="field"
      className={cn("flex flex-col gap-2", className)}
      {...props}
    />
  )
}

// FieldLabel: label element for form fields
function FieldLabel({
  className,
  ...props
}: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      data-slot="field-label"
      className={cn(
        "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
        className
      )}
      {...props}
    />
  )
}

// FieldDescription: helper or error text below a field
function FieldDescription({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      data-slot="field-description"
      className={cn("text-sm text-muted-foreground [&_a]:underline [&_a]:underline-offset-4 [&_a:hover]:text-primary", className)}
      {...props}
    />
  )
}

// FieldSeparator: horizontal divider with optional center label text
function FieldSeparator({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-slot="field-separator"
      className={cn("relative flex items-center gap-3", className)}
      {...props}
    >
      <div className="h-px flex-1 bg-border" />
      {children && (
        <span
          data-slot="field-separator-content"
          className="shrink-0 text-xs text-muted-foreground bg-background px-2"
        >
          {children}
        </span>
      )}
      <div className="h-px flex-1 bg-border" />
    </div>
  )
}

export {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
}
