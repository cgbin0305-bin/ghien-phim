-- =============================================================================
-- Ghiền Phim — seed data (CHỈ DÙNG CHO MÔI TRƯỜNG LOCAL)
--
-- ⚠ KHÔNG chạy file này lên production.
--   Nội dung dưới đây là dữ liệu minh hoạ: 8 phim hư cấu, tập tự sinh và
--   video mẫu của Blender Foundation. Chạy lên production sẽ trộn dữ liệu
--   giả vào giữa dữ liệu thật mà bạn tự nhập.
--
--   `supabase/config.toml` đã đặt `[db.seed] enabled = false` để `db reset`
--   không tự nạp file này. Muốn dùng lại ở local:
--     psql "$DATABASE_URL" -f supabase/seed.sql
--
-- Run AFTER migration 001/002/003, either with:
--   psql "$DATABASE_URL" -f supabase/seed.sql   (hosted project — chỉ local!)
--
-- Every movie title below is ORIGINAL FICTIONAL content written for this demo.
-- No real production title is referenced. Poster/backdrop URLs point at the
-- locally generated SVG endpoint (/api/poster/<hue>-<motif>-<slug>), so no third-party
-- artwork is hot-linked.
--
-- Video sources point at Blender Foundation open movies (Creative Commons
-- BY 3.0) purely as legally embeddable placeholder players.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Genres
-- -----------------------------------------------------------------------------
insert into public.genres (name, slug, description, sort_order) values
  ('Cổ trang',    'co-trang',   'Bối cảnh cung đình, gia tộc và võ hiệp.',            1),
  ('Tiên hiệp',  'tien-hiem',  'Tu luyện, linh đồ và thế giới tu tiên.',             2),
  ('Kiếm hiệp',  'kiem-hiep',  'Phiêu lưu võ hiệp và kiếm đạo.',                     3),
  ('Cung đấu',   'cung-dau',   'Tranh đấu quyền lực trong hậu cung.',                 4),
  ('Huyền huyễn','huyen-huyen','Suy luận và kỳ bí.',                                   5),
  ('Tình hoán',  'tinh-hoang', 'Tình cảm và mối duyên.',                               6),
  ('Văn cổ',     'van-co',     'Nội dung văn học cổ điển.',                           7)
on conflict (slug) do update
  set name = excluded.name,
      description = excluded.description,
      sort_order = excluded.sort_order;

-- -----------------------------------------------------------------------------
-- Movies
-- -----------------------------------------------------------------------------
insert into public.movies (
  slug, title, original_title, synopsis, year, country, director, cast,
  poster_url, backdrop_url, trailer_url, status, release_status, total_episodes,
  subtitle_label, is_featured, sort_order, published_at, created_at, updated_at
) values
  (
    'van-kiem-lam-ngo',
    'Vấn Kiếm Lâm Ngô',
    '岚山剑影',
    'Một kiếm khách trẻ rời núi tảng, mang theo thanh kiếm cổ tìm kiếm người thầy đã mất tích. Bên cạnh anh là cô đường hầu thông minh, hiểu đạo tự nhiên và một bí mật cũ về Vân Kiếm Trang.',
    2024, 'Trung Quốc', 'Lâm Nhạc Châu',
    array['Kiều Vân', 'Lạc Thanh', 'Tô Vãn'],
    '/api/poster/205-kiem-van-kiem-lam-ngo',
    '/api/poster/210-ngu-van-kiem-lam-ngo',
    null, 'published', 'airing', 24, 'vietsub', true, 1,
    now(), now() - interval '30 days', now() - interval '12 days'
  ),
  (
    'linh-dong-thien-khu',
    'Linh Đông Thiên Khư',
    '灵动天枢',
    'Trong thế giới tu tiên nơi linh khí là tất cả, một thiếu niên từng làng huyện bất ngờ sở hữu thiên phú thuộc huyền cổ, kéo theo cơn thịnh nộ của các cấm đạo.',
    2025, 'Trung Quốc', 'Trần Thiên Vũ',
    array['Hạ Nhiên', 'Diệp Cầm', 'Lục Nhất Hoài'],
    '/api/poster/160-tien-linh-dong-thien-khu',
    '/api/poster/165-ngu-linh-dong-thien-khu',
    null, 'published', 'airing', 36, 'thuyet_minh', false, 2,
    now(), now() - interval '25 days', now() - interval '8 days'
  ),
  (
    'hoang-hon-coi-tam',
    'Hoang Hồn Cối Tâm',
    '荒魂闕心',
    'Trong cung cấm, một nữ quan bị vu oán phải sống trong sự cô lập để tìm ra kẻ thao túng cả triều đình. Mỗi tập mở ra thêm một tầng bí mật của Vương gia.',
    2023, 'Trung Quốc', 'Vương Nghi Nghi',
    array['Mẫu Nương', 'Lăng Uyển Nhi', 'Tạ Kiều'],
    '/api/poster/350-cung-hoang-hon-coi-tam',
    '/api/poster/345-ngu-hoang-hon-coi-tam',
    null, 'published', 'completed', 40, 'vietsub', false, 3,
    now(), now() - interval '40 days', now() - interval '18 days'
  ),
  (
    'vu-than-pho-thien',
    'Vũ Thần Phá Thiên',
    '武神破天',
    'Một võ sĩ bị phản bội trong lần tranh giành bí bảo, thề báo thù và bước vào con đường tu luyện thị phiền — nơi mỗi tầng thiên địa đều có giá của riêng mình.',
    2022, 'Trung Quốc', 'Hứa Văn Hiên',
    array['Tiêu Viêm', 'Doãn Ương', 'Chu Hàn'],
    '/api/poster/20-vu-vu-than-pho-thien',
    '/api/poster/25-ngu-vu-than-pho-thien',
    null, 'published', 'completed', 50, 'thuyet_minh', false, 4,
    now(), now() - interval '60 days', now() - interval '22 days'
  ),
  (
    'nguyet-lang-truyen',
    'Nguyệt Lang Truyền',
    '月朗传',
    'Câu chuyện về một nữ cung nữ ghi chép lịch sử triều đại và chiếc ngọc bội mà mỗi đời người thừa kế phải trao lại. Bên ngoài là cung đình, bên trong là một cuộc tìm kiếm bản thân.',
    2024, 'Trung Quốc', 'Tô Quyển',
    array['Thẩm Vân', 'Cố Tịnh', 'Lục Việt'],
    '/api/poster/45-nguyet-nguyet-lang-truyen',
    '/api/poster/50-ngu-nguyet-lang-truyen',
    null, 'published', 'airing', 28, 'vietsub', false, 5,
    now(), now() - interval '20 days', now() - interval '5 days'
  ),
  (
    'cua-anh-than-lai',
    'Cửa Ảnh Thần Lai',
    '神来之门',
    'Một học sinh bình thường tình cờ mở được cổng nối sang thế giới tu luyện, nơi mỗi lần vượt qua cổng là một lần đánh đổi. Cô phải chọn giữa cuộc sống bình yên hay con đường tiên hiệp.',
    2025, 'Trung Quốc', 'Kỳ Nhạc',
    array['Từ Niệm', 'Mộ Dung', 'Diệp Vũ'],
    '/api/poster/280-mon-cua-anh-than-lai',
    '/api/poster/285-ngu-cua-anh-than-lai',
    null, 'published', 'upcoming', 30, 'vietsub', false, 6,
    now(), now() - interval '6 days', now() - interval '3 days'
  ),
  (
    'long-hu-dai-quoc',
    'Long Hổ Đại Quốc',
    '龙虎大国',
    'Bản thảo khoa cổ đại mô tả về quốc gia nơi long và hổ cai tranh, được một thầy thuốc trẻ dịch giải và phát hiện ra những bí mật về triều đại.',
    2021, 'Trung Quốc', 'Hàn Chi Dã',
    array['Lục Nhiên', 'Tô Niệm', 'Mạc Vân'],
    '/api/poster/120-van-long-hu-dai-quoc',
    '/api/poster/125-ngu-long-hu-dai-quoc',
    null, 'published', 'completed', 32, 'raw', false, 7,
    now(), now() - interval '70 days', now() - interval '26 days'
  ),
  (
    'tu-than-luu-nhat',
    'Tư Thần Lưu Nhất',
    '思神流一',
    'Một thiếu nữ có thể nghe thấy giọng nói của người đã khuất từ một cõi lưỡi cổ trong truyện. Mỗi lần lắng nghe, cô đánh đổi một phần ký ức.',
    2026, 'Trung Quốc', 'Tô Hàm',
    array['Chu Vân', 'Phương Trình', 'Hà Đức'],
    '/api/poster/240-thien-tu-than-luu-nhat',
    '/api/poster/245-ngu-tu-than-luu-nhat',
    null, 'published', 'upcoming', 20, 'vietsub', false, 8,
    now(), now() - interval '3 days', now() - interval '1 day'
  )
on conflict (slug) do update
  set title = excluded.title,
      original_title = excluded.original_title,
      synopsis = excluded.synopsis,
      year = excluded.year,
      country = excluded.country,
      director = excluded.director,
      cast = excluded.cast,
      poster_url = excluded.poster_url,
      backdrop_url = excluded.backdrop_url,
      status = excluded.status,
      release_status = excluded.release_status,
      total_episodes = excluded.total_episodes,
      subtitle_label = excluded.subtitle_label,
      is_featured = excluded.is_featured,
      sort_order = excluded.sort_order,
      updated_at = now();

-- -----------------------------------------------------------------------------
-- Movie <-> genre links
-- -----------------------------------------------------------------------------
insert into public.movie_genres (movie_id, genre_id)
select m.id, g.id
from public.movies m
join public.genres g on g.slug in (
  case m.slug
    when 'van-kiem-lam-ngo'  then array['co-trang', 'kiem-hiep', 'tinh-hoang']
    when 'linh-dong-thien-khu' then array['tien-hiem', 'kiem-hiep', 'cung-dau']
    when 'hoang-hon-coi-tam'  then array['cung-dau', 'co-trang', 'tinh-hoang']
    when 'vu-than-pho-thien'   then array['kiem-hiep', 'tien-hiem']
    when 'nguyet-lang-truyen' then array['co-trang', 'huyen-huyen', 'van-co']
    when 'cua-anh-than-lai'   then array['tien-hiem', 'huyen-huyen']
    when 'long-hu-dai-quoc'   then array['van-co', 'huyen-huyen']
    when 'tu-than-luu-nhat'   then array['huyen-huyen', 'co-trang']
  end
)
on conflict do nothing;

-- -----------------------------------------------------------------------------
-- Episodes
--
-- Episodes are created for the four movies that have published episodes in the
-- demo. `release_status = 'upcoming'` movies intentionally have no episodes so
-- the "sắp chiếu" state is exercised.
--
-- The slug follows the `tap-<n>` convention used by the demo store.
-- -----------------------------------------------------------------------------
insert into public.episodes (movie_id, episode_number, title, slug, release_date, status, description)
select m.id,
       g.n,
       'Tập ' || g.n,
       'tap-' || g.n,
       (current_date - ((30 - g.n) * 7))::date,
       case when g.n <= g.max then 'published' else 'draft' end,
       null
from public.movies m
cross join lateral (
  values (1, 12), (2, 8), (3, 6), (5, 6)
) as g(n, max)
where m.slug = case g.max
  when 12 then 'van-kiem-lam-ngo'
  when 8  then 'linh-dong-thien-khu'
  when 6  then 'nguyet-lang-truyen'
end
on conflict (movie_id, episode_number) do update
  set title = excluded.title,
      release_date = excluded.release_date,
      status = excluded.status;

-- The "Hoang Hồn Cối Tâm" movie gets its own six completed episodes.
insert into public.episodes (movie_id, episode_number, title, slug, release_date, status, description)
select m.id, g.n, 'Tập ' || g.n, 'tap-' || g.n,
       (current_date - ((40 - g.n) * 7))::date, 'published', null
from public.movies m
cross join lateral (values (1), (2), (3), (4), (5), (6)) as g(n)
where m.slug = 'hoang-hon-coi-tam'
on conflict (movie_id, episode_number) do update
  set title = excluded.title,
      release_date = excluded.release_date,
      status = excluded.status;

-- -----------------------------------------------------------------------------
-- Video sources
--
-- Blender Foundation open movies (CC BY 3.0) as legal placeholder players.
-- Every 4th episode also gets a second, lower-priority source so the
-- source-switching UI is exercised.
--
-- The seed is idempotent: existing demo sources are removed first.
-- -----------------------------------------------------------------------------
delete from public.video_sources
where source_url like 'https://www.youtube.com/watch?v=%';

insert into public.video_sources (episode_id, provider, source_url, label, priority)
select r.episode_id,
       'youtube',
       'https://www.youtube.com/watch?v=' || p.video_id,
       p.label,
       0
from (
  select e.id as episode_id,
         e.episode_number,
         row_number() over (partition by e.id order by e.episode_number) as rn
  from public.episodes e
  join public.movies m on m.id = e.movie_id
  where e.status = 'published'
    and m.slug in ('van-kiem-lam-ngo', 'linh-dong-thien-khu', 'nguyet-lang-truyen', 'hoang-hon-coi-tam')
) r
join (values
  ('aqz-KE-bpKQ', 'Nguồn dự án mở (Blender)'),
  ('eRsGyueVLvQ', 'Nguồn dự án mở (Blender)'),
  ('R6MlUcmOul8', 'Nguồn dự án mở (Blender)'),
  ('Y-rmzh0PI3c', 'Nguồn dự án mở (Blender)'),
  ('Z4C82eyhwgU', 'Nguồn dự án mở (Blender)')
) as p(video_id, label) on p.video_id = case ((r.rn - 1) % 5)
  when 0 then 'aqz-KE-bpKQ'
  when 1 then 'eRsGyueVLvQ'
  when 2 then 'R6MlUcmOul8'
  when 3 then 'Y-rmzh0PI3c'
  else 'Z4C82eyhwgU'
end;

-- Secondary source for every 4th episode.
insert into public.video_sources (episode_id, provider, source_url, label, priority)
select r.episode_id,
       'youtube',
       'https://www.youtube.com/watch?v=' || p.video_id,
       'Nguồn dự phòng (Blender)',
       1
from (
  select e.id as episode_id,
         e.episode_number,
         row_number() over (partition by e.id order by e.episode_number) as rn
  from public.episodes e
  join public.movies m on m.id = e.movie_id
  where e.status = 'published'
    and e.episode_number % 4 = 0
    and m.slug in ('van-kiem-lam-ngo', 'linh-dong-thien-khu', 'nguyet-lang-truyen', 'hoang-hon-coi-tam')
) r
join (values
  ('aqz-KE-bpKQ'), ('eRsGyueVLvQ'), ('R6MlUcmOul8'), ('Y-rmzh0PI3c'), ('Z4C82eyhwgU')
) as p(video_id) on p.video_id = case (r.rn % 5)
  when 0 then 'aqz-KE-bpKQ'
  when 1 then 'eRsGyueVLvQ'
  when 2 then 'R6MlUcmOul8'
  when 3 then 'Y-rmzh0PI3c'
  else 'Z4C82eyhwgU'
end;

-- -----------------------------------------------------------------------------
-- Schedule events
--
-- Two events per day across the current week, in Asia/Ho_Chi_Minh wall time.
-- `scheduled_at` is `timestamptz`; the wall-clock time is converted with
-- `at time zone 'Asia/Ho_Chi_Minh'` so the stored instant matches the
-- Vietnamese evening slot the visitor sees.
--
-- The seed is idempotent: demo events are removed first.
-- -----------------------------------------------------------------------------
delete from public.schedule_events
where note like 'Phát sóng đúng giờ trên Ghiền Phim.%'
   or note is null;

insert into public.schedule_events (movie_id, episode_id, episode_number, scheduled_at, status, note)
select m.id,
       e.id,
       12 + slot.day,
       (date_trunc('week', now() at time zone 'Asia/Ho_Chi_Minh')::date
         + (slot.day || ' days')::interval
         + ((19 + ((slot.day + slot.idx) % 4)) || ' hours')::interval
         + (case when slot.idx % 2 = 0 then '0 minutes' else '30 minutes' end)::interval
       ) at time zone 'Asia/Ho_Chi_Minh',
       case
         when ((date_trunc('week', now() at time zone 'Asia/Ho_Chi_Minh')::date
                + (slot.day || ' days')::interval
                + ((19 + ((slot.day + slot.idx) % 4)) || ' hours')::interval
                + (case when slot.idx % 2 = 0 then '0 minutes' else '30 minutes' end)::interval
               ) at time zone 'Asia/Ho_Chi_Minh') < now()
         then 'aired' else 'scheduled'
       end,
       case when slot.idx = 0 then 'Phát sóng đúng giờ trên Ghiền Phim.' else null end
from (values (0), (1), (2), (3), (4), (5), (6)) as slot(day)
cross join (values (0), (1)) as sub(idx)
cross join lateral (
  select gm.id
  from public.movies gm
  where gm.slug in (
    'van-kiem-lam-ngo', 'linh-dong-thien-khu', 'nguyet-lang-truyen',
    'hoang-hon-coi-tam', 'vu-than-pho-thien', 'long-hu-dai-quoc',
    'cua-anh-than-lai', 'tu-than-luu-nhat'
  )
  order by gm.sort_order
  offset ((slot.day * 2 + sub.idx) % 8)
  limit 1
) as m
left join lateral (
  select ep.id
  from public.episodes ep
  where ep.movie_id = m.id and ep.episode_number = 12 + slot.day
  limit 1
) as e on true;

-- -----------------------------------------------------------------------------
-- Posts
-- -----------------------------------------------------------------------------
insert into public.posts (slug, title, excerpt, content, cover_image_url, type, status, week_start, published_at)
values
  (
    'lich-chieu-tuan-demo',
    'Lịch chiếu tuần — bản demo',
    'Bản lịch chiếu mẫu của Ghiền Phim, áp dụng cho tuần hiện tại. Nội dung này thuộc dữ liệu demo.',
    E'## Lịch chiếu trong tuần\n\nĐây là **bài viết mẫu** dùng để minh hoạ chức năng bài viết lịch chiếu. Mỗi ngày trong tuần sẽ có các tập phim cổ trang được lên sóng vào buổi tối.\n\n### Ghi chú\n\n- Toàn bộ tên phim trong dữ liệu demo là hư cấu.\n- Nguồn video mẫu là phim mở của Blender Foundation (CC BY 3.0), dùng làm trình phát hợp pháp.\n\n> Lịch chiếu thực tế sẽ được cập nhật khi quản trị viên đăng bài hằng tuần.',
    '/api/poster/195-ngu-lich-chieu-tuan',
    'weekly_schedule', 'published',
    (date_trunc('week', now() at time zone 'Asia/Ho_Chi_Minh')::date)::date,
    now()
  ),
  (
    'gioi-thieu-van-kiem-lam-ngo',
    'Giới thiệu: Vấn Kiếm Lâm Ngô',
    'Nhìn lại cốt truyện, dàn nhân và bối cảnh võ hiệp của bộ phim cổ trang tiêu biểu của Ghiền Phim.',
    E'## Về bộ phim\n\n*Vấn Kiếm Lâm Ngô* là một bộ phim cổ trang hư cấu được tạo ra cho dữ liệu demo của Ghiền Phim.\n\n### Bối cảnh\n\nBối cảnh dựng trong không gian sơn hải phong sương, với những ngọn núi xa chìm trong sương mù và ánh trăng thu xanh.\n\n### Dàn nhân\n\n- **Kiều Vân** — kiếm khách trẻ, lạnh lùng nhưng trung thành.\n- **Lạc Thanh** — đường hầu xuất sắc, hiểu đạo tự nhiên.\n- **Tô Vãn** — bí ẩn, luôn che giấu một bí mật cũ.\n\n### Về thể loại\n\nBộ phim kết hợp **cổ trang**, **kiếm hiệp** và **tình hoán**, với tông màu xanh mực và điểm nhấn vàng champagne quen thuộc của Ghiền Phim.',
    '/api/poster/205-kiem-van-kiem-lam-ngo',
    'movie_intro', 'published', null, now() - interval '7 days'
  ),
  (
    'thong-bao-ra-mat-gheien-phim',
    'Thông báo: Ghiền Phim chính thức ra mắt',
    'Giới thiệu về dự án Ghiền Phim — nơi tập hợp phim cổ trang, tiên hiệp và kiếm hiệp với phụ đề tiếng Việt.',
    E'## Chào mừng đến với Ghiền Phim\n\nGhiền Phim là nơi dành cho những người yêu thích phim cổ trang Trung Hoa: **cổ trang**, **tiên hiệp**, **kiếm hiệp**, **cung đấu** và **huyền huyễn**.\n\n### Cam kết của chúng tôi\n\n1. Không tải về, không proxy và không scrape video.\n2. Chỉ dùng cơ chế nhúng chính thức của YouTube và Facebook.\n3. Chỉ chia sẻ nội dung mà chủ website có quyền sử dụng.',
    '/api/poster/190-ngu-thong-bao',
    'announcement', 'published', null, now() - interval '14 days'
  )
on conflict (slug) do update
  set title = excluded.title,
      excerpt = excluded.excerpt,
      content = excluded.content,
      cover_image_url = excluded.cover_image_url,
      type = excluded.type,
      status = excluded.status,
      week_start = excluded.week_start,
      updated_at = now();

-- Link the weekly schedule post and the intro post to their movies.
insert into public.post_movies (post_id, movie_id)
select p.id, m.id
from public.posts p
cross join public.movies m
where (p.slug = 'lich-chieu-tuan-demo' and m.slug in ('van-kiem-lam-ngo', 'nguyet-lang-truyen'))
   or (p.slug = 'gioi-thieu-van-kiem-lam-ngo' and m.slug = 'van-kiem-lam-ngo')
on conflict do nothing;

-- -----------------------------------------------------------------------------
-- Site settings
-- -----------------------------------------------------------------------------
update public.site_settings
set site_name = 'Ghiền Phim',
    site_description = 'Xem phim cổ trang, tiên hiệp, kiếm hiệp và cung đấu Trung Hoại với phụ đề tiếng Việt. Lịch chiếu hằng tuần cập nhật liên tục.',
    contact_note = 'Dữ liệu trên website đang ở chế độ demo. Vui lòng cập nhật thông tin liên hệ trong trang Cài đặt.',
    seo_title = 'Ghiền Phim — Phim cổ trang Trung Hoại phụ đề tiếng Việt',
    seo_description = 'Ghiền Phim — cập nhật phim cổ trang, tiên hiệp, kiếm hiệp, cung đấu và huyền huyễn Trung Hoại kèm phụ đề tiếng Việt.',
    featured_movie_id = (select id from public.movies where slug = 'van-kiem-lam-ngo'),
    updated_at = now()
where id = 1;
