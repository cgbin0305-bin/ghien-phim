/**
 * Domain types shared by the demo data layer and the Supabase data layer.
 *
 * Publication status (`status`) is deliberately separate from the release/airing
 * state (`release_status`) of a movie. A movie can be published while still
 * being "upcoming" (sắp chiếu) - meaning it is visible but has no episodes yet.
 */

export type PublicationStatus = "draft" | "published";

export type ReleaseStatus = "upcoming" | "airing" | "completed";

export type ScheduleStatus = "scheduled" | "aired" | "postponed";

export type PostType = "weekly_schedule" | "movie_intro" | "announcement";

export type SubtitleLabel = "vietsub" | "thuyet_minh" | "raw";

export type VideoProvider = "youtube" | "facebook";

export interface Genre {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  sortOrder?: number;
}

export interface Movie {
  id: string;
  slug: string;
  title: string;
  originalTitle: string | null;
  synopsis: string | null;
  year: number | null;
  country: string | null;
  director: string | null;
  cast: string[] | null;
  posterUrl: string | null;
  backdropUrl: string | null;
  trailerUrl: string | null;
  status: PublicationStatus;
  releaseStatus: ReleaseStatus;
  totalEpisodes: number | null;
  subtitleLabel: SubtitleLabel | null;
  isFeatured: boolean;
  sortOrder: number;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  genres: Genre[];
}

export interface VideoSource {
  id: string;
  episodeId: string;
  provider: VideoProvider;
  /** Normalised, provider-specific source URL (watch page, not an embed URL). */
  sourceUrl: string;
  label: string;
  priority: number;
  createdAt: string;
}

export interface Episode {
  id: string;
  movieId: string;
  episodeNumber: number;
  title: string;
  slug: string;
  releaseDate: string | null;
  status: PublicationStatus;
  description: string | null;
  createdAt: string;
  updatedAt: string;
  sources: VideoSource[];
}

export interface ScheduleEvent {
  id: string;
  movieId: string;
  episodeId: string | null;
  episodeNumber: number | null;
  /** Instant the episode is scheduled to go live (timestamptz). */
  scheduledAt: string;
  status: ScheduleStatus;
  note: string | null;
  createdAt: string;
  updatedAt: string;
  movie?: Pick<Movie, "id" | "slug" | "title" | "posterUrl"> | null;
  episode?: Pick<Episode, "id" | "slug" | "title" | "episodeNumber" | "status"> | null;
}

export interface Post {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  /** Markdown source. Rendered with react-markdown + rehype-sanitize. */
  content: string;
  coverImageUrl: string | null;
  type: PostType;
  status: PublicationStatus;
  weekStart: string | null;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  movies: Pick<Movie, "id" | "slug" | "title" | "posterUrl">[];
}

export interface SiteSettings {
  siteName: string;
  siteDescription: string | null;
  logoUrl: string | null;
  contactEmail: string | null;
  contactNote: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  ogImageUrl: string | null;
  featuredMovieId: string | null;
  updatedAt: string;
}

/** A movie enriched with episode counts, for list/grid rendering. */
export interface MovieWithStats extends Movie {
  publishedEpisodeCount: number;
  episodeCount: number;
}
