/**
 * Hand-written Supabase schema types.
 *
 * These mirror `supabase/migrations/001_initial_schema.sql`. They are kept in
 * sync manually; regenerate with:
 *   npx supabase gen types typescript --local > src/lib/database.types.ts
 */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type PublicationStatus = "draft" | "published";
export type ReleaseStatus = "upcoming" | "airing" | "completed";
export type ScheduleStatus = "scheduled" | "aired" | "postponed";
export type PostType = "weekly_schedule" | "movie_intro" | "announcement";
export type SubtitleLabel = "vietsub" | "thuyet_minh" | "raw";
export type VideoProvider = "youtube" | "facebook";

interface Table<Row, Insert = Row, Update = Partial<Insert>> {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
}

export interface Database {
  public: {
    Tables: {
      profiles: Table<
        {
          id: string;
          email: string;
          display_name: string | null;
          role: string;
          created_at: string;
          updated_at: string;
        },
        {
          id: string;
          email: string;
          display_name?: string | null;
          role?: string;
          created_at?: string;
          updated_at?: string;
        }
      >;
      genres: Table<
        {
          id: string;
          name: string;
          slug: string;
          description: string | null;
          sort_order: number;
          created_at: string;
          updated_at: string;
        },
        {
          id?: string;
          name: string;
          slug: string;
          description?: string | null;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        }
      >;
      movies: Table<
        {
          id: string;
          slug: string;
          title: string;
          original_title: string | null;
          synopsis: string | null;
          year: number | null;
          country: string | null;
          director: string | null;
          cast: string[];
          poster_url: string | null;
          backdrop_url: string | null;
          trailer_url: string | null;
          status: PublicationStatus;
          release_status: ReleaseStatus;
          total_episodes: number | null;
          subtitle_label: SubtitleLabel | null;
          is_featured: boolean;
          sort_order: number;
          views?: number;
          reactions?: Json;
          published_at: string | null;
          created_at: string;
          updated_at: string;
        },
        {
          id?: string;
          slug: string;
          title: string;
          original_title?: string | null;
          synopsis?: string | null;
          year?: number | null;
          country?: string | null;
          director?: string | null;
          cast?: string[];
          poster_url?: string | null;
          backdrop_url?: string | null;
          trailer_url?: string | null;
          status?: PublicationStatus;
          release_status?: ReleaseStatus;
          total_episodes?: number | null;
          subtitle_label?: SubtitleLabel | null;
          is_featured?: boolean;
          sort_order?: number;
          views?: number;
          reactions?: Json;
          published_at?: string | null;
          created_at?: string;
          updated_at?: string;
        }
      >;
      movie_genres: Table<
        { movie_id: string; genre_id: string },
        { movie_id: string; genre_id: string },
        { movie_id?: string; genre_id?: string }
      >;
      episodes: Table<
        {
          id: string;
          movie_id: string;
          episode_number: number;
          title: string;
          slug: string;
          release_date: string | null;
          status: PublicationStatus;
          description: string | null;
          created_at: string;
          updated_at: string;
        },
        {
          id?: string;
          movie_id: string;
          episode_number: number;
          title: string;
          slug: string;
          release_date?: string | null;
          status?: PublicationStatus;
          description?: string | null;
          created_at?: string;
          updated_at?: string;
        }
      >;
      video_sources: Table<
        {
          id: string;
          episode_id: string;
          provider: VideoProvider;
          source_url: string;
          label: string;
          priority: number;
          created_at: string;
          updated_at: string;
        },
        {
          id?: string;
          episode_id: string;
          provider: VideoProvider;
          source_url: string;
          label?: string;
          priority?: number;
          created_at?: string;
          updated_at?: string;
        }
      >;
      schedule_events: Table<
        {
          id: string;
          movie_id: string;
          episode_id: string | null;
          episode_number: number | null;
          scheduled_at: string;
          status: ScheduleStatus;
          note: string | null;
          created_at: string;
          updated_at: string;
        },
        {
          id?: string;
          movie_id: string;
          episode_id?: string | null;
          episode_number?: number | null;
          scheduled_at: string;
          status?: ScheduleStatus;
          note?: string | null;
          created_at?: string;
          updated_at?: string;
        }
      >;
      posts: Table<
        {
          id: string;
          slug: string;
          title: string;
          excerpt: string | null;
          content: string;
          cover_image_url: string | null;
          type: PostType;
          status: PublicationStatus;
          week_start: string | null;
          published_at: string | null;
          created_at: string;
          updated_at: string;
        },
        {
          id?: string;
          slug: string;
          title: string;
          excerpt?: string | null;
          content?: string;
          cover_image_url?: string | null;
          type?: PostType;
          status?: PublicationStatus;
          week_start?: string | null;
          published_at?: string | null;
          created_at?: string;
          updated_at?: string;
        }
      >;
      post_movies: Table<
        { post_id: string; movie_id: string },
        { post_id: string; movie_id: string },
        { post_id?: string; movie_id?: string }
      >;
      site_settings: Table<
        {
          id: number;
          site_name: string;
          site_description: string | null;
          logo_url: string | null;
          contact_email: string | null;
          contact_note: string | null;
          seo_title: string | null;
          seo_description: string | null;
          og_image_url: string | null;
          featured_movie_id: string | null;
          updated_at: string;
        },
        {
          id?: number;
          site_name?: string;
          site_description?: string | null;
          logo_url?: string | null;
          contact_email?: string | null;
          contact_note?: string | null;
          seo_title?: string | null;
          seo_description?: string | null;
          og_image_url?: string | null;
          featured_movie_id?: string | null;
          updated_at?: string;
        }
      >;
      broken_reports: Table<
        {
          id: string;
          movie_id: string;
          episode_id: string;
          movie_slug: string;
          movie_title: string;
          episode_slug: string;
          episode_title: string;
          server_label: string | null;
          note: string | null;
          status: "pending" | "resolved";
          created_at: string;
        },
        {
          id?: string;
          movie_id: string;
          episode_id: string;
          movie_slug: string;
          movie_title: string;
          episode_slug: string;
          episode_title: string;
          server_label?: string | null;
          note?: string | null;
          status?: "pending" | "resolved";
          created_at?: string;
        }
      >;
    };
    Views: Record<string, never>;
    Functions: {
      increment_movie_view: {
        Args: { target_movie_id: string };
        Returns: number;
      };
      increment_movie_reaction: {
        Args: { target_movie_id: string; reaction_key: string };
        Returns: Json;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
