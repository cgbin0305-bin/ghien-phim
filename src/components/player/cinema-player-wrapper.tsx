"use client";

import * as React from "react";
import { AnimatePresence, MotionConfig, motion } from "framer-motion";
import { cn } from "@/lib/utils";

export interface CinemaPlayerWrapperProps {
  children: React.ReactNode;
  /** Cho phép truyền state từ ngoài vào (controlled) hoặc tự quản lý state isDimmed nội bộ */
  isDimmed?: boolean;
  onDimmedChange?: (dimmed: boolean) => void;
  className?: string;
}

/**
 * 2. <CinemaPlayerWrapper /> (Chế độ Rạp Chiếu Cổ Phong):
 * - Bọc ngoài iframe YouTube/Facebook, quản lý state isDimmed: boolean.
 * - Dùng <AnimatePresence> của Framer Motion render lớp phủ nền đen (bg-black/90, fixed inset-0 z-40)
 *   fade-in mượt mà; đẩy khung iframe và nút công tắc đèn lồng lên z-50 kèm hiệu ứng tỏa sáng
 *   viền vàng kim (box-shadow).
 */
export function CinemaPlayerWrapper({
  children,
  isDimmed: controlledDimmed,
  onDimmedChange,
  className,
}: CinemaPlayerWrapperProps) {
  const [internalDimmed, setInternalDimmed] = React.useState(false);
  const isControlled = controlledDimmed !== undefined;
  const isDimmed = isControlled ? controlledDimmed : internalDimmed;

  const setIsDimmed = React.useCallback(
    (next: boolean) => {
      if (!isControlled) {
        setInternalDimmed(next);
      }
      onDimmedChange?.(next);
    },
    [isControlled, onDimmedChange],
  );

  // Đồng bộ sự kiện toàn cục để AmbientParticles tạm dừng khi bật Rạp Chiếu
  React.useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.dataset.cinemaMode = isDimmed ? "on" : "off";
    }
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("gheienphim:cinema-mode", { detail: { lightsOff: isDimmed } }),
      );
    }

    if (!isDimmed) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsDimmed(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isDimmed, setIsDimmed]);

  const isJsdom =
    typeof navigator !== "undefined" && /jsdom/i.test(navigator.userAgent || "");

  return (
    <MotionConfig reducedMotion="user">
      <div className={cn("cinema-wrapper relative space-y-3", className)}>
        <AnimatePresence>
          {isDimmed && (
            <motion.div
              key="cinema-dimmer-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={isJsdom ? undefined : { opacity: 0 }}
              transition={{ duration: 0.4, ease: "easeInOut" }}
              className="fixed inset-0 z-40 bg-black/90 backdrop-blur-[1.5px]"
              style={{
                backgroundColor: "rgba(0, 0, 0, 0.92)",
                transition: "all 0.4s ease",
              }}
              aria-hidden="true"
              onClick={() => setIsDimmed(false)}
            />
          )}
        </AnimatePresence>

        {children}
      </div>
    </MotionConfig>
  );
}
