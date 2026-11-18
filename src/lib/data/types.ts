import type {
  Episode,
  Genre,
  Movie,
  MovieWithStats,
  Post,
  PublicationStatus,
  ReleaseStatus,
  ScheduleEvent,
  ScheduleStatus,
  SiteSettings,
} from "@/lib/types";

export interface MovieFilters {
  query?: string;
  genre?: string;
  year?: number;
  releaseStatus?: ReleaseStatus | "all";
  /**
   * Thứ tự sắp xếp của danh sách phim.
   *
   * - `recent`: mới cập nhật (theo `updated_at` giảm dần).
   * - `newest`: mới thêm (theo `created_at` giảm dần).
   * - `year`: theo năm phát hành giảm dần.
   * - `genre`: theo thể loại (theo thứ tự thể loại trong hệ thống).
   */
  sort?: "recent" | "newest" | "genre" | "year";
  page?: number;
  perPage?: number;
}

export interface MovieListResult {
  movies: MovieWithStats[];
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
}

export interface ScheduleWeek {
  /** ISO date (yyyy-mm-dd) of Monday, in Asia/Ho_Chi_Minh. */
  weekStart: string;
  weekEnd: string;
  events: ScheduleEvent[];
}

export interface DashboardStats {
  movieCount: number;
  publishedMovieCount: number;
  episodeCount: number;
  publishedEpisodeCount: number;
  postCount: number;
  upcomingScheduleCount: number;
  recentMovies: Movie[];
  recentPosts: Post[];
  upcomingEvents: ScheduleEvent[];
}

/**
 * The single data-access contract used by every page and Server Action.
 * Two implementations exist: `demo` (in-memory seed) and `supabase`.
 */
export interface DataStore {
  readonly mode: "demo" | "supabase";

  getSettings(): Promise<SiteSettings>;
  updateSettings(patch: Partial<SiteSettings>): Promise<SiteSettings>;

  getGenres(): Promise<Genre[]>;
  getMovieGenres(): Promise<Map<string, Genre[]>>;
  createGenre(input: GenreInput): Promise<Genre>;
  updateGenre(id: string, input: GenreInput): Promise<Genre>;
  deleteGenre(id: string): Promise<void>;

  listMovies(filters: MovieFilters): Promise<MovieListResult>;
  listMovieYears(): Promise<number[]>;
  getMovieBySlug(slug: string): Promise<MovieWithStats | null>;
  getMovieById(id: string): Promise<MovieWithStats | null>;
  getRelatedMovies(movie: MovieWithStats, limit?: number): Promise<MovieWithStats[]>;
  listAllMoviesForAdmin(): Promise<MovieWithStats[]>;

  createMovie(input: MovieInput): Promise<Movie>;
  updateMovie(id: string, input: MovieInput): Promise<Movie>;
  deleteMovie(id: string): Promise<void>;

  listEpisodes(movieId: string): Promise<Episode[]>;
  getEpisodeBySlug(
    movieSlug: string,
    episodeSlug: string,
  ): Promise<{ episode: Episode; movie: MovieWithStats; siblings: Episode[] } | null>;
  getLatestPublishedEpisode(movieId: string): Promise<Episode | null>;
  createEpisode(input: EpisodeInput): Promise<Episode>;
  updateEpisode(id: string, input: EpisodeInput): Promise<Episode>;
  deleteEpisode(id: string): Promise<void>;

  getScheduleForWeek(weekStart: string): Promise<ScheduleWeek>;
  listUpcomingSchedule(limit?: number): Promise<ScheduleEvent[]>;
  createScheduleEvent(input: ScheduleEventInput): Promise<ScheduleEvent>;
  updateScheduleEvent(id: string, input: ScheduleEventInput): Promise<ScheduleEvent>;
  deleteScheduleEvent(id: string): Promise<void>;
  listAllScheduleEvents(): Promise<ScheduleEvent[]>;

  listPosts(options?: { type?: Post["type"]; limit?: number }): Promise<Post[]>;
  /** Every post, published or not - admin listing only. */
  listAllPostsForAdmin(): Promise<Post[]>;
  getPostBySlug(slug: string): Promise<Post | null>;
  getPostById(id: string): Promise<Post | null>;
  createPost(input: PostInput): Promise<Post>;
  updatePost(id: string, input: PostInput): Promise<Post>;
  deletePost(id: string): Promise<void>;

  getDashboardStats(): Promise<DashboardStats>;
}

export interface GenreInput {
  name: string;
  slug: string;
  description?: string | null;
  sortOrder?: number | null;
}

export interface MovieInput {
  slug: string;
  title: string;
  originalTitle?: string | null;
  synopsis?: string | null;
  year?: number | null;
  country?: string | null;
  director?: string | null;
  cast?: string[];
  posterUrl?: string | null;
  backdropUrl?: string | null;
  trailerUrl?: string | null;
  status: PublicationStatus;
  releaseStatus: ReleaseStatus;
  totalEpisodes?: number | null;
  subtitleLabel?: Movie["subtitleLabel"];
  isFeatured?: boolean;
  sortOrder?: number;
  genreIds: string[];
}

export interface EpisodeInput {
  movieId: string;
  episodeNumber: number;
  title: string;
  slug: string;
  releaseDate?: string | null;
  status: PublicationStatus;
  description?: string | null;
  sources: {
    id?: string;
    provider: Episode["sources"][number]["provider"];
    sourceUrl: string;
    label: string;
    priority: number;
  }[];
}

export interface ScheduleEventInput {
  movieId: string;
  episodeId?: string | null;
  episodeNumber?: number | null;
  scheduledAt: string;
  status: ScheduleStatus;
  note?: string | null;
}

export interface PostInput {
  slug: string;
  title: string;
  excerpt?: string | null;
  content: string;
  coverImageUrl?: string | null;
  type: Post["type"];
  status: PublicationStatus;
  weekStart?: string | null;
  movieIds: string[];
}
