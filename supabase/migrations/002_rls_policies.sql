-- =============================================================================
-- Ghiền Phim — migration 002
-- Row Level Security + Storage policies.
--
-- Model:
--   anon  -> may SELECT only published content (movies, episodes, sources,
--             schedule, posts) plus the read-only lookup tables.
--   authed with role='admin' in public.profiles -> full CRUD.
--   Users can NEVER grant themselves a role: the profiles table has no INSERT
--   policy for regular users and `role` is not writable by them.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Helper: is the current request made by a signed-in admin?
-- -----------------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

-- -----------------------------------------------------------------------------
-- profiles
-- -----------------------------------------------------------------------------
alter table public.profiles enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select to authenticated
  using (id = auth.uid() or public.is_admin());

drop policy if exists "profiles_admin_write" on public.profiles;
create policy "profiles_admin_write" on public.profiles
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- No INSERT policy for regular users: a new admin profile must be created by
-- the bootstrap script using the service role key.
-- No UPDATE policy for regular users either, so `role` cannot be self-assigned.

-- -----------------------------------------------------------------------------
-- genres (read-only for everyone, admin may write)
-- -----------------------------------------------------------------------------
alter table public.genres enable row level security;

drop policy if exists "genres_public_read" on public.genres;
create policy "genres_public_read" on public.genres
  for select to anon, authenticated
  using (true);

drop policy if exists "genres_admin_write" on public.genres;
create policy "genres_admin_write" on public.genres
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- -----------------------------------------------------------------------------
-- movies
-- -----------------------------------------------------------------------------
alter table public.movies enable row level security;

drop policy if exists "movies_public_read" on public.movies;
create policy "movies_public_read" on public.movies
  for select to anon, authenticated
  using (status = 'published');

drop policy if exists "movies_admin_read" on public.movies;
create policy "movies_admin_read" on public.movies
  for select to authenticated
  using (public.is_admin());

drop policy if exists "movies_admin_insert" on public.movies;
create policy "movies_admin_insert" on public.movies
  for insert to authenticated
  with check (public.is_admin());

drop policy if exists "movies_admin_update" on public.movies;
create policy "movies_admin_update" on public.movies
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "movies_admin_delete" on public.movies;
create policy "movies_admin_delete" on public.movies
  for delete to authenticated
  using (public.is_admin());

-- -----------------------------------------------------------------------------
-- movie_genres: readable only when the movie is published.
-- -----------------------------------------------------------------------------
alter table public.movie_genres enable row level security;

drop policy if exists "movie_genres_public_read" on public.movie_genres;
create policy "movie_genres_public_read" on public.movie_genres
  for select to anon, authenticated
  using (
    exists (
      select 1 from public.movies m
      where m.id = movie_genres.movie_id and m.status = 'published'
    )
  );

drop policy if exists "movie_genres_admin_read" on public.movie_genres;
create policy "movie_genres_admin_read" on public.movie_genres
  for select to authenticated
  using (public.is_admin());

drop policy if exists "movie_genres_admin_write" on public.movie_genres;
create policy "movie_genres_admin_write" on public.movie_genres
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- -----------------------------------------------------------------------------
-- episodes: public only when the episode AND its parent movie are published.
-- -----------------------------------------------------------------------------
alter table public.episodes enable row level security;

drop policy if exists "episodes_public_read" on public.episodes;
create policy "episodes_public_read" on public.episodes
  for select to anon, authenticated
  using (
    status = 'published'
    and exists (
      select 1 from public.movies m
      where m.id = episodes.movie_id and m.status = 'published'
    )
  );

drop policy if exists "episodes_admin_read" on public.episodes;
create policy "episodes_admin_read" on public.episodes
  for select to authenticated
  using (public.is_admin());

drop policy if exists "episodes_admin_insert" on public.episodes;
create policy "episodes_admin_insert" on public.episodes
  for insert to authenticated
  with check (public.is_admin());

drop policy if exists "episodes_admin_update" on public.episodes;
create policy "episodes_admin_update" on public.episodes
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "episodes_admin_delete" on public.episodes;
create policy "episodes_admin_delete" on public.episodes
  for delete to authenticated
  using (public.is_admin());

-- -----------------------------------------------------------------------------
-- video_sources: public only when the episode and its movie are published.
-- -----------------------------------------------------------------------------
alter table public.video_sources enable row level security;

drop policy if exists "video_sources_public_read" on public.video_sources;
create policy "video_sources_public_read" on public.video_sources
  for select to anon, authenticated
  using (
    exists (
      select 1
      from public.episodes e
      join public.movies m on m.id = e.movie_id
      where e.id = video_sources.episode_id
        and e.status = 'published'
        and m.status = 'published'
    )
  );

drop policy if exists "video_sources_admin_read" on public.video_sources;
create policy "video_sources_admin_read" on public.video_sources
  for select to authenticated
  using (public.is_admin());

drop policy if exists "video_sources_admin_insert" on public.video_sources;
create policy "video_sources_admin_insert" on public.video_sources
  for insert to authenticated
  with check (public.is_admin());

drop policy if exists "video_sources_admin_update" on public.video_sources;
create policy "video_sources_admin_update" on public.video_sources
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "video_sources_admin_delete" on public.video_sources;
create policy "video_sources_admin_delete" on public.video_sources
  for delete to authenticated
  using (public.is_admin());

-- -----------------------------------------------------------------------------
-- schedule_events: public when the movie is published.
-- -----------------------------------------------------------------------------
alter table public.schedule_events enable row level security;

drop policy if exists "schedule_events_public_read" on public.schedule_events;
create policy "schedule_events_public_read" on public.schedule_events
  for select to anon, authenticated
  using (
    exists (
      select 1 from public.movies m
      where m.id = schedule_events.movie_id and m.status = 'published'
    )
  );

drop policy if exists "schedule_events_admin_read" on public.schedule_events;
create policy "schedule_events_admin_read" on public.schedule_events
  for select to authenticated
  using (public.is_admin());

drop policy if exists "schedule_events_admin_insert" on public.schedule_events;
create policy "schedule_events_admin_insert" on public.schedule_events
  for insert to authenticated
  with check (public.is_admin());

drop policy if exists "schedule_events_admin_update" on public.schedule_events;
create policy "schedule_events_admin_update" on public.schedule_events
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "schedule_events_admin_delete" on public.schedule_events;
create policy "schedule_events_admin_delete" on public.schedule_events
  for delete to authenticated
  using (public.is_admin());

-- -----------------------------------------------------------------------------
-- posts
-- -----------------------------------------------------------------------------
alter table public.posts enable row level security;

drop policy if exists "posts_public_read" on public.posts;
create policy "posts_public_read" on public.posts
  for select to anon, authenticated
  using (status = 'published');

drop policy if exists "posts_admin_read" on public.posts;
create policy "posts_admin_read" on public.posts
  for select to authenticated
  using (public.is_admin());

drop policy if exists "posts_admin_insert" on public.posts;
create policy "posts_admin_insert" on public.posts
  for insert to authenticated
  with check (public.is_admin());

drop policy if exists "posts_admin_update" on public.posts;
create policy "posts_admin_update" on public.posts
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "posts_admin_delete" on public.posts;
create policy "posts_admin_delete" on public.posts
  for delete to authenticated
  using (public.is_admin());

-- -----------------------------------------------------------------------------
-- post_movies: readable only when the post is published.
-- -----------------------------------------------------------------------------
alter table public.post_movies enable row level security;

drop policy if exists "post_movies_public_read" on public.post_movies;
create policy "post_movies_public_read" on public.post_movies
  for select to anon, authenticated
  using (
    exists (
      select 1 from public.posts p
      where p.id = post_movies.post_id and p.status = 'published'
    )
  );

drop policy if exists "post_movies_admin_read" on public.post_movies;
create policy "post_movies_admin_read" on public.post_movies
  for select to authenticated
  using (public.is_admin());

drop policy if exists "post_movies_admin_write" on public.post_movies;
create policy "post_movies_admin_write" on public.post_movies
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- -----------------------------------------------------------------------------
-- site_settings: public read (needed for the site name/logo), admin write.
-- -----------------------------------------------------------------------------
alter table public.site_settings enable row level security;

drop policy if exists "site_settings_public_read" on public.site_settings;
create policy "site_settings_public_read" on public.site_settings
  for select to anon, authenticated
  using (true);

drop policy if exists "site_settings_admin_write" on public.site_settings;
create policy "site_settings_admin_write" on public.site_settings
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());
