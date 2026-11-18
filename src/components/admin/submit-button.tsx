"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import { Button, type ButtonProps } from "@/components/ui/button";

/**
 * Submit button for React Hook Form based forms.
 *
 * The pending state is always driven from *outside* the button, so it can
 * never stay stuck on "Đang lưu…". RHF resets `isSubmitting` automatically when
 * validation fails or the submit handler returns, so the button follows the
 * real state of the form.
 */
export function SubmitButton({
  children,
  pendingLabel = "Đang lưu…",
  pending = false,
  className,
  variant,
  size,
  ...props
}: ButtonProps & { pendingLabel?: string; pending?: boolean }) {
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
