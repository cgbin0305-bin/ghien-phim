import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  Episode,
  Genre,
  Movie,
  MovieWithStats,
  Post,
  ScheduleEvent,
  SiteSettings,
  VideoSource,
} from "@/lib/types";
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
import { createClient } from "@/lib/supabase/server";
import { createPublicClient } from "@/lib/supabase/public";
import { slugify } from "@/lib/slug";
import { sortEpisodes } from "@/lib/episode-sort";
import {
  DONATE_CONFIG,
  parseContactNoteAndDonate,
  serializeContactNoteWithDonate,
} from "@/config/donateConfig";
import { addDays, getWeekUtcRange } from "@/lib/date";
import { isUuid } from "@/lib/data/uuid";

type Db = SupabaseClient;

interface DbMovieRow {
  id: string;
  slug: string;
  title: string;
  original_title: string | null;
  synopsis: string | null;
  year: number | null;
  country: string | null;
  director: string | null;
  cast: string[] | null;
  poster_url: string | null;
  backdrop_url: string | null;
  trailer_url: string | null;
  status: "draft" | "published";
  release_status: "upcoming" | "airing" | "completed";
  total_episodes: number | null;
  subtitle_label: "vietsub" | "thuyet_minh" | "raw" | null;
  is_featured: boolean;
  sort_order: number;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

interface DbEpisodeRow {
  id: string;
  movie_id: string;
  episode_number: number;
  title: string;
  slug: string;
  release_date: string | null;
  status: "draft" | "published";
  description: string | null;
  created_at: string;
  updated_at: string;
}

interface DbSourceRow {
  id: string;
  episode_id: string;
  provider: "youtube" | "facebook";
  source_url: string;
  label: string;
  priority: number;
  created_at: string;
}

interface DbScheduleRow {
  id: string;
  movie_id: string;
  episode_id: string | null;
  episode_number: number | null;
  scheduled_at: string;
  status: "scheduled" | "aired" | "postponed";
  note: string | null;
  created_at: string;
  updated_at: string;
}

interface DbPostRow {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  content?: string | null;
  cover_image_url: string | null;
  type: "weekly_schedule" | "movie_intro" | "announcement";
  status: "draft" | "published";
  week_start: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

const MOVIE_COLUMNS =
  "id, slug, title, original_title, synopsis, year, country, director, cast, poster_url, backdrop_url, trailer_url, status, release_status, total_episodes, subtitle_label, is_featured, sort_order, published_at, created_at, updated_at";

/** Không tải cột `content` (nội dung Markdown dài) khi hiển thị danh sách thẻ bài viết. */
const POST_LIST_COLUMNS =
  "id, slug, title, excerpt, cover_image_url, type, status, week_start, published_at, created_at, updated_at";

const POST_DETAIL_COLUMNS =
  "id, slug, title, excerpt, content, cover_image_url, type, status, week_start, published_at, created_at, updated_at";

function mapMovie(row: DbMovieRow, genres: Genre[]): Movie {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    originalTitle: row.original_title,
    synopsis: row.synopsis,
    year: row.year,
    country: row.country,
    director: row.director,
    cast: row.cast ?? [],
    posterUrl: row.poster_url,
    backdropUrl: row.backdrop_url,
    trailerUrl: row.trailer_url,
    status: row.status,
    releaseStatus: row.release_status,
    totalEpisodes: row.total_episodes,
    subtitleLabel: row.subtitle_label,
    isFeatured: row.is_featured,
    sortOrder: row.sort_order,
    publishedAt: row.published_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    genres,
  };
}

function mapEpisode(row: DbEpisodeRow, sources: VideoSource[]): Episode {
  return {
    id: row.id,
    movieId: row.movie_id,
    episodeNumber: row.episode_number,
    title: row.title,
    slug: row.slug,
    releaseDate: row.release_date,
    status: row.status,
    description: row.description,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    sources,
  };
}

function mapSource(row: DbSourceRow): VideoSource {
  return {
    id: row.id,
    episodeId: row.episode_id,
    provider: row.provider,
    sourceUrl: row.source_url,
    label: row.label,
    priority: row.priority,
    createdAt: row.created_at,
  };
}

function mapSchedule(row: DbScheduleRow, movie?: Movie | null, episode?: Episode | null): ScheduleEvent {
  return {
    id: row.id,
    movieId: row.movie_id,
    episodeId: row.episode_id,
    episodeNumber: row.episode_number,
    scheduledAt: row.scheduled_at,
    status: row.status,
    note: row.note,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    movie: movie
      ? { id: movie.id, slug: movie.slug, title: movie.title, posterUrl: movie.posterUrl }
      : null,
    episode: episode
      ? {
        id: episode.id,
        slug: episode.slug,
        title: episode.title,
        episodeNumber: episode.episodeNumber,
        status: episode.status,
      }
      : null,
  };
}

function mapPost(row: DbPostRow, movies: Post["movies"]): Post {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    excerpt: row.excerpt,
    content: row.content ?? "",
    coverImageUrl: row.cover_image_url,
    type: row.type,
    status: row.status,
    weekStart: row.week_start,
    publishedAt: row.published_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    movies,
  };
}

const EMPTY_SETTINGS: SiteSettings = {
  siteName: "Ghiền Phim",
  siteDescription: null,
  logoUrl: null,
  contactEmail: null,
  contactNote: null,
  seoTitle: null,
  seoDescription: null,
  ogImageUrl: null,
  featuredMovieId: null,
  donateConfig: { ...DONATE_CONFIG },
  updatedAt: new Date().toISOString(),
};

export function createSupabaseStore(client: Db): DataStore {
  async function loadGenres(movieIds: string[]): Promise<Map<string, Genre[]>> {
    const map = new Map<string, Genre[]>();
    if (movieIds.length === 0) return map;

    const { data, error } = await client
      .from("movie_genres")
      .select("movie_id, genre_id, genres(id, name, slug, description, sort_order)")
      .in("movie_id", movieIds);
    if (error) throw new Error(error.message);

    for (const row of (data ?? []) as unknown as Array<{
      movie_id: string;
      genre_id: string;
      genres: { id: string; name: string; slug: string; description: string | null; sort_order: number } | null;
    }>) {
      if (!row.genres) continue;
      const genre: Genre = {
        id: row.genres.id,
        name: row.genres.name,
        slug: row.genres.slug,
        description: row.genres.description,
        sortOrder: row.genres.sort_order,
      };
      const list = map.get(row.movie_id) ?? [];
      list.push(genre);
      map.set(row.movie_id, list);
    }
    for (const list of map.values()) list.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
    return map;
  }

  async function loadSources(episodeIds: string[]): Promise<Map<string, VideoSource[]>> {
    const map = new Map<string, VideoSource[]>();
    if (episodeIds.length === 0) return map;

    const { data, error } = await client
      .from("video_sources")
      .select("id, episode_id, provider, source_url, label, priority, created_at")
      .in("episode_id", episodeIds)
      .order("priority", { ascending: true });
    if (error) throw new Error(error.message);

    for (const row of (data ?? []) as unknown as DbSourceRow[]) {
      const list = map.get(row.episode_id) ?? [];
      list.push(mapSource(row));
      map.set(row.episode_id, list);
    }
    return map;
  }

  async function hydrateMovies(rows: DbMovieRow[]): Promise<MovieWithStats[]> {
    if (rows.length === 0) return [];
    const ids = rows.map((r) => r.id);

    // Chạy song song: nạp thể loại và đếm tập cùng lúc thay vì tuần tự.
    // Mỗi vòng tròn PostgREST mất ~90-200ms từ Việt Nam tới region Supabase,
    // nên việc chạy song song giúp cắt gần một nửa độ trễ.
    const [genreMap, episodeRows] = await Promise.all([
      loadGenres(ids),
      client.from("episodes").select("id, movie_id, status").in("movie_id", ids),
    ]);

    const counts = new Map<string, { total: number; published: number }>();
    for (const row of (episodeRows.data ?? []) as unknown as Array<{ movie_id: string; status: string }>) {
      const entry = counts.get(row.movie_id) ?? { total: 0, published: 0 };
      entry.total += 1;
      if (row.status === "published") entry.published += 1;
      counts.set(row.movie_id, entry);
    }

    return rows.map((row) => {
      const movie = mapMovie(row, genreMap.get(row.id) ?? []);
      const count = counts.get(row.id) ?? { total: 0, published: 0 };
      return {
        ...movie,
        episodeCount: count.total,
        publishedEpisodeCount: count.published,
      };
    });
  }

  async function hydrateEpisodes(rows: DbEpisodeRow[]): Promise<Episode[]> {
    if (rows.length === 0) return [];
    const sourceMap = await loadSources(rows.map((r) => r.id));
    const hydrated = rows.map((row) => mapEpisode(row, sourceMap.get(row.id) ?? []));
    return sortEpisodes(hydrated);
  }

  /**
   * Nạp thông tin tối thiểu của phim cho các khối "phim liên quan".
   *
   * `hydrateMovies` nạp thể loại và đếm tập — hữu ích cho card phim, nhưng
   * hoàn toàn không cần cho một dòng chữ kèm ảnh nhỏ. Dùng hàm này cắt được
   * 2 vòng PostgREST cho mỗi lần đọc bài viết.
   */
  async function loadMovieRefs(
    ids: string[],
  ): Promise<Array<Pick<Movie, "id" | "slug" | "title" | "posterUrl">>> {
    if (ids.length === 0) return [];
    const { data } = await client.from("movies").select("id, slug, title, poster_url").in("id", ids);
    return ((data ?? []) as unknown as Array<{
      id: string;
      slug: string;
      title: string;
      poster_url: string | null;
    }>).map((row) => ({
      id: row.id,
      slug: row.slug,
      title: row.title,
      posterUrl: row.poster_url,
    }));
  }

  /**
   * Sắp xếp phim theo thể loại.
   *
   * PostgREST không cho `order` theo quan hệ lồng nhau (`order=genres.sort_order`
   * → lỗi `PGRST100`), nên phải sắp xếp ở tầng ứng dụng. Để phân trang vẫn
   * đúng (không cắt trang trước rồi mới sort), ta làm:
   *
   *   1. Một vòng lấy `id` + `sort_order` của thể loại đầu tiên cho mọi phim
   *      khớp bộ lọc.
   *   2. Sắp xếp id trong bộ nhớ theo (thứ tự thể loại, rồi tên phim A-Z),
   *      rồi cắt đúng trang yêu cầu.
   *   3. Một vòng nữa nạp đầy đủ dữ liệu cho các phim của trang đó.
   *
   * Phim chưa gán thể loại nào nằm cuối danh sách.
   */
  async function listMoviesByGenre(
    filters: MovieFilters,
    page: number,
    perPage: number,
  ): Promise<MovieListResult> {
    // Bước 1 — lấy id phim kèm thứ tự thể loại nhỏ nhất của mỗi phim.
    let query = client
      .from("movies")
      .select("id, title, movie_genres(genre_id, genres(sort_order))")
      .eq("status", "published");

    if (filters.query) {
      const escaped = filters.query.replace(/[%,()]/g, " ");
      query = query.or(`title.ilike.%${escaped}%,original_title.ilike.%${escaped}%`);
    }
    if (filters.releaseStatus && filters.releaseStatus !== "all") {
      query = query.eq("release_status", filters.releaseStatus);
    }
    if (filters.genre) {
      const { data: links, error: linkError } = await client
        .from("movie_genres")
        .select("movie_id, genres!inner(slug)")
        .eq("genres.slug", filters.genre);
      if (linkError) throw new Error(linkError.message);

      const ids = Array.from(
        new Set(((links ?? []) as unknown as Array<{ movie_id: string }>).map((l) => l.movie_id)),
      );
      if (ids.length === 0) {
        return { movies: [], total: 0, page, perPage, totalPages: 1 };
      }
      query = query.in("id", ids);
    }

    const { data, error } = await query;
    if (error) throw new Error(error.message);

    const rows = (data ?? []) as unknown as Array<{
      id: string;
      title: string;
      movie_genres: Array<{ genre_id: string; genres: { sort_order: number } | null }> | null;
    }>;

    // Bước 2 — sắp xếp trong bộ nhớ rồi cắt trang.
    const scored = rows.map((row) => {
      const orders = (row.movie_genres ?? [])
        .map((link) => link.genres?.sort_order)
        .filter((value): value is number => typeof value === "number");
      return {
        id: row.id,
        title: row.title,
        // `Infinity` đẩy phim chưa có thể loại xuống cuối.
        genreOrder: orders.length > 0 ? Math.min(...orders) : Number.POSITIVE_INFINITY,
      };
    });

    scored.sort((a, b) => a.genreOrder - b.genreOrder || a.title.localeCompare(b.title, "vi"));

    const total = scored.length;
    const from = (page - 1) * perPage;
    const pageIds = scored.slice(from, from + perPage).map((entry) => entry.id);

    if (pageIds.length === 0) {
      return { movies: [], total, page, perPage, totalPages: Math.max(1, Math.ceil(total / perPage)) };
    }

    // Bước 3 — nạp đủ dữ liệu cho đúng trang.
    const { data: movieRows, error: movieError } = await client
      .from("movies")
      .select("*")
      .in("id", pageIds);
    if (movieError) throw new Error(movieError.message);

    const byId = new Map(
      ((movieRows ?? []) as unknown as DbMovieRow[]).map((row) => [row.id, row]),
    );
    const orderedRows = pageIds
      .map((id) => byId.get(id))
      .filter((row): row is DbMovieRow => row !== undefined);

    const movies = await hydrateMovies(orderedRows);

    return {
      movies,
      total,
      page,
      perPage,
      totalPages: Math.max(1, Math.ceil(total / perPage)),
    };
  }

  async function writeMovieGenres(movieId: string, genreIds: string[]): Promise<void> {
    const { error: delError } = await client.from("movie_genres").delete().eq("movie_id", movieId);
    if (delError) throw new Error(delError.message);
    if (genreIds.length === 0) return;
    const { error } = await client
      .from("movie_genres")
      .insert(genreIds.map((genreId) => ({ movie_id: movieId, genre_id: genreId })));
    if (error) throw new Error(error.message);
  }

  async function writeEpisodeSources(
    episodeId: string,
    sources: EpisodeInput["sources"],
  ): Promise<void> {
    const { error: delError } = await client.from("video_sources").delete().eq("episode_id", episodeId);
    if (delError) throw new Error(delError.message);
    if (sources.length === 0) return;
    const { error } = await client
      .from("video_sources")
      .insert(
        sources.map((s) => ({
          episode_id: episodeId,
          provider: s.provider,
          source_url: s.sourceUrl,
          label: s.label,
          priority: s.priority,
        })),
      );
    if (error) throw new Error(error.message);
  }

  async function writePostMovies(postId: string, movieIds: string[]): Promise<void> {
    const { error: delError } = await client.from("post_movies").delete().eq("post_id", postId);
    if (delError) throw new Error(delError.message);
    if (movieIds.length === 0) return;
    const { error } = await client
      .from("post_movies")
      .insert(movieIds.map((movieId) => ({ post_id: postId, movie_id: movieId })));
    if (error) throw new Error(error.message);
  }

  return {
    mode: "supabase",

    async getSettings() {
      try {
        const { data, error } = await client.from("site_settings").select("*").eq("id", 1).maybeSingle();
        if (error) {
          console.warn("[supabase-store] Lỗi đọc site_settings, dùng giá trị mặc định:", error.message);
          return EMPTY_SETTINGS;
        }
        if (!data) return EMPTY_SETTINGS;
        const row = data as Record<string, unknown>;
        const { contactNote, donateConfig } = parseContactNoteAndDonate(
          (row.contact_note as string) ?? null,
        );
        return {
          siteName: (row.site_name as string) ?? EMPTY_SETTINGS.siteName,
          siteDescription: (row.site_description as string) ?? null,
          logoUrl: (row.logo_url as string) ?? null,
          contactEmail: (row.contact_email as string) ?? null,
          contactNote,
          seoTitle: (row.seo_title as string) ?? null,
          seoDescription: (row.seo_description as string) ?? null,
          ogImageUrl: (row.og_image_url as string) ?? null,
          featuredMovieId: (row.featured_movie_id as string) ?? null,
          donateConfig,
          updatedAt: (row.updated_at as string) ?? EMPTY_SETTINGS.updatedAt,
        };
      } catch (err) {
        console.warn("[supabase-store] Ngoại lệ khi đọc site_settings, dùng giá trị mặc định:", err);
        return EMPTY_SETTINGS;
      }
    },

    async updateSettings(patch) {
      const payload: Record<string, unknown> = {};
      if (patch.siteName !== undefined) payload.site_name = patch.siteName;
      if (patch.siteDescription !== undefined) payload.site_description = patch.siteDescription;
      if (patch.logoUrl !== undefined) payload.logo_url = patch.logoUrl;
      if (patch.contactEmail !== undefined) payload.contact_email = patch.contactEmail;
      if (patch.contactNote !== undefined || patch.donateConfig !== undefined) {
        const current = await this.getSettings();
        const nextNote =
          patch.contactNote !== undefined ? patch.contactNote : current.contactNote;
        const nextDonate =
          patch.donateConfig !== undefined ? patch.donateConfig : current.donateConfig;
        payload.contact_note = serializeContactNoteWithDonate(nextNote, nextDonate);
      }
      if (patch.seoTitle !== undefined) payload.seo_title = patch.seoTitle;
      if (patch.seoDescription !== undefined) payload.seo_description = patch.seoDescription;
      if (patch.ogImageUrl !== undefined) payload.og_image_url = patch.ogImageUrl;
      if (patch.featuredMovieId !== undefined) payload.featured_movie_id = patch.featuredMovieId;

      const { error } = await client.from("site_settings").update(payload).eq("id", 1);
      if (error) throw new Error(error.message);
      return this.getSettings();
    },

    async getGenres() {
      const { data, error } = await client
        .from("genres")
        .select("id, name, slug, description, sort_order")
        .order("sort_order", { ascending: true });
      if (error) throw new Error(error.message);
      return ((data ?? []) as unknown as Array<{
        id: string; name: string; slug: string; description: string | null; sort_order: number;
      }>).map((r) => ({
        id: r.id,
        name: r.name,
        slug: r.slug,
        description: r.description,
        sortOrder: r.sort_order,
      }));
    },

    async getMovieGenres() {
      const { data: movies } = await client.from("movies").select("id");
      const ids = ((movies ?? []) as unknown as Array<{ id: string }>).map((m) => m.id);
      return loadGenres(ids);
    },

    async createGenre(input: GenreInput) {
      let sortOrder = input.sortOrder;
      if (sortOrder === undefined || sortOrder === null) {
        const existing = await this.getGenres();
        sortOrder = existing.reduce((max, g) => Math.max(max, g.sortOrder ?? 0), 0) + 1;
      }

      const { data, error } = await client
        .from("genres")
        .insert({
          name: input.name.trim(),
          slug: input.slug.trim(),
          description: input.description?.trim() || null,
          sort_order: sortOrder,
        })
        .select("id, name, slug, description, sort_order")
        .single();

      if (error) {
        if (error.code === "23505" || /duplicate key/i.test(error.message)) {
          throw new Error("Slug hoặc tên thể loại này đã tồn tại.");
        }
        throw new Error(error.message);
      }

      const row = data as unknown as {
        id: string;
        name: string;
        slug: string;
        description: string | null;
        sort_order: number;
      };
      return {
        id: row.id,
        name: row.name,
        slug: row.slug,
        description: row.description,
        sortOrder: row.sort_order,
      };
    },

    async updateGenre(id: string, input: GenreInput) {
      const payload: Record<string, unknown> = {
        name: input.name.trim(),
        slug: input.slug.trim(),
        description: input.description?.trim() || null,
      };
      if (input.sortOrder !== undefined && input.sortOrder !== null) {
        payload.sort_order = input.sortOrder;
      }

      const { data, error } = await client
        .from("genres")
        .update(payload)
        .eq("id", id)
        .select("id, name, slug, description, sort_order")
        .single();

      if (error) {
        if (error.code === "23505" || /duplicate key/i.test(error.message)) {
          throw new Error("Slug hoặc tên thể loại này đã tồn tại.");
        }
        throw new Error(error.message);
      }

      const row = data as unknown as {
        id: string;
        name: string;
        slug: string;
        description: string | null;
        sort_order: number;
      };
      return {
        id: row.id,
        name: row.name,
        slug: row.slug,
        description: row.description,
        sortOrder: row.sort_order,
      };
    },

    async deleteGenre(id: string) {
      // Xóa liên kết phim - thể loại trước để đảm bảo an toàn ràng buộc khóa ngoại
      await client.from("movie_genres").delete().eq("genre_id", id);
      const { error } = await client.from("genres").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },

    async listMovies(filters: MovieFilters): Promise<MovieListResult> {
      const perPage = filters.perPage ?? 12;
      const page = Math.max(1, filters.page ?? 1);

      // Lọc thể loại phải nằm trong SQL, trước khi phân trang.
      // Nếu lọc SAU khi đã cắt trang thì `total` bị sai và mỗi lọc lại tốn
      // thêm một vòng tròn PostgREST.
      //
      // Trước đây việc này tốn **hai** vòng tròn (tìm genre theo slug, rồi lấy
      // `movie_id` từ bảng liên kết). Nay chỉ còn một: lọc thẳng qua bảng liên
      // kết bằng `!inner` + điều kiện trên bảng quan hệ, PostgREST tự dịch
      // thành `EXISTS`. Cắt được ~90ms mỗi lần lọc.
      let genreMovieIds: string[] | null = null;
      if (filters.genre) {
        const { data: links, error: linkError } = await client
          .from("movie_genres")
          .select("movie_id, genres!inner(slug)")
          .eq("genres.slug", filters.genre);
        if (linkError) throw new Error(linkError.message);

        genreMovieIds = Array.from(
          new Set(
            ((links ?? []) as unknown as Array<{ movie_id: string }>).map((l) => l.movie_id),
          ),
        );
        if (genreMovieIds.length === 0) {
          return { movies: [], total: 0, page, perPage, totalPages: 1 };
        }
      }

      let query = client
        .from("movies")
        .select(MOVIE_COLUMNS, { count: "exact" })
        .eq("status", "published");

      if (filters.query) {
        const escaped = filters.query.replace(/[%,()]/g, " ");
        query = query.or(`title.ilike.%${escaped}%,original_title.ilike.%${escaped}%`);
      }
      if (filters.releaseStatus && filters.releaseStatus !== "all") {
        query = query.eq("release_status", filters.releaseStatus);
      }
      if (filters.year) {
        query = query.eq("year", filters.year);
      }
      if (genreMovieIds) query = query.in("id", genreMovieIds);

      // ---------------------------------------------------------------
      // Sắp xếp theo thể loại.
      //
      // PostgREST KHÔNG cho `order` theo quan hệ lồng nhau
      // (`order=genres.sort_order` → lỗi `PGRST100`), nên phải tự sắp
      // xếp ở tầng ứng dụng. Để phân trang vẫn đúng, ta làm 3 bước:
      //   1. lấy id + thứ tự thể loại của mọi phim khớp bộ lọc (1 vòng),
      //   2. sắp xếp id trong bộ nhớ theo thể loại rồi cắt trang,
      //   3. nạp đủ dữ liệu cho đúng trang đó (1 vòng).
      // Phim không có thể loại nào luôn nằm cuối danh sách.
      // ---------------------------------------------------------------
      if (filters.sort === "genre") {
        return listMoviesByGenre(filters, page, perPage);
      }

      switch (filters.sort) {
        case "newest":
          query = query.order("created_at", { ascending: false });
          break;
        default:
          query = query.order("updated_at", { ascending: false });
          break;
      }

      const from = (page - 1) * perPage;
      query = query.range(from, from + perPage - 1);

      const { data, error, count } = await query;
      if (error) throw new Error(error.message);

      const rows = (data ?? []) as unknown as DbMovieRow[];
      const movies = await hydrateMovies(rows);
      const total = count ?? movies.length;

      return {
        movies,
        total,
        page,
        perPage,
        totalPages: Math.max(1, Math.ceil(total / perPage)),
      };
    },

    /**
     * Danh sách năm phát hành (distinct) của phim đã xuất bản.
     *
     * Chỉ cần `year` nên query này rất nhẹ, thay cho việc tải toàn bộ danh
     * sách phim chỉ để suy ra danh sách năm.
     */
    async listMovieYears(): Promise<number[]> {
      const { data, error } = await client
        .from("movies")
        .select("year")
        .eq("status", "published")
        .not("year", "is", null);
      if (error) throw new Error(error.message);

      const years = ((data ?? []) as unknown as Array<{ year: number | null }>)
        .map((r) => r.year)
        .filter((y): y is number => typeof y === "number");
      return Array.from(new Set(years)).sort((a, b) => b - a);
    },

    async getMovieBySlug(slug) {
      const { data, error } = await client.from("movies").select("*").eq("slug", slug).maybeSingle();
      if (error) throw new Error(error.message);
      if (!data) return null;
      const [movie] = await hydrateMovies([data as unknown as DbMovieRow]);
      return movie ?? null;
    },

    async getMovieById(id) {
      if (!isUuid(id)) return null;
      const { data, error } = await client.from("movies").select("*").eq("id", id).maybeSingle();
      if (error) throw new Error(error.message);
      if (!data) return null;
      const [movie] = await hydrateMovies([data as unknown as DbMovieRow]);
      return movie ?? null;
    },

    async getRelatedMovies(movie, limit = 8) {
      const genreIds = movie.genres.map((g) => g.id);
      if (genreIds.length === 0) {
        const { data } = await client
          .from("movies")
          .select("*")
          .eq("status", "published")
          .neq("id", movie.id)
          .order("updated_at", { ascending: false })
          .limit(limit);
        return hydrateMovies((data ?? []) as unknown as DbMovieRow[]);
      }

      const { data: links } = await client
        .from("movie_genres")
        .select("movie_id")
        .in("genre_id", genreIds);
      const candidateIds = Array.from(
        new Set(((links ?? []) as unknown as Array<{ movie_id: string }>).map((l) => l.movie_id)),
      ).filter((id) => id !== movie.id);
      if (candidateIds.length === 0) return [];

      const { data } = await client
        .from("movies")
        .select("*")
        .in("id", candidateIds)
        .eq("status", "published")
        .limit(limit * 2);
      const candidates = await hydrateMovies((data ?? []) as unknown as DbMovieRow[]);
      const genreIdSet = new Set(genreIds);
      return candidates
        .map((m) => ({ m, score: m.genres.filter((g) => genreIdSet.has(g.id)).length }))
        .sort((a, b) => b.score - a.score)
        .slice(0, limit)
        .map((entry) => entry.m);
    },

    async listAllMoviesForAdmin() {
      const { data, error } = await client.from("movies").select("*").order("sort_order", { ascending: true });
      if (error) throw new Error(error.message);
      return hydrateMovies((data ?? []) as unknown as DbMovieRow[]);
    },

    async createMovie(input: MovieInput) {
      // Không còn ô "thứ tự hiển thị" trong form, nên phim mới luôn nằm cuối
      // danh sách quản trị.
      const { count } = await client
        .from("movies")
        .select("id", { count: "exact", head: true });

      const payload = {
        slug: input.slug,
        title: input.title,
        original_title: input.originalTitle ?? null,
        synopsis: input.synopsis ?? null,
        year: input.year ?? null,
        country: input.country ?? "Trung Quốc",
        director: input.director ?? null,
        cast: input.cast ?? [],
        poster_url: input.posterUrl ?? null,
        backdrop_url: input.backdropUrl ?? null,
        trailer_url: input.trailerUrl ?? null,
        status: input.status,
        release_status: input.releaseStatus,
        total_episodes: input.totalEpisodes ?? null,
        subtitle_label: input.subtitleLabel ?? null,
        is_featured: input.isFeatured ?? false,
        sort_order: input.sortOrder ?? count ?? 0,
        published_at: input.status === "published" ? new Date().toISOString() : null,
      };
      const { data, error } = await client.from("movies").insert(payload).select("*").single();
      if (error) throw new Error(error.message);
      await writeMovieGenres(data.id as string, input.genreIds);
      const [movie] = await hydrateMovies([data as unknown as DbMovieRow]);
      return movie!;
    },

    async updateMovie(id, input: MovieInput) {
      const payload = {
        slug: input.slug,
        title: input.title,
        original_title: input.originalTitle ?? null,
        synopsis: input.synopsis ?? null,
        year: input.year ?? null,
        country: input.country ?? "Trung Quốc",
        director: input.director ?? null,
        cast: input.cast ?? [],
        poster_url: input.posterUrl ?? null,
        backdrop_url: input.backdropUrl ?? null,
        trailer_url: input.trailerUrl ?? null,
        status: input.status,
        release_status: input.releaseStatus,
        total_episodes: input.totalEpisodes ?? null,
        subtitle_label: input.subtitleLabel ?? null,
        is_featured: input.isFeatured ?? false,
        sort_order: input.sortOrder ?? 0,
        published_at: input.status === "published" ? new Date().toISOString() : null,
      };
      const { data, error } = await client.from("movies").update(payload).eq("id", id).select("*").single();
      if (error) throw new Error(error.message);
      await writeMovieGenres(id, input.genreIds);
      const [movie] = await hydrateMovies([data as unknown as DbMovieRow]);
      return movie!;
    },

    async deleteMovie(id) {
      const { error } = await client.from("movies").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },

    async listEpisodes(movieId) {
      if (!isUuid(movieId)) return [];
      const { data, error } = await client
        .from("episodes")
        .select("*")
        .eq("movie_id", movieId)
        .order("episode_number", { ascending: true });
      if (error) throw new Error(error.message);
      return hydrateEpisodes((data ?? []) as unknown as DbEpisodeRow[]);
    },

    async getEpisodeBySlug(movieSlug, episodeSlug) {
      // Trang xem là công khai, nên phim và tập đều phải đã xuất bản. Không
      // lọc ở đây sẽ cho phép xem tập nháp qua URL trực tiếp.
      const { data: movieRow, error: movieError } = await client
        .from("movies")
        .select("*")
        .eq("slug", movieSlug)
        .eq("status", "published")
        .maybeSingle();
      if (movieError) throw new Error(movieError.message);
      if (!movieRow) return null;

      const [movie] = await hydrateMovies([movieRow as unknown as DbMovieRow]);
      if (!movie) return null;

      const { data: episodeRows } = await client
        .from("episodes")
        .select("*")
        .eq("movie_id", movie.id)
        .order("episode_number", { ascending: true });
      const siblings = await hydrateEpisodes((episodeRows ?? []) as unknown as DbEpisodeRow[]);
      const episode = siblings.find((e) => e.slug === episodeSlug && e.status === "published");
      if (!episode) return null;
      return { episode, movie, siblings };
    },

    async getLatestPublishedEpisode(movieId) {
      const { data } = await client
        .from("episodes")
        .select("*")
        .eq("movie_id", movieId)
        .eq("status", "published")
        .order("episode_number", { ascending: true });
      const rows = (data ?? []) as unknown as DbEpisodeRow[];
      if (rows.length === 0) return null;
      const episodes = await hydrateEpisodes(rows);
      return episodes[episodes.length - 1] ?? null;
    },

    async createEpisode(input: EpisodeInput) {
      const payload = {
        movie_id: input.movieId,
        episode_number: input.episodeNumber,
        title: input.title,
        slug: input.slug,
        release_date: input.releaseDate ?? null,
        status: input.status,
        description: input.description ?? null,
      };
      const { data, error } = await client.from("episodes").insert(payload).select("*").single();
      if (error) throw new Error(error.message);
      await writeEpisodeSources(data.id as string, input.sources);
      const [episode] = await hydrateEpisodes([data as unknown as DbEpisodeRow]);
      return episode!;
    },

    async updateEpisode(id, input: EpisodeInput) {
      const payload = {
        movie_id: input.movieId,
        episode_number: input.episodeNumber,
        title: input.title,
        slug: input.slug,
        release_date: input.releaseDate ?? null,
        status: input.status,
        description: input.description ?? null,
      };
      const { data, error } = await client.from("episodes").update(payload).eq("id", id).select("*").single();
      if (error) throw new Error(error.message);
      await writeEpisodeSources(id, input.sources);
      const [episode] = await hydrateEpisodes([data as unknown as DbEpisodeRow]);
      return episode!;
    },

    async deleteEpisode(id) {
      const { error } = await client.from("episodes").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },

    async getScheduleForWeek(weekStart): Promise<ScheduleWeek> {
      // The week window is anchored on Vietnam-local midnight (UTC+7), not UTC
      // midnight, so events between 00:00 and 07:00 local time are included.
      const { startIso, endIso } = getWeekUtcRange(weekStart);
      const { data, error } = await client
        .from("schedule_events")
        .select("*")
        .gte("scheduled_at", startIso)
        .lt("scheduled_at", endIso)
        .order("scheduled_at", { ascending: true });
      if (error) throw new Error(error.message);
      const rows = (data ?? []) as unknown as DbScheduleRow[];

      // Phim và tập được nạp song song. Trước đây hai khối này chạy nối tiếp,
      // mỗi khối gồm cả một vòng `hydrateMovies` (2 truy vấn) nên riêng lịch
      // chiếu đã tốn 4 vòng tròn liên tiếp.
      const movieIds = Array.from(new Set(rows.map((r) => r.movie_id)));
      const episodeIds = rows.map((r) => r.episode_id).filter((id): id is string => Boolean(id));

      const [movieMap, episodeMap] = await Promise.all([
        movieIds.length === 0
          ? Promise.resolve(new Map<string, Movie>())
          : client
            .from("movies")
            .select("*")
            .in("id", movieIds)
            .then(async ({ data: movieRows }) => {
              const hydrated = await hydrateMovies(
                (movieRows ?? []) as unknown as DbMovieRow[],
              );
              return new Map(hydrated.map((m) => [m.id, m]));
            }),
        episodeIds.length === 0
          ? Promise.resolve(new Map<string, Episode>())
          : client
            .from("episodes")
            .select("*")
            .in("id", episodeIds)
            .then(async ({ data: episodeRows }) => {
              const hydrated = await hydrateEpisodes(
                (episodeRows ?? []) as unknown as DbEpisodeRow[],
              );
              return new Map(hydrated.map((e) => [e.id, e]));
            }),
      ]);

      return {
        weekStart,
        weekEnd: addDays(weekStart, 6),
        events: rows.map((row) =>
          mapSchedule(
            row,
            movieMap.get(row.movie_id) ?? null,
            row.episode_id ? (episodeMap.get(row.episode_id) ?? null) : null,
          ),
        ),
      };
    },

    async listUpcomingSchedule(limit = 10) {
      const { data, error } = await client
        .from("schedule_events")
        .select("*")
        .gte("scheduled_at", new Date().toISOString())
        .order("scheduled_at", { ascending: true })
        .limit(limit);
      if (error) throw new Error(error.message);
      const rows = (data ?? []) as unknown as DbScheduleRow[];
      if (rows.length === 0) return [];

      const movieIds = Array.from(new Set(rows.map((r) => r.movie_id)));
      const { data: movieRows } = await client.from("movies").select("*").in("id", movieIds);
      const movies = await hydrateMovies((movieRows ?? []) as unknown as DbMovieRow[]);
      const movieMap = new Map(movies.map((m) => [m.id, m]));

      return rows.map((row) => mapSchedule(row, movieMap.get(row.movie_id) ?? null, null));
    },

    async listAllScheduleEvents() {
      const { data, error } = await client
        .from("schedule_events")
        .select("*")
        .order("scheduled_at", { ascending: false });
      if (error) throw new Error(error.message);
      const rows = (data ?? []) as unknown as DbScheduleRow[];
      const movieIds = Array.from(new Set(rows.map((r) => r.movie_id)));
      const { data: movieRows } = await client.from("movies").select("*").in("id", movieIds);
      const movies = await hydrateMovies((movieRows ?? []) as unknown as DbMovieRow[]);
      const movieMap = new Map(movies.map((m) => [m.id, m]));
      return rows.map((row) => mapSchedule(row, movieMap.get(row.movie_id) ?? null, null));
    },

    async createScheduleEvent(input: ScheduleEventInput) {
      const payload = {
        movie_id: input.movieId,
        episode_id: input.episodeId ?? null,
        episode_number: input.episodeNumber ?? null,
        scheduled_at: input.scheduledAt,
        status: input.status,
        note: input.note ?? null,
      };
      const { data, error } = await client.from("schedule_events").insert(payload).select("*").single();
      if (error) throw new Error(error.message);
      const { data: movieRows } = await client
        .from("movies")
        .select("*")
        .eq("id", input.movieId)
        .maybeSingle();
      const [movie] = await hydrateMovies(movieRows ? [movieRows as unknown as DbMovieRow] : []);
      return mapSchedule(data as unknown as DbScheduleRow, movie ?? null, null);
    },

    async updateScheduleEvent(id, input: ScheduleEventInput) {
      const payload = {
        movie_id: input.movieId,
        episode_id: input.episodeId ?? null,
        episode_number: input.episodeNumber ?? null,
        scheduled_at: input.scheduledAt,
        status: input.status,
        note: input.note ?? null,
      };
      const { data, error } = await client
        .from("schedule_events")
        .update(payload)
        .eq("id", id)
        .select("*")
        .single();
      if (error) throw new Error(error.message);
      const { data: movieRows } = await client
        .from("movies")
        .select("*")
        .eq("id", input.movieId)
        .maybeSingle();
      const [movie] = await hydrateMovies(movieRows ? [movieRows as unknown as DbMovieRow] : []);
      return mapSchedule(data as unknown as DbScheduleRow, movie ?? null, null);
    },

    async deleteScheduleEvent(id) {
      const { error } = await client.from("schedule_events").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },

    async listPosts(options) {
      let query = client.from("posts").select(POST_LIST_COLUMNS).eq("status", "published");
      if (options?.type) query = query.eq("type", options.type);
      query = query.order("published_at", { ascending: false, nullsFirst: false });
      if (options?.limit) query = query.limit(options.limit);

      const { data, error } = await query;
      if (error) throw new Error(error.message);
      const rows = (data ?? []) as unknown as DbPostRow[];
      if (rows.length === 0) return [];

      const postIds = rows.map((r) => r.id);
      const { data: links } = await client
        .from("post_movies")
        .select("post_id, movie_id")
        .in("post_id", postIds);
      const movieIds = Array.from(
        new Set(((links ?? []) as unknown as Array<{ movie_id: string }>).map((l) => l.movie_id)),
      );
      // Chỉ cần id/slug/title/ảnh cho danh sách bài viết, nên dùng bản nhẹ
      // thay vì `hydrateMovies` (thêm 2 vòng PostgREST cho thể loại + đếm tập).
      const movies = await loadMovieRefs(movieIds);
      const movieMap = new Map(movies.map((m) => [m.id, m]));

      return rows.map((row) => {
        const related = ((links ?? []) as unknown as Array<{ post_id: string; movie_id: string }>)
          .filter((l) => l.post_id === row.id)
          .map((l) => movieMap.get(l.movie_id))
          .filter((m): m is Pick<Movie, "id" | "slug" | "title" | "posterUrl"> => Boolean(m))
          .map((m) => ({ id: m.id, slug: m.slug, title: m.title, posterUrl: m.posterUrl }));
        return mapPost(row, related);
      });
    },

    async listAllPostsForAdmin() {
      const { data, error } = await client
        .from("posts")
        .select(POST_LIST_COLUMNS)
        .order("updated_at", { ascending: false });
      if (error) throw new Error(error.message);
      const rows = (data ?? []) as unknown as DbPostRow[];
      if (rows.length === 0) return [];

      const postIds = rows.map((r) => r.id);
      const { data: links } = await client
        .from("post_movies")
        .select("post_id, movie_id")
        .in("post_id", postIds);
      const movieIds = Array.from(
        new Set(((links ?? []) as unknown as Array<{ movie_id: string }>).map((l) => l.movie_id)),
      );
      const movies = await loadMovieRefs(movieIds);
      const movieMap = new Map(movies.map((m) => [m.id, m]));

      return rows.map((row) => {
        const related = ((links ?? []) as unknown as Array<{ post_id: string; movie_id: string }>)
          .filter((l) => l.post_id === row.id)
          .map((l) => movieMap.get(l.movie_id))
          .filter((m): m is Pick<Movie, "id" | "slug" | "title" | "posterUrl"> => Boolean(m))
          .map((m) => ({ id: m.id, slug: m.slug, title: m.title, posterUrl: m.posterUrl }));
        return mapPost(row, related);
      });
    },

    async getPostBySlug(slug) {
      // Chỉ trả về bài đã xuất bản: hàm này phục vụ trang công khai, còn admin
      // đọc bài nháp qua `listAllPostsForAdmin`/`getPostById`.
      const { data, error } = await client
        .from("posts")
        .select(POST_DETAIL_COLUMNS)
        .eq("slug", slug)
        .eq("status", "published")
        .maybeSingle();
      if (error) throw new Error(error.message);
      if (!data) return null;
      const row = data as unknown as DbPostRow;
      const { data: links } = await client
        .from("post_movies")
        .select("movie_id")
        .eq("post_id", row.id);
      const ids = ((links ?? []) as unknown as Array<{ movie_id: string }>).map((l) => l.movie_id);
      const related = await loadMovieRefs(ids);
      return mapPost(row, related);
    },

    async getPostById(id) {
      if (!isUuid(id)) return null;
      const { data, error } = await client
        .from("posts")
        .select(POST_DETAIL_COLUMNS)
        .eq("id", id)
        .maybeSingle();
      if (error) throw new Error(error.message);
      if (!data) return null;
      return mapPost(data as unknown as DbPostRow, []);
    },

    async createPost(input: PostInput) {
      const payload = {
        slug: input.slug,
        title: input.title,
        excerpt: input.excerpt ?? null,
        content: input.content,
        cover_image_url: input.coverImageUrl ?? null,
        type: input.type,
        status: input.status,
        week_start: input.weekStart ?? null,
        published_at: input.status === "published" ? new Date().toISOString() : null,
      };
      const { data, error } = await client.from("posts").insert(payload).select("*").single();
      if (error) throw new Error(error.message);
      await writePostMovies(data.id as string, input.movieIds);
      return mapPost(data as unknown as DbPostRow, []);
    },

    async updatePost(id, input: PostInput) {
      const payload = {
        slug: input.slug,
        title: input.title,
        excerpt: input.excerpt ?? null,
        content: input.content,
        cover_image_url: input.coverImageUrl ?? null,
        type: input.type,
        status: input.status,
        week_start: input.weekStart ?? null,
        published_at: input.status === "published" ? new Date().toISOString() : null,
      };
      const { data, error } = await client.from("posts").update(payload).eq("id", id).select("*").single();
      if (error) throw new Error(error.message);
      await writePostMovies(id, input.movieIds);
      return mapPost(data as unknown as DbPostRow, []);
    },

    async deletePost(id) {
      const { error } = await client.from("posts").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },

    async getDashboardStats(): Promise<DashboardStats> {
      const now = new Date().toISOString();
      const [moviesResult, episodesResult, postsResult, scheduleResult, recentMoviesResult, recentPostsResult] =
        await Promise.all([
          client.from("movies").select("id", { count: "exact", head: true }),
          client.from("episodes").select("id", { count: "exact", head: true }),
          client.from("posts").select("id", { count: "exact", head: true }),
          client
            .from("schedule_events")
            .select("id", { count: "exact", head: true })
            .gte("scheduled_at", now)
            .eq("status", "scheduled"),
          client.from("movies").select("*").order("updated_at", { ascending: false }).limit(5),
          client.from("posts").select("*").order("updated_at", { ascending: false }).limit(5),
        ]);

      const { count: publishedEpisodeCount } = await client
        .from("episodes")
        .select("id", { count: "exact", head: true })
        .eq("status", "published");
      const { count: publishedMovieCount } = await client
        .from("movies")
        .select("id", { count: "exact", head: true })
        .eq("status", "published");

      const recentMovies = await hydrateMovies(
        (recentMoviesResult.data ?? []) as unknown as DbMovieRow[],
      );
      const recentPosts = ((recentPostsResult.data ?? []) as unknown as DbPostRow[]).map((r) =>
        mapPost(r, []),
      );
      const upcoming = await this.listUpcomingSchedule(5);

      return {
        movieCount: moviesResult.count ?? 0,
        publishedMovieCount: publishedMovieCount ?? 0,
        episodeCount: episodesResult.count ?? 0,
        publishedEpisodeCount: publishedEpisodeCount ?? 0,
        postCount: postsResult.count ?? 0,
        upcomingScheduleCount: scheduleResult.count ?? 0,
        recentMovies,
        recentPosts,
        upcomingEvents: upcoming,
      };
    },
  };
}

/** Convenience factory that binds the store to a fresh request-scoped client. */
export async function getSupabaseStore(): Promise<DataStore> {
  const client = await createClient();
  return createSupabaseStore(client as unknown as Db);
}

/**
 * Store bound to the anonymous (public) client.
 *
 * Because this client never reads `cookies()`, pages that use it stay eligible
 * for static rendering / ISR instead of being forced into dynamic rendering.
 * Row Level Security still limits it to published content.
 */
export function getPublicSupabaseStore(): DataStore {
  return createSupabaseStore(createPublicClient() as unknown as Db);
}

export { slugify };

