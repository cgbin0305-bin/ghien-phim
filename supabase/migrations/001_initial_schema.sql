-- =============================================================================
-- Ghiền Phim — migration 001
-- Core schema: profiles, genres, movies, episodes, video sources, schedule,
-- posts and site settings. All timestamps are `timestamptz` and are rendered
-- in the Asia/Ho_Chi_Minh timezone at the application layer.
-- =============================================================================

create extension if not exists "pgcrypto";

-- -----------------------------------------------------------------------------
-- profiles: admin accounts. Roles live here so a user cannot self-promote.
-- -----------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  display_name text,
  role text not null default 'viewer' check (role in ('admin', 'viewer')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is 'Vai trò người dùng. Chỉ tài khoản có role=admin được phép truy cập khu vực quản trị.';

-- -----------------------------------------------------------------------------
-- genres
-- -----------------------------------------------------------------------------
create table if not exists public.genres (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- movies
--   status         : publication (draft / published) - controls public visibility
--   release_status : airing state of the show (upcoming / airing / completed)
-- These two are independent on purpose: a published movie may still be
-- "sắp chiếu" when no episode is available yet.
-- -----------------------------------------------------------------------------
create table if not exists public.movies (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  original_title text,
  synopsis text,
  year integer,
  country text default 'Trung Quốc',
  director text,
  cast text[] not null default '{}',
  poster_url text,
  backdrop_url text,
  trailer_url text,
  status text not null default 'draft' check (status in ('draft', 'published')),
  release_status text not null default 'upcoming' check (release_status in ('upcoming', 'airing', 'completed')),
  total_episodes integer,
  subtitle_label text check (subtitle_label in ('vietsub', 'thuyet_minh', 'raw')),
  is_featured boolean not null default false,
  sort_order integer not null default 0,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists movies_status_idx on public.movies (status);
create index if not exists movies_release_status_idx on public.movies (release_status);
create index if not exists movies_published_at_idx on public.movies (published_at desc);
create index if not exists movies_sort_order_idx on public.movies (sort_order);
create index if not exists movies_year_idx on public.movies (year);
-- Supports title / original title search on the public listing.
create index if not exists movies_title_search_idx on public.movies using gin (
  to_tsvector('simple', coalesce(title, '') || ' ' || coalesce(original_title, ''))
);

-- -----------------------------------------------------------------------------
-- movie_genres (many-to-many)
-- -----------------------------------------------------------------------------
create table if not exists public.movie_genres (
  movie_id uuid not null references public.movies (id) on delete cascade,
  genre_id uuid not null references public.genres (id) on delete cascade,
  primary key (movie_id, genre_id)
);

create index if not exists movie_genres_genre_idx on public.movie_genres (genre_id);

-- -----------------------------------------------------------------------------
-- episodes
--   Deleting a movie cascades to its episodes (and their video sources).
--   Recommended operational practice is to archive (status='draft') instead.
-- -----------------------------------------------------------------------------
create table if not exists public.episodes (
  id uuid primary key default gen_random_uuid(),
  movie_id uuid not null references public.movies (id) on delete cascade,
  episode_number integer not null check (episode_number > 0),
  title text not null,
  slug text not null,
  release_date date,
  status text not null default 'draft' check (status in ('draft', 'published')),
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint episodes_movie_number_unique unique (movie_id, episode_number),
  constraint episodes_movie_slug_unique unique (movie_id, slug)
);

create index if not exists episodes_movie_idx on public.episodes (movie_id, episode_number);
create index if not exists episodes_status_idx on public.episodes (status);

-- -----------------------------------------------------------------------------
-- video_sources
--   provider + source_url only. The embed URL is derived server-side from a
--   validated URL, so no arbitrary markup ever reaches an iframe `src`.
-- -----------------------------------------------------------------------------
create table if not exists public.video_sources (
  id uuid primary key default gen_random_uuid(),
  episode_id uuid not null references public.episodes (id) on delete cascade,
  provider text not null check (provider in ('youtube', 'facebook')),
  source_url text not null,
  label text not null default 'Nguồn chính',
  priority integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists video_sources_episode_idx on public.video_sources (episode_id, priority);

-- -----------------------------------------------------------------------------
-- schedule_events
--   episode_id is nullable: the schedule supports planned episodes that have
--   not been created yet (episode_number is used for those).
-- -----------------------------------------------------------------------------
create table if not exists public.schedule_events (
  id uuid primary key default gen_random_uuid(),
  movie_id uuid not null references public.movies (id) on delete cascade,
  episode_id uuid references public.episodes (id) on delete set null,
  episode_number integer,
  scheduled_at timestamptz not null,
  status text not null default 'scheduled' check (status in ('scheduled', 'aired', 'postponed')),
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists schedule_events_scheduled_at_idx on public.schedule_events (scheduled_at);
create index if not exists schedule_events_movie_idx on public.schedule_events (movie_id);

-- -----------------------------------------------------------------------------
-- posts
-- -----------------------------------------------------------------------------
create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  excerpt text,
  content text not null default '',
  cover_image_url text,
  type text not null default 'movie_intro' check (type in ('weekly_schedule', 'movie_intro', 'announcement')),
  status text not null default 'draft' check (status in ('draft', 'published')),
  week_start date,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists posts_status_idx on public.posts (status);
create index if not exists posts_type_idx on public.posts (type);
create index if not exists posts_published_at_idx on public.posts (published_at desc);
create index if not exists posts_week_start_idx on public.posts (week_start);

-- -----------------------------------------------------------------------------
-- post_movies (many-to-many)
-- -----------------------------------------------------------------------------
create table if not exists public.post_movies (
  post_id uuid not null references public.posts (id) on delete cascade,
  movie_id uuid not null references public.movies (id) on delete cascade,
  primary key (post_id, movie_id)
);

create index if not exists post_movies_movie_idx on public.post_movies (movie_id);

-- -----------------------------------------------------------------------------
-- site_settings: single row table (id = 1).
-- -----------------------------------------------------------------------------
create table if not exists public.site_settings (
  id integer primary key default 1 check (id = 1),
  site_name text not null default 'Ghiền Phim',
  site_description text,
  logo_url text,
  contact_email text,
  contact_note text,
  seo_title text,
  seo_description text,
  og_image_url text,
  featured_movie_id uuid references public.movies (id) on delete set null,
  updated_at timestamptz not null default now()
);

insert into public.site_settings (id, site_name)
values (1, 'Ghiền Phim')
on conflict (id) do nothing;

-- -----------------------------------------------------------------------------
-- updated_at triggers
-- -----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
declare
  t text;
begin
  foreach t in array array[
    'profiles', 'genres', 'movies', 'episodes',
    'video_sources', 'schedule_events', 'posts'
  ]
  loop
    execute format(
      'drop trigger if exists set_updated_at_%1$s on public.%1$s;', t);
    execute format(
      'create trigger set_updated_at_%1$s before update on public.%1$s
       for each row execute function public.set_updated_at();', t);
  end loop;
end;
$$;
