import type {
  Episode,
  Genre,
  Movie,
  MovieWithStats,
  Post,
  ScheduleEvent,
  SiteSettings,
} from "@/lib/types";
import {
  DEMO_EPISODES,
  DEMO_GENRES,
  DEMO_MOVIES,
  DEMO_POSTS,
  DEMO_SETTINGS,
  buildDemoSchedule,
} from "@/lib/data/demo";
import type {
  DataStore,
  DashboardStats,
  EpisodeInput,
  GenreInput,
  MovieFilters,
  MovieInput,
  MovieListResult,
  PostInput,
  ScheduleEventInput,
  ScheduleWeek,
} from "@/lib/data/types";
import { slugify } from "@/lib/slug";
import { addDays, getWeekUtcRange } from "@/lib/date";

/**
 * In-memory demo data store.
 *
 * Mutations only live for the lifetime of the server process (in dev this
 * persists across requests because Next.js keeps the module instance warm).
 * The store is explicit about being demo data - it is never written to a
 * production database.
 */
export function createDemoStore(): DataStore {
  const genres: Genre[] = DEMO_GENRES.map((g) => ({ ...g }));
  const movies: Movie[] = DEMO_MOVIES.map((m) => ({ ...m, cast: m.cast ? [...m.cast] : [], genres: [...m.genres] }));
  const episodes: Episode[] = DEMO_EPISODES.map((e) => ({ ...e, sources: e.sources.map((s) => ({ ...s })) }));
  const posts: Post[] = DEMO_POSTS.map((p) => ({ ...p, movies: p.movies.map((m) => ({ ...m })) }));
  let settings: SiteSettings = { ...DEMO_SETTINGS };
  let schedule: ScheduleEvent[] = buildDemoSchedule();

  const withStats = (movie: Movie): MovieWithStats => {
    const own = episodes.filter((e) => e.movieId === movie.id);
    return {
      ...movie,
      episodeCount: own.length,
      publishedEpisodeCount: own.filter((e) => e.status === "published").length,
    };
  };

  /**
   * Bộ đếm sinh id.
   *
   * KHÔNG dùng `Date.now()`: hai lần tạo liên tiếp trong cùng một mili-giây sẽ
   * sinh ra cùng một id, khiến các bản ghi đè lên nhau (ví dụ: hai phim nổi
   * bật sẽ bị xem là cùng một phim và cơ chế "chỉ giữ một phim nổi bật" hỏng).
   */
  let idCounter = 0;
  const nextId = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${(idCounter += 1)}`;

  const published = () => movies.filter((m) => m.status === "published");

  const sortMovies = (list: Movie[], sort: MovieFilters["sort"]): Movie[] => {
    const copy = [...list];
    switch (sort) {
      case "newest":
        copy.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
        break;
      case "year":
        copy.sort((a, b) => (b.year ?? 0) - (a.year ?? 0));
        break;
      case "recent":
      default:
        copy.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
        break;
    }
    return copy;
  };

  const matchesQuery = (movie: Movie, query: string) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return (
      movie.title.toLowerCase().includes(q) ||
      (movie.originalTitle ?? "").toLowerCase().includes(q) ||
      (movie.director ?? "").toLowerCase().includes(q) ||
      (movie.cast ?? []).some((c) => c.toLowerCase().includes(q))
    );
  };

  return {
    mode: "demo",

    async getSettings() {
      return settings;
    },
    async updateSettings(patch) {
      settings = { ...settings, ...patch, updatedAt: new Date().toISOString() };
      return settings;
    },

    async getGenres() {
      return [...genres].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
    },
    async getMovieGenres() {
      const map = new Map<string, Genre[]>();
      for (const movie of movies) map.set(movie.id, movie.genres);
      return map;
    },
    async createGenre(input: GenreInput) {
      if (genres.some((g) => g.slug === input.slug)) {
        throw new Error("Slug thể loại đã tồn tại.");
      }
      if (genres.some((g) => g.name.toLowerCase() === input.name.trim().toLowerCase())) {
        throw new Error("Tên thể loại đã tồn tại.");
      }
      const nextSort =
        input.sortOrder ??
        genres.reduce((max, g) => Math.max(max, g.sortOrder ?? 0), 0) + 1;
      const genre: Genre = {
        id: nextId("g"),
        name: input.name.trim(),
        slug: input.slug.trim(),
        description: input.description ?? null,
        sortOrder: nextSort,
      };
      genres.push(genre);
      return genre;
    },
    async updateGenre(id: string, input: GenreInput) {
      const index = genres.findIndex((g) => g.id === id);
      if (index === -1) throw new Error("Không tìm thấy thể loại.");
      if (genres.some((g) => g.id !== id && g.slug === input.slug)) {
        throw new Error("Slug thể loại đã tồn tại.");
      }
      const existing = genres[index]!;
      const updated: Genre = {
        ...existing,
        name: input.name.trim(),
        slug: input.slug.trim(),
        description: input.description ?? null,
        sortOrder: input.sortOrder ?? existing.sortOrder ?? 0,
      };
      genres[index] = updated;
      for (const movie of movies) {
        movie.genres = movie.genres.map((g) => (g.id === id ? updated : g));
      }
      return updated;
    },
    async deleteGenre(id: string) {
      const index = genres.findIndex((g) => g.id === id);
      if (index === -1) throw new Error("Không tìm thấy thể loại.");
      genres.splice(index, 1);
      for (const movie of movies) {
        movie.genres = movie.genres.filter((g) => g.id !== id);
      }
    },

    async listMovies(filters: MovieFilters): Promise<MovieListResult> {
      const perPage = filters.perPage ?? 12;
      const page = Math.max(1, filters.page ?? 1);

      let list = published();
      if (filters.query) list = list.filter((m) => matchesQuery(m, filters.query!));
      if (filters.genre) list = list.filter((m) => m.genres.some((g) => g.slug === filters.genre));
      if (filters.year) list = list.filter((m) => m.year === filters.year);
      if (filters.releaseStatus && filters.releaseStatus !== "all") {
        list = list.filter((m) => m.releaseStatus === filters.releaseStatus);
      }

      const total = list.length;
      const sorted = sortMovies(list, filters.sort);
      const start = (page - 1) * perPage;
      const movies = sorted.slice(start, start + perPage).map(withStats);

      return {
        movies,
        total,
        page,
        perPage,
        totalPages: Math.max(1, Math.ceil(total / perPage)),
      };
    },

    async listMovieYears(): Promise<number[]> {
      const years = published()
        .map((m) => m.year)
        .filter((y): y is number => typeof y === "number");
      return Array.from(new Set(years)).sort((a, b) => b - a);
    },

    /**
     * Lấy phim theo slug.
     *
     * KHÔNG lọc theo trạng thái xuất bản ở đây: hàm này được dùng bởi cả
     * trang công khai lẫn trang quản trị. Trang quản trị cần mở được phim bản
     * nháp để sửa; trang công khai đã kiểm tra `status === "published"` ở
     * nơi gọi trước khi render.
     */
    async getMovieBySlug(slug) {
      const movie = movies.find((m) => m.slug === slug);
      return movie ? withStats(movie) : null;
    },
    async getMovieById(id) {
      const movie = movies.find((m) => m.id === id);
      return movie ? withStats(movie) : null;
    },
    async getRelatedMovies(movie, limit = 8) {
      const genreIds = new Set(movie.genres.map((g) => g.id));
      return published()
        .filter((m) => m.id !== movie.id)
        .map((m) => ({
          movie: m,
          score: m.genres.filter((g) => genreIds.has(g.id)).length,
        }))
        .sort((a, b) => b.score - a.score || b.movie.year! - a.movie.year!)
        .slice(0, limit)
        .map((entry) => withStats(entry.movie));
    },
    async listAllMoviesForAdmin() {
      return movies.map(withStats);
    },

    async createMovie(input: MovieInput) {
      const movie: Movie = {
        id: nextId("m"),
        slug: input.slug,
        title: input.title,
        originalTitle: input.originalTitle ?? null,
        synopsis: input.synopsis ?? null,
        year: input.year ?? null,
        country: input.country ?? "Trung Quốc",
        director: input.director ?? null,
        cast: input.cast ?? [],
        posterUrl: input.posterUrl ?? null,
        backdropUrl: input.backdropUrl ?? null,
        trailerUrl: input.trailerUrl ?? null,
        status: input.status,
        releaseStatus: input.releaseStatus,
        totalEpisodes: input.totalEpisodes ?? null,
        subtitleLabel: input.subtitleLabel ?? null,
        isFeatured: input.isFeatured ?? false,
        sortOrder: input.sortOrder ?? movies.length,
        publishedAt: input.status === "published" ? new Date().toISOString() : null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        genres: genres.filter((g) => input.genreIds.includes(g.id)),
      };
      movies.push(movie);
      if (movie.isFeatured) {
        for (const m of movies) if (m.id !== movie.id) m.isFeatured = false;
      }
      return movie;
    },

    async updateMovie(id, input: MovieInput) {
      const index = movies.findIndex((m) => m.id === id);
      if (index === -1) throw new Error("Không tìm thấy phim.");
      const existing = movies[index]!;
      const movie: Movie = {
        ...existing,
        ...input,
        cast: input.cast ?? [],
        genres: genres.filter((g) => input.genreIds.includes(g.id)),
        publishedAt:
          input.status === "published" ? (existing.publishedAt ?? new Date().toISOString()) : null,
        updatedAt: new Date().toISOString(),
      };
      movies[index] = movie;
      if (movie.isFeatured) {
        for (const m of movies) if (m.id !== movie.id) m.isFeatured = false;
      }
      return movie;
    },

    async deleteMovie(id) {
      const index = movies.findIndex((m) => m.id === id);
      if (index === -1) throw new Error("Không tìm thấy phim.");
      movies.splice(index, 1);
      for (let i = episodes.length - 1; i >= 0; i -= 1) {
        if (episodes[i]!.movieId === id) episodes.splice(i, 1);
      }
      schedule = schedule.filter((e) => e.movieId !== id);
    },

    async listEpisodes(movieId) {
      return episodes
        .filter((e) => e.movieId === movieId)
        .sort((a, b) => a.episodeNumber - b.episodeNumber);
    },

    async getEpisodeBySlug(movieSlug, episodeSlug) {
      const movie = movies.find((m) => m.slug === movieSlug && m.status === "published");
      if (!movie) return null;
      const own = episodes.filter((e) => e.movieId === movie.id);
      const episode = own.find((e) => e.slug === episodeSlug && e.status === "published");
      if (!episode) return null;
      return { episode, movie: withStats(movie), siblings: own.sort((a, b) => a.episodeNumber - b.episodeNumber) };
    },

    async getLatestPublishedEpisode(movieId) {
      const own = episodes
        .filter((e) => e.movieId === movieId && e.status === "published")
        .sort((a, b) => b.episodeNumber - a.episodeNumber);
      return own[0] ?? null;
    },

    async createEpisode(input: EpisodeInput) {
      const duplicate = episodes.some(
        (e) => e.movieId === input.movieId && e.episodeNumber === input.episodeNumber,
      );
      if (duplicate) throw new Error("Số tập này đã tồn tại trong phim.");
      const episode: Episode = {
        id: nextId("ep"),
        movieId: input.movieId,
        episodeNumber: input.episodeNumber,
        title: input.title,
        slug: input.slug,
        releaseDate: input.releaseDate ?? null,
        status: input.status,
        description: input.description ?? null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        sources: input.sources.map((s) => ({
          id: nextId("src"),
          episodeId: "",
          provider: s.provider,
          sourceUrl: s.sourceUrl,
          label: s.label,
          priority: s.priority,
          createdAt: new Date().toISOString(),
        })),
      };
      episode.sources = episode.sources.map((s) => ({ ...s, episodeId: episode.id }));
      episodes.push(episode);
      return episode;
    },

    async updateEpisode(id, input: EpisodeInput) {
      const index = episodes.findIndex((e) => e.id === id);
      if (index === -1) throw new Error("Không tìm thấy tập.");
      const duplicate = episodes.some(
        (e) => e.movieId === input.movieId && e.episodeNumber === input.episodeNumber && e.id !== id,
      );
      if (duplicate) throw new Error("Số tập này đã tồn tại trong phim.");
      const existing = episodes[index]!;
      const episode: Episode = {
        ...existing,
        ...input,
        description: input.description ?? null,
        releaseDate: input.releaseDate ?? null,
        updatedAt: new Date().toISOString(),
        sources: input.sources.map((s, i) => ({
          id: s.id ?? `${id}-src-${i}`,
          episodeId: id,
          provider: s.provider,
          sourceUrl: s.sourceUrl,
          label: s.label,
          priority: s.priority,
          createdAt: existing.sources[i]?.createdAt ?? new Date().toISOString(),
        })),
      };
      episodes[index] = episode;
      return episode;
    },

    async deleteEpisode(id) {
      const index = episodes.findIndex((e) => e.id === id);
      if (index === -1) throw new Error("Không tìm thấy tập.");
      episodes.splice(index, 1);
    },

    async getScheduleForWeek(weekStart: string): Promise<ScheduleWeek> {
      // Anchor the window on Vietnam-local midnight (UTC+7).
      const { startIso, endIso } = getWeekUtcRange(weekStart);
      const start = new Date(startIso).getTime();
      const end = new Date(endIso).getTime();
      const events = schedule.filter((e) => {
        const t = new Date(e.scheduledAt).getTime();
        return t >= start && t < end;
      });
      return {
        weekStart,
        weekEnd: addDays(weekStart, 6),
        events,
      };
    },

    async listUpcomingSchedule(limit = 10) {
      const now = Date.now();
      return schedule
        .filter((e) => new Date(e.scheduledAt).getTime() >= now)
        .sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt))
        .slice(0, limit);
    },

    async listAllScheduleEvents() {
      return [...schedule].sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt));
    },

    async createScheduleEvent(input: ScheduleEventInput) {
      const movie = movies.find((m) => m.id === input.movieId);
      if (!movie) throw new Error("Không tìm thấy phim.");
      const event: ScheduleEvent = {
        id: nextId("sch"),
        movieId: input.movieId,
        episodeId: input.episodeId ?? null,
        episodeNumber: input.episodeNumber ?? null,
        scheduledAt: input.scheduledAt,
        status: input.status,
        note: input.note ?? null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        movie: { id: movie.id, slug: movie.slug, title: movie.title, posterUrl: movie.posterUrl },
        episode: null,
      };
      schedule.push(event);
      return event;
    },

    async updateScheduleEvent(id, input: ScheduleEventInput) {
      const index = schedule.findIndex((e) => e.id === id);
      if (index === -1) throw new Error("Không tìm thấy sự kiện lịch.");
      const movie = movies.find((m) => m.id === input.movieId);
      schedule[index] = {
        ...schedule[index]!,
        ...input,
        note: input.note ?? null,
        updatedAt: new Date().toISOString(),
        movie: movie
          ? { id: movie.id, slug: movie.slug, title: movie.title, posterUrl: movie.posterUrl }
          : null,
      };
      return schedule[index]!;
    },

    async deleteScheduleEvent(id) {
      schedule = schedule.filter((e) => e.id !== id);
    },

    async listPosts(options) {
      let list = posts.filter((p) => p.status === "published");
      if (options?.type) list = list.filter((p) => p.type === options.type);
      list.sort((a, b) => (b.publishedAt ?? b.createdAt).localeCompare(a.publishedAt ?? a.createdAt));
      return options?.limit ? list.slice(0, options.limit) : list;
    },

    async listAllPostsForAdmin() {
      const list = [...posts].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
      return list;
    },

    async getPostBySlug(slug) {
      const post = posts.find((p) => p.slug === slug && p.status === "published");
      return post ?? null;
    },
    async getPostById(id) {
      return posts.find((p) => p.id === id) ?? null;
    },

    async createPost(input: PostInput) {
      const post: Post = {
        id: nextId("p"),
        slug: input.slug,
        title: input.title,
        excerpt: input.excerpt ?? null,
        content: input.content,
        coverImageUrl: input.coverImageUrl ?? null,
        type: input.type,
        status: input.status,
        weekStart: input.weekStart ?? null,
        publishedAt: input.status === "published" ? new Date().toISOString() : null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        movies: movies
          .filter((m) => input.movieIds.includes(m.id))
          .map((m) => ({ id: m.id, slug: m.slug, title: m.title, posterUrl: m.posterUrl })),
      };
      posts.unshift(post);
      return post;
    },

    async updatePost(id, input: PostInput) {
      const index = posts.findIndex((p) => p.id === id);
      if (index === -1) throw new Error("Không tìm thấy bài viết.");
      const existing = posts[index]!;
      posts[index] = {
        ...existing,
        ...input,
        excerpt: input.excerpt ?? null,
        coverImageUrl: input.coverImageUrl ?? null,
        weekStart: input.weekStart ?? null,
        publishedAt: input.status === "published" ? (existing.publishedAt ?? new Date().toISOString()) : null,
        updatedAt: new Date().toISOString(),
        movies: movies
          .filter((m) => input.movieIds.includes(m.id))
          .map((m) => ({ id: m.id, slug: m.slug, title: m.title, posterUrl: m.posterUrl })),
      };
      return posts[index]!;
    },

    async deletePost(id) {
      const index = posts.findIndex((p) => p.id === id);
      if (index === -1) throw new Error("Không tìm thấy bài viết.");
      posts.splice(index, 1);
    },

    async getDashboardStats(): Promise<DashboardStats> {
      const now = Date.now();
      return {
        movieCount: movies.length,
        publishedMovieCount: published().length,
        episodeCount: episodes.length,
        publishedEpisodeCount: episodes.filter((e) => e.status === "published").length,
        postCount: posts.length,
        upcomingScheduleCount: schedule.filter(
          (e) => new Date(e.scheduledAt).getTime() >= now && e.status === "scheduled",
        ).length,
        recentMovies: [...movies]
          .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
          .slice(0, 5),
        recentPosts: [...posts]
          .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
          .slice(0, 5),
        upcomingEvents: schedule
          .filter((e) => new Date(e.scheduledAt).getTime() >= now)
          .sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt))
          .slice(0, 5),
      };
    },
  };
}

export { slugify };
