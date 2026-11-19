"use client";

import * as React from "react";
import { MotionConfig, motion } from "framer-motion";
import { cn } from "@/lib/utils";

export interface StaggeredMovieGridProps {
  children: React.ReactNode;
  className?: string;
  /** Độ trễ nối tiếp giữa mỗi thẻ phim (mặc định 70ms => 0.07s). */
  staggerMs?: number;
}

const STAGGER_EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

/**
 * 6. <StaggerMovieRow /> (Danh Sách Phim Trôi Lên Nối Đuôi):
 * - Mỗi thẻ phim trôi nhẹ từ dưới lên (opacity: 0, y: 28 -> opacity: 1, y: 0)
 *   với độ trễ nối tiếp nhau (stagger 0.07s).
 * - Gắn whileInView trực tiếp lên từng thẻ con để khi lọc nhanh (Instant Filter 4 -> 8 phim)
 *   hoặc khi danh sách có nhiều hàng, mọi thẻ phim mới mount đều hiển thị đầy đủ 100%,
 *   không bao giờ bị kẹt ở trạng thái ẩn (opacity: 0).
 */
export function StaggerMovieRow({
  children,
  className,
  staggerMs = 70,
}: StaggeredMovieGridProps) {
  const staggerSeconds = staggerMs / 1000;
  const items = React.Children.toArray(children);
  const hasIntersectionObserver = typeof IntersectionObserver !== "undefined";

  return (
    <MotionConfig reducedMotion="never">
      <div
        data-testid="staggered-movie-grid"
        className={cn(
          "grid grid-cols-1 gap-x-5 gap-y-7 sm:grid-cols-2 lg:grid-cols-3",
          className,
        )}
      >
        {items.map((child, index) => {
          const itemKey =
            React.isValidElement(child) && child.key != null
              ? String(child.key)
              : index;
          const delaySeconds = (index % 6) * staggerSeconds;

          return (
            <motion.div
              key={itemKey}
              initial={{ opacity: 0, y: 28 }}
              {...(hasIntersectionObserver
                ? {
                    whileInView: { opacity: 1, y: 0 },
                    viewport: { once: true, amount: 0.05 },
                  }
                : {
                    animate: { opacity: 1, y: 0 },
                  })}
              transition={{
                duration: 0.52,
                delay: delaySeconds,
                ease: STAGGER_EASE,
              }}
              className="mist-stagger-item flex flex-col"
            >
              {child}
            </motion.div>
          );
        })}
      </div>
    </MotionConfig>
  );
}

export const StaggeredMovieGrid = StaggerMovieRow;
