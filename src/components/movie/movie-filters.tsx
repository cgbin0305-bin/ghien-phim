"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ReleaseStatus } from "@/lib/types";

interface MovieFiltersProps {
  genres: { value: string; label: string }[];
  years: number[];
  initial: {
    q: string;
    genre: string;
    year: string;
    releaseStatus: ReleaseStatus | "all";
    sort: "recent" | "newest" | "year";
  };
}

const RELEASE_OPTIONS: { value: ReleaseStatus | "all"; label: string }[] = [
  { value: "all", label: "Tất cả trạng thái" },
  { value: "upcoming", label: "Sắp chiếu" },
  { value: "airing", label: "Đang chiếu" },
  { value: "completed", label: "Hoàn thành" },
];

const SORT_OPTIONS = [
  { value: "recent", label: "Mới cập nhật" },
  { value: "newest", label: "Mới thêm" },
  { value: "year", label: "Năm phát hành" },
] as const;

type FilterKey = "q" | "genre" | "year" | "releaseStatus" | "sort";

/**
 * Radix `Select` rejects an empty-string item value, so the "no filter"
 * options use sentinels and are translated back to "" before they reach the
 * URL or the state.
 */
const ALL = "__all__";

/**
 * Filters are mirrored into the URL so the view is shareable and the browser
 * back button works. Changing a filter resets the page to 1.
 */
export function MovieFilters({ genres, years, initial }: MovieFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [q, setQ] = React.useState(initial.q);
  const [genre, setGenre] = React.useState(initial.genre);
  const [year, setYear] = React.useState(initial.year);
  const [releaseStatus, setReleaseStatus] = React.useState<string>(initial.releaseStatus);
  const [sort, setSort] = React.useState<string>(initial.sort);
  const [expanded, setExpanded] = React.useState(false);

  const apply = React.useCallback(
    (overrides: Partial<Record<FilterKey, string>> = {}) => {
      const next = new URLSearchParams(searchParams.toString());
      const values = { q, genre, year, releaseStatus, sort, ...overrides };

      const applyValue = (key: FilterKey, value: string, fallback: string) => {
        if (!value || value === fallback) next.delete(key);
        else next.set(key, value);
      };

      applyValue("q", values.q, "");
      applyValue("genre", values.genre, "");
      applyValue("year", values.year, "");
      applyValue("releaseStatus", values.releaseStatus, "all");
      applyValue("sort", values.sort, "recent");
      next.delete("page");

      const queryString = next.toString();
      router.push(queryString ? `/phim?${queryString}` : "/phim", { scroll: false });
    },
    [q, genre, year, releaseStatus, sort, searchParams, router],
  );

  // Debounced live search so we do not spam the router.
  const initialQ = React.useRef(initial.q);
  React.useEffect(() => {
    if (q === initialQ.current) return;
    const timer = window.setTimeout(() => apply({ q }), 450);
    return () => window.clearTimeout(timer);
  }, [q, apply]);

  const hasFilters =
    Boolean(q || genre || year) || releaseStatus !== "all" || sort !== "recent";

  const clearAll = () => {
    initialQ.current = "";
    setQ("");
    setGenre("");
    setYear("");
    setReleaseStatus("all");
    setSort("recent");
    router.push("/phim", { scroll: false });
  };

  return (
    <div className="panel p-4 sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <label htmlFor="movie-search" className="sr-only">
            Tìm phim theo tên Việt hoặc tên gốc
          </label>
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-mist-500"
            aria-hidden="true"
          />
          <Input
            id="movie-search"
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Tìm theo tên Việt hoặc tên gốc…"
            className="pl-9"
          />
        </div>

        <Button
          type="button"
          variant="secondary"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          aria-controls="movie-filter-panel"
          className="sm:hidden"
        >
          <SlidersHorizontal aria-hidden="true" />
          Bộ lọc
        </Button>
      </div>

      <div
        id="movie-filter-panel"
        className={`${expanded ? "grid" : "hidden"} mt-4 grid-cols-2 gap-3 sm:mt-4 sm:grid sm:grid-cols-4`}
      >
        <div className="col-span-2 sm:col-span-1">
          <label htmlFor="filter-genre" className="mb-1.5 block text-xs text-parchment-300/85">
            Thể loại
          </label>
          <Select
            value={genre === "" ? ALL : genre}
            onValueChange={(v) => {
              const next = v === ALL ? "" : v;
              setGenre(next);
              apply({ genre: next });
            }}
          >
            <SelectTrigger id="filter-genre">
              <SelectValue placeholder="Tất cả thể loại" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Tất cả thể loại</SelectItem>
              {genres.map((g) => (
                <SelectItem key={g.value} value={g.value}>
                  {g.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <label htmlFor="filter-year" className="mb-1.5 block text-xs text-parchment-300/85">
            Năm
          </label>
          <Select
            value={year === "" ? ALL : year}
            onValueChange={(v) => {
              const next = v === ALL ? "" : v;
              setYear(next);
              apply({ year: next });
            }}
          >
            <SelectTrigger id="filter-year">
              <SelectValue placeholder="Mọi năm" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Mọi năm</SelectItem>
              {years.map((y) => (
                <SelectItem key={y} value={String(y)}>
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <label htmlFor="filter-status" className="mb-1.5 block text-xs text-parchment-300/85">
            Trạng thái
          </label>
          <Select
            value={releaseStatus}
            onValueChange={(v) => { setReleaseStatus(v); apply({ releaseStatus: v }); }}
          >
            <SelectTrigger id="filter-status">
              <SelectValue placeholder="Tất cả trạng thái" />
            </SelectTrigger>
            <SelectContent>
              {RELEASE_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <label htmlFor="filter-sort" className="mb-1.5 block text-xs text-parchment-300/85">
            Sắp xếp
          </label>
          <Select value={sort} onValueChange={(v) => { setSort(v); apply({ sort: v }); }}>
            <SelectTrigger id="filter-sort">
              <SelectValue placeholder="Mới cập nhật" />
            </SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {hasFilters && (
        <div className="mt-4 flex items-center justify-between gap-3 border-t border-ink-700/70 pt-3">
          <p className="text-xs text-parchment-300/80">Bộ lọc đang áp dụng.</p>
          <Button type="button" variant="ghost" size="sm" onClick={clearAll}>
            <X aria-hidden="true" />
            Xoá lọc
          </Button>
        </div>
      )}
    </div>
  );
}
