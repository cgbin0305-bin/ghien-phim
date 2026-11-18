import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface PaginationProps {
  page: number;
  totalPages: number;
  searchParams: Record<string, string | undefined>;
}

function buildHref(page: number, searchParams: Record<string, string | undefined>): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams)) {
    if (!value) continue;
    if (key === "page") continue;
    params.set(key, value);
  }
  if (page > 1) params.set("page", String(page));
  const query = params.toString();
  return query ? `/phim?${query}` : "/phim";
}

export function Pagination({ page, totalPages, searchParams }: PaginationProps) {
  if (totalPages <= 1) return null;

  // Show a compact window around the current page.
  const windowSize = 2;
  const start = Math.max(1, page - windowSize);
  const end = Math.min(totalPages, page + windowSize);
  const pages: number[] = [];
  for (let i = start; i <= end; i += 1) pages.push(i);

  return (
    <nav aria-label="Phân trang" className="mt-10 flex items-center justify-center gap-1.5">
      {page > 1 ? (
        <Link
          href={buildHref(page - 1, searchParams)}
          rel="prev"
          className="inline-flex size-9 items-center justify-center rounded-md border border-ink-700 text-parchment-300 transition-colors hover:border-gold-500/40 hover:text-gold-200"
        >
          <ChevronLeft className="size-4" aria-hidden="true" />
          <span className="sr-only">Trang trước</span>
        </Link>
      ) : (
        <span className="inline-flex size-9 items-center justify-center rounded-md border border-ink-800 text-mist-400">
          <ChevronLeft className="size-4" aria-hidden="true" />
          <span className="sr-only">Trang trước</span>
        </span>
      )}

      {start > 1 && (
        <>
          <Link
            href={buildHref(1, searchParams)}
            className="inline-flex size-9 items-center justify-center rounded-md border border-ink-700 text-sm text-parchment-300 transition-colors hover:border-gold-500/40 hover:text-gold-200"
          >
            1
          </Link>
          {start > 2 && <span className="px-1 text-mist-400">…</span>}
        </>
      )}

      {pages.map((p) => (
        <Link
          key={p}
          href={buildHref(p, searchParams)}
          aria-current={p === page ? "page" : undefined}
          className={cn(
            "inline-flex size-9 items-center justify-center rounded-md border text-sm transition-colors",
            p === page
              ? "border-gold-500/60 bg-gold-500/15 text-gold-200"
              : "border-ink-700 text-parchment-300 hover:border-gold-500/40 hover:text-gold-200",
          )}
        >
          {p}
        </Link>
      ))}

      {end < totalPages && (
        <>
          {end < totalPages - 1 && <span className="px-1 text-mist-400">…</span>}
          <Link
            href={buildHref(totalPages, searchParams)}
            className="inline-flex size-9 items-center justify-center rounded-md border border-ink-700 text-sm text-parchment-300 transition-colors hover:border-gold-500/40 hover:text-gold-200"
          >
            {totalPages}
          </Link>
        </>
      )}

      {page < totalPages ? (
        <Link
          href={buildHref(page + 1, searchParams)}
          rel="next"
          className="inline-flex size-9 items-center justify-center rounded-md border border-ink-700 text-parchment-300 transition-colors hover:border-gold-500/40 hover:text-gold-200"
        >
          <ChevronRight className="size-4" aria-hidden="true" />
          <span className="sr-only">Trang sau</span>
        </Link>
      ) : (
        <span className="inline-flex size-9 items-center justify-center rounded-md border border-ink-800 text-mist-400">
          <ChevronRight className="size-4" aria-hidden="true" />
          <span className="sr-only">Trang sau</span>
        </span>
      )}
    </nav>
  );
}
