"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, MotionConfig, motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface RippleItem {
  id: number;
  x: number;
  y: number;
}

export interface SealStampButtonProps {
  children: React.ReactNode;
  href?: string;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  className?: string;
  variant?: "cinnabar" | "gold" | "outline";
  tabIndex?: number;
  disabled?: boolean;
  title?: string;
  ariaLabel?: string;
}

/**
 * 5. <SealStampButton /> (Nút Bấm Đóng Ấn Triện):
 * - Dùng motion.button với whileTap={{ scale: 0.92 }}.
 * - Khi onClick(e: React.MouseEvent<HTMLButtonElement>): tính tọa độ click tương đối,
 *   thêm object { id, x, y } vào state ripples để render các vòng sóng đỏ chu sa (#DC2626)
 *   phóng to scale: 4 và mờ dần (opacity: 0) bằng Framer Motion, đồng thời kích hoạt
 *   animation rung nhẹ x: [0, -3, 3, -2, 0] trong 0.15s.
 */
export function SealStampButton({
  children,
  href,
  onClick,
  className,
  variant = "cinnabar",
  tabIndex,
  disabled = false,
  title,
  ariaLabel,
}: SealStampButtonProps) {
  const router = useRouter();
  const [ripples, setRipples] = React.useState<RippleItem[]>([]);
  const [shaking, setShaking] = React.useState(false);
  const nextIdRef = React.useRef(1);

  const handlePrefetch = React.useCallback(() => {
    if (!href || disabled) return;
    try {
      router.prefetch(href);
    } catch {
      // Bỏ qua trong môi trường test
    }
  }, [href, disabled, router]);

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    if (disabled) return;

    const rect = event.currentTarget.getBoundingClientRect();
    const isKeyboard = event.clientX === 0 && event.clientY === 0;
    const x = isKeyboard ? rect.width / 2 : event.clientX - rect.left;
    const y = isKeyboard ? rect.height / 2 : event.clientY - rect.top;

    const id = nextIdRef.current++;
    setRipples((prev) => [...prev.slice(-3), { id, x, y }]);
    setShaking(true);

    window.setTimeout(() => {
      setShaking(false);
    }, 160);

    window.setTimeout(() => {
      setRipples((prev) => prev.filter((item) => item.id !== id));
    }, 560);

    onClick?.(event);

    if (href) {
      // Cho phép hiệu ứng đóng ấn triện (0.15s) và sóng chu sa kịp bung ra rõ ràng trước khi chuyển trang
      window.setTimeout(() => {
        try {
          router.push(href);
        } catch {
          window.location.href = href;
        }
      }, 160);
    }
  };

  const variantClasses =
    variant === "cinnabar"
      ? "btn-cinnabar text-parchment-100"
      : variant === "gold"
        ? "border border-gold-300/80 bg-gradient-to-b from-gold-300 to-gold-500 text-ink-950 font-semibold shadow-[0_4px_20px_-4px_rgba(212,175,55,0.6)] hover:from-gold-200 hover:to-gold-400"
        : "border border-gold-500/45 bg-ink-900/85 text-gold-200 hover:border-gold-400/80 hover:bg-gold-500/12";

  return (
    <MotionConfig reducedMotion="user">
      <motion.button
        type="button"
        tabIndex={tabIndex}
        disabled={disabled}
        title={title}
        aria-label={ariaLabel}
        onMouseEnter={handlePrefetch}
        onFocus={handlePrefetch}
        onClick={handleClick}
        whileTap={{ scale: 0.92 }}
        animate={shaking ? { x: [0, -3, 3, -2, 0] } : { x: 0 }}
        transition={{ duration: 0.15, ease: "easeInOut" }}
        className={cn(
          "btn-seal-stamp relative inline-flex cursor-pointer items-center justify-center gap-2 overflow-hidden rounded-lg px-4 py-2 text-xs font-semibold tracking-wide select-none",
          variantClasses,
          shaking && "btn-seal-stamp-shaking",
          disabled && "pointer-events-none opacity-50",
          className,
        )}
      >
        {children}

        <AnimatePresence>
          {ripples.map((ripple) => (
            <motion.span
              key={ripple.id}
              aria-hidden="true"
              initial={{ scale: 0.2, opacity: 0.95 }}
              animate={{ scale: 4, opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.52, ease: [0.16, 1, 0.3, 1] }}
              className="seal-ripple-wave pointer-events-none absolute size-12 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-gold-200"
              style={{
                left: `${ripple.x}px`,
                top: `${ripple.y}px`,
                backgroundColor: "rgba(220, 38, 38, 0.72)",
                boxShadow: "0 0 22px #DC2626",
              }}
            />
          ))}
        </AnimatePresence>
      </motion.button>
    </MotionConfig>
  );
}
