-- =============================================================================
-- Ghiền Phim — migration 004
-- Composite indexes for scalable O(log N) queries as catalog & traffic grow.
-- =============================================================================

create index if not exists movies_status_updated_idx
  on public.movies (status, updated_at desc);

create index if not exists movies_status_created_idx
  on public.movies (status, created_at desc);

create index if not exists movies_status_sort_idx
  on public.movies (status, sort_order asc);

create index if not exists episodes_movie_status_num_idx
  on public.episodes (movie_id, status, episode_number asc);

create index if not exists video_sources_episode_priority_idx
  on public.video_sources (episode_id, priority asc);

create index if not exists schedule_events_status_time_idx
  on public.schedule_events (status, scheduled_at asc);

create index if not exists posts_status_published_idx
  on public.posts (status, published_at desc);
