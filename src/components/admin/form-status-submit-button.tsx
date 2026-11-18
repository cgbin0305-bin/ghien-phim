"use client";

import * as React from "react";
import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";
import { Button, type ButtonProps } from "@/components/ui/button";

/**
 * Submit button for plain HTML forms (`<form action={serverAction}>`).
 *
 * React 19's `useFormStatus()` reports `pending` while the server action runs,
 * so the button can never stay stuck on "Đang lưu…". The hook must be called
 * from a component rendered *inside* the `<form>`, hence this wrapper.
 */
export function FormStatusSubmitButton({
  children,
  pendingLabel = "Đang lưu…",
  className,
  variant,
  size,
  ...props
}: ButtonProps & { pendingLabel?: string }) {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      className={className}
      variant={variant}
      size={size}
      disabled={pending || props.disabled}
      {...props}
    >
      {pending && <Loader2 className="animate-spin" aria-hidden="true" />}
      {pending ? pendingLabel : children}
    </Button>
  );
}
