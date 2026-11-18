"use client";

import * as React from "react";
import { RotateCcw, Search, Sparkles, X } from "lucide-react";
import type { Genre, MovieWithStats } from "@/lib/types";
import { MovieCard } from "@/components/movie/movie-card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type GenrePillKey = string;

interface GenrePillSpec {
  key: GenrePillKey;
  label: string;
  seal: string;
  slugAliases: string[];
  keywords: string[];
}

export const CO_TRANG_GENRE_PILLS: readonly GenrePillSpec[] = [
  {
    key: "all",
    label: "Tất Cả",
    seal: "閣",
    slugAliases: [],
    keywords: [],
  },
  {
    key: "tien-hiep",
    label: "Tiên Hiệp",
    seal: "仙",
    slugAliases: ["tien-hiem", "tien-hiep"],
    keywords: ["tien hiep", "tien hiem", "tu tien", "tu luyen", "linh khi", "thien khu", "than lai"],
  },
  {
    key: "kiem-hiep",
    label: "Kiếm Hiệp",
    seal: "劍",
    slugAliases: ["kiem-hiep"],
    keywords: ["kiem hiep", "kiem khach", "vo hiep", "kiem dao", "van kiem", "vu than", "giang ho"],
  },
  {
    key: "cung-dau",
    label: "Cung Đấu",
    seal: "宮",
    slugAliases: ["cung-dau"],
    keywords: ["cung dau", "hau cung", "trieu dinh", "cung cam", "hoang cung", "vuong gia", "nu quan", "cung nu"],
  },
  {
    key: "huyen-huyen",
    label: "Huyền Huyễn",
    seal: "玄",
    slugAliases: ["huyen-huyen"],
    keywords: ["huyen huyen", "ky bi", "huyen co", "coi tam", "thien dia", "long ho", "tu than"],
  },
  {
    key: "trong-sinh",
    label: "Trọng Sinh",
    seal: "生",
    slugAliases: ["trong-sinh", "trung-sinh"],
    keywords: [
      "trong sinh",
      "trung sinh",
      "song lai",
      "hoi sinh",
      "kiep truoc",
      "danh doi",
      "ky uc",
      "bao thu",
      "thua ke",
    ],
  },
] as const;

/**
 * Chuẩn hóa chuỗi tiếng Việt: bỏ dấu thanh, chuyển `đ -> d`, chữ thường.
 * Dùng cho Instant Search 0ms để gõ có dấu hay không dấu đều khớp chính xác.
 */
export function normalizeVietnamese(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "d")
    .toLowerCase()
    .trim();
}

/**
 * Kiểm tra một bộ phim có thuộc thể loại cổ trang đang chọn hay không:
 *  1. Ưu tiên khớp theo trường `movie.genres` (slug hoặc tên thể loại).
 *  2. Nếu phim chưa gắn tag riêng hoặc thuộc nhóm từ khóa mở rộng (như Trọng Sinh),
 *     tự động đối chiếu từ khóa đã chuẩn hóa trong tên phim và mô tả (`synopsis`).
 */
export function matchesGenrePill(
  movie: MovieWithStats,
  pillKey: GenrePillKey,
  pillars: readonly GenrePillSpec[] = CO_TRANG_GENRE_PILLS,
): boolean {
  if (pillKey === "all") return true;

  const spec = pillars.find((p) => p.key === pillKey);
  if (!spec) {
    return movie.genres.some((g) => g.slug === pillKey);
  }

  const hasGenreTag = movie.genres.some((g) => {
    const slug = g.slug.toLowerCase();
    const normalizedName = normalizeVietnamese(g.name);
    return (
      spec.slugAliases.includes(slug) ||
      spec.keywords.some((kw) => normalizedName.includes(kw))
    );
  });
  if (hasGenreTag) return true;

  const haystack = normalizeVietnamese(
    `${movie.title} ${movie.originalTitle ?? ""} ${movie.synopsis ?? ""}`,
  );
  return spec.keywords.some((kw) => haystack.includes(kw));
}

interface InstantMovieCatalogProps {
  movies: MovieWithStats[];
  genres?: Genre[];
  title?: string;
  description?: string;
  initialQuery?: string;
  initialGenre?: GenrePillKey;
}

export function InstantMovieCatalog({
  movies,
  genres = [],
  title = "Kho Phim Cổ Trang",
  description = "Tìm kiếm tức thì (0ms, hỗ trợ gõ không dấu) và lọc nhanh theo thể loại cổ trang.",
  initialQuery = "",
  initialGenre = "all",
}: InstantMovieCatalogProps) {
  const [query, setQuery] = React.useState(initialQuery);
  const [activeGenre, setActiveGenre] = React.useState<GenrePillKey>(initialGenre);

  // Hợp nhất các pill cổ trang mặc định và các thể loại mới do Admin thêm trong CRUD
  const allPills = React.useMemo<GenrePillSpec[]>(() => {
    const list: GenrePillSpec[] = [...CO_TRANG_GENRE_PILLS];
    for (const g of genres) {
      const slug = g.slug.toLowerCase();
      const alreadyExists = list.some(
        (p) =>
          p.key === slug ||
          p.slugAliases.includes(slug) ||
          normalizeVietnamese(p.label) === normalizeVietnamese(g.name),
      );
      if (!alreadyExists) {
        const normalizedLabel = normalizeVietnamese(g.name);
        list.push({
          key: slug,
          label: g.name,
          seal: "閣",
          slugAliases: [slug],
          keywords: normalizedLabel ? [normalizedLabel] : [],
        });
      }
    }
    return list;
  }, [genres]);

  const normalizedQuery = React.useMemo(() => normalizeVietnamese(query), [query]);

  // Lọc trực tiếp trong bộ nhớ (0ms delay) trên danh sách phim đã tải từ Supabase
  const filteredMovies = React.useMemo(() => {
    return movies.filter((movie) => {
      if (!matchesGenrePill(movie, activeGenre, allPills)) return false;
      if (!normalizedQuery) return true;

      const searchable = normalizeVietnamese(
        [
          movie.title,
          movie.originalTitle ?? "",
          movie.synopsis ?? "",
          movie.director ?? "",
          ...(movie.cast ?? []),
          ...movie.genres.map((g) => g.name),
        ].join(" "),
      );

      return searchable.includes(normalizedQuery);
    });
  }, [movies, activeGenre, allPills, normalizedQuery]);

  // Đếm số lượng phim theo từng thể loại để hiển thị trên từng nút pill
  const pillCounts = React.useMemo(() => {
    const counts: Record<string, number> = {
      all: movies.length,
    };
    for (const pill of allPills) {
      if (pill.key !== "all") counts[pill.key] = 0;
    }
    for (const movie of movies) {
      for (const pill of allPills) {
        if (pill.key !== "all" && matchesGenrePill(movie, pill.key, allPills)) {
          counts[pill.key] = (counts[pill.key] ?? 0) + 1;
        }
      }
    }
    return counts;
  }, [movies, allPills]);

  const hasActiveFilter = normalizedQuery.length > 0 || activeGenre !== "all";

  const resetFilters = () => {
    setQuery("");
    setActiveGenre("all");
  };

  return (
    <section aria-labelledby="kho-phim-instant" className="space-y-6">
      <div className="flex flex-col gap-2 border-b border-ink-700/75 pb-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <span
              aria-hidden="true"
              className="inline-block h-5 w-1 shrink-0 rounded-full bg-gradient-to-b from-gold-300 via-gold-400 to-gold-700 shadow-[0_0_10px_rgba(217,174,73,0.5)]"
            />
            <h2
              id="kho-phim-instant"
              className="font-serif text-2xl font-bold tracking-tight text-parchment-100 sm:text-3xl"
            >
              {title}
            </h2>
            <span aria-hidden="true" className="hidden font-serif text-xs text-gold-400/75 sm:inline">
              ❖
            </span>
          </div>
          <p className="mt-1.5 pl-3.5 text-sm text-parchment-300/80">{description}</p>
        </div>

        <p className="text-xs font-medium text-mist-400" aria-live="polite">
          Hiển thị <span className="text-gold-200 tabular-nums">{filteredMovies.length}</span> /{" "}
          <span className="tabular-nums">{movies.length}</span> phim
        </p>
      </div>

      {/* Thanh công cụ Tìm kiếm tức thì (0ms) & Nút lọc Thể loại Cổ Trang */}
      <div className="panel oriental-frame space-y-4 p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="group relative flex-1">
            <label htmlFor="instant-movie-search" className="sr-only">
              Tìm kiếm phim tức thì (hỗ trợ gõ không dấu)
            </label>
            <Search
              className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-mist-400 transition-colors group-focus-within:text-gold-300"
              aria-hidden="true"
            />
            <input
              id="instant-movie-search"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Gõ tên phim (có dấu hoặc không dấu, ví dụ: van kiem, linh dong, cung dau)…"
              className="h-11 w-full rounded-lg border border-ink-600 bg-ink-900/85 pl-10 pr-10 text-sm text-parchment-100 placeholder:text-mist-500 transition-all duration-200 focus:border-gold-400/65 focus:bg-ink-900 focus:outline-none focus:ring-2 focus:ring-gold-500/25"
            />
            {query ? (
              <button
                type="button"
                onClick={() => setQuery("")}
                aria-label="Xoá từ khoá tìm kiếm"
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-mist-400 transition-colors hover:bg-ink-800 hover:text-parchment-100"
              >
                <X className="size-4" aria-hidden="true" />
              </button>
            ) : (
              <Sparkles
                className="pointer-events-none absolute right-3.5 top-1/2 hidden size-4 -translate-y-1/2 text-gold-300/65 sm:block"
                aria-hidden="true"
              />
            )}
          </div>

          {hasActiveFilter && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={resetFilters}
              className="h-11 shrink-0 px-4"
            >
              <RotateCcw className="size-3.5" aria-hidden="true" />
              Đặt lại
            </Button>
          )}
        </div>

        {/* Dải nút chọn nhanh Thể loại Cổ Trang (Genre Pills) */}
        <div
          role="group"
          aria-label="Lọc nhanh theo thể loại cổ trang"
          className="flex flex-wrap items-center gap-2 pt-1"
        >
          {allPills.map((pill) => {
            const isSelected = activeGenre === pill.key;
            const count = pillCounts[pill.key] ?? 0;
            return (
              <button
                key={pill.key}
                type="button"
                aria-pressed={isSelected}
                onClick={() => setActiveGenre(pill.key)}
                className={cn(
                  "group inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs font-medium transition-all duration-200",
                  isSelected
                    ? "border-gold-400/75 bg-gradient-to-b from-gold-300 to-gold-400 text-ink-950 font-semibold shadow-[0_2px_14px_-2px_rgba(212,175,55,0.55)]"
                    : "border-ink-700 bg-ink-850/85 text-parchment-200 hover:-translate-y-0.5 hover:border-gold-500/45 hover:bg-ink-800 hover:text-gold-200",
                )}
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    "grid size-5 place-items-center rounded-full border font-serif text-xs leading-none transition-colors",
                    isSelected
                      ? "border-ink-950/25 bg-ink-950/15 text-ink-950"
                      : "border-gold-500/35 bg-gold-500/12 text-gold-300 group-hover:border-gold-400",
                  )}
                >
                  {pill.seal}
                </span>
                <span>{pill.label}</span>
                <span
                  className={cn(
                    "rounded-full px-1.5 py-0.5 text-xs tabular-nums",
                    isSelected
                      ? "bg-ink-950/20 text-ink-950"
                      : "bg-ink-900/90 text-mist-400 group-hover:text-gold-300",
                  )}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Kết quả hiển thị tức thì */}
      {filteredMovies.length === 0 ? (
        <div className="panel flex flex-col items-center gap-3 px-6 py-14 text-center animate-fade-in">
          <p className="font-serif text-xl font-semibold text-parchment-100">
            Không tìm thấy bộ phim phù hợp
          </p>
          <p className="max-w-md text-sm leading-relaxed text-parchment-300/80">
            Không có phim nào khớp với từ khoá{" "}
            {query ? <strong className="text-gold-200">“{query}”</strong> : null}
            {query && activeGenre !== "all" ? " trong thể loại " : null}
            {activeGenre !== "all" ? (
              <strong className="text-gold-200">
                {allPills.find((p) => p.key === activeGenre)?.label}
              </strong>
            ) : null}
            . Hãy thử từ khoá khác hoặc đặt lại bộ lọc.
          </p>
          <Button type="button" variant="outline" onClick={resetFilters} className="mt-2">
            <RotateCcw className="size-4" aria-hidden="true" />
            Đặt lại
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-x-5 gap-y-7 sm:grid-cols-2 lg:grid-cols-3">
          {filteredMovies.map((movie, index) => (
            <MovieCard key={movie.id} movie={movie} priority={index < 3} />
          ))}
        </div>
      )}
    </section>
  );
}
