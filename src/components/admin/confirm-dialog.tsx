"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { FormStatusSubmitButton } from "@/components/admin/form-status-submit-button";

/**
 * Confirmation dialog for destructive admin actions.
 *
 * The confirmation copy always states what will be removed and what the
 * consequences are, so an admin never deletes data by accident.
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  consequences,
  confirmLabel = "Xác nhận xoá",
  action,
  hiddenFields,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  consequences?: string[];
  confirmLabel?: string;
  action?: (formData: FormData) => void | Promise<void>;
  hiddenFields?: Record<string, string>;
  children?: React.ReactNode;
}) {
  const router = useRouter();
  const { toast } = useToast();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        {consequences && consequences.length > 0 && (
          <ul className="space-y-1.5 rounded-md border border-rouge-500/30 bg-rouge-500/[0.07] px-4 py-3 text-xs leading-relaxed text-rouge-200">
            {consequences.map((item) => (
              <li key={item} className="flex gap-2">
                <span aria-hidden="true" className="text-rouge-400">
                  •
                </span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        )}

        {children}

        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            Huỷ bỏ
          </Button>
          {action ? (
            <form
              action={async (formData) => {
                try {
                  await action(formData);
                  onOpenChange(false);
                  toast(`Đã thực hiện: ${title.replace(/\?$/, "")}`, "success");
                  router.refresh();
                } catch (err) {
                  toast(
                    err instanceof Error ? err.message : "Không thể thực hiện thao tác xoá.",
                    "error",
                  );
                }
              }}
              className="contents"
            >
              {hiddenFields &&
                Object.entries(hiddenFields).map(([name, value]) => (
                  <input key={name} type="hidden" name={name} value={value} />
                ))}
              <FormStatusSubmitButton variant="destructive" pendingLabel="Đang xoá…">
                {confirmLabel}
              </FormStatusSubmitButton>
            </form>
          ) : (
            <Button type="button" variant="destructive" onClick={() => onOpenChange(false)}>
              {confirmLabel}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
