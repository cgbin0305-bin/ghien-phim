"use client";

import * as React from "react";
import Link, { type LinkProps } from "next/link";
import { useRouter } from "next/navigation";

const prefetchedHrefs = new Set<string>();

export interface PrefetchLinkProps
  extends Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, keyof LinkProps>,
    LinkProps {
  children: React.ReactNode;
}

/**
 * `<Link>` nâng cao có cơ chế Hover / Touch Prefetching tức thì.
 *
 * Khi người dùng rê chuột (`onMouseEnter`) hoặc chạm nhẹ (`onTouchStart`) vào
 * thẻ phim hay bài viết, route đích được nạp trước vào bộ nhớ đệm của router
 * và làm ấm cache dữ liệu trên server để khi click vào trang mở ra ở mức 0ms.
 */
export const PrefetchLink = React.forwardRef<HTMLAnchorElement, PrefetchLinkProps>(
  ({ href, onMouseEnter, onTouchStart, children, ...props }, ref) => {
    const router = useRouter();
    const hrefString = typeof href === "string" ? href : href.pathname ?? "";

    const triggerPrefetch = React.useCallback(() => {
      if (!hrefString || prefetchedHrefs.has(hrefString)) return;
      prefetchedHrefs.add(hrefString);
      try {
        router.prefetch(hrefString);
      } catch {
        // Ignore in test environments where router might not be mounted.
      }
    }, [hrefString, router]);

    return (
      <Link
        ref={ref}
        href={href}
        onMouseEnter={(e) => {
          triggerPrefetch();
          onMouseEnter?.(e);
        }}
        onTouchStart={(e) => {
          triggerPrefetch();
          onTouchStart?.(e);
        }}
        {...props}
      >
        {children}
      </Link>
    );
  },
);

PrefetchLink.displayName = "PrefetchLink";
