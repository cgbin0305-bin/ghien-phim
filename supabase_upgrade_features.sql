-- ============================================================================
-- GHIỀN PHIM — BẢN NÂNG CẤP TÍNH NĂNG CỘNG ĐỒNG & TIỆN ÍCH XEM PHIM (NHÓM 1 & 3)
-- Chạy an toàn (Idempotent): Có thể copy & dán vào Supabase SQL Editor bất kỳ lúc nào.
-- ============================================================================

-- 1. Bổ sung cột lượt xem (`views`) và cảm xúc (`reactions`) vào bảng `movies`
ALTER TABLE public.movies
  ADD COLUMN IF NOT EXISTS views bigint NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS reactions jsonb NOT NULL DEFAULT '{"tuyet_pham": 0, "dao_huu": 0, "hong_tap": 0, "cam_dong": 0}'::jsonb;

-- 2. Tạo bảng lưu báo cáo lỗi tập phim / link hỏng (`broken_reports`)
CREATE TABLE IF NOT EXISTS public.broken_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  movie_id uuid REFERENCES public.movies(id) ON DELETE CASCADE,
  episode_id uuid REFERENCES public.episodes(id) ON DELETE CASCADE,
  movie_slug text NOT NULL,
  movie_title text NOT NULL,
  episode_slug text NOT NULL,
  episode_title text NOT NULL,
  server_label text,
  note text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'resolved')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS broken_reports_status_idx ON public.broken_reports(status, created_at DESC);

-- 3. Bật RLS và cấp quyền an toàn cho bảng `broken_reports`
ALTER TABLE public.broken_reports ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'broken_reports' AND policyname = 'Cho phép khách gửi báo lỗi tập phim'
  ) THEN
    CREATE POLICY "Cho phép khách gửi báo lỗi tập phim"
      ON public.broken_reports
      FOR INSERT
      TO anon, authenticated
      WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'broken_reports' AND policyname = 'Cho phép đọc và xử lý báo lỗi'
  ) THEN
    CREATE POLICY "Cho phép đọc và xử lý báo lỗi"
      ON public.broken_reports
      FOR ALL
      TO anon, authenticated
      USING (true)
      WITH CHECK (true);
  END IF;
END
$$;

-- 4. Hàm RPC tăng lượt xem an toàn (không cần quyền UPDATE toàn bảng movies cho anon)
CREATE OR REPLACE FUNCTION public.increment_movie_view(target_movie_id uuid)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_views bigint;
BEGIN
  UPDATE public.movies
  SET views = COALESCE(views, 0) + 1
  WHERE id = target_movie_id
  RETURNING views INTO new_views;

  RETURN COALESCE(new_views, 0);
END;
$$;

-- 5. Hàm RPC tăng cảm xúc cổ phong an toàn (0ms Optimistic UI sync)
CREATE OR REPLACE FUNCTION public.increment_movie_reaction(target_movie_id uuid, reaction_key text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_reactions jsonb;
  current_val bigint;
  updated_reactions jsonb;
BEGIN
  IF reaction_key NOT IN ('tuyet_pham', 'dao_huu', 'hong_tap', 'cam_dong') THEN
    RAISE EXCEPTION 'Loại cảm xúc không hợp lệ';
  END IF;

  SELECT COALESCE(reactions, '{"tuyet_pham": 0, "dao_huu": 0, "hong_tap": 0, "cam_dong": 0}'::jsonb)
  INTO current_reactions
  FROM public.movies
  WHERE id = target_movie_id;

  current_val := COALESCE((current_reactions ->> reaction_key)::bigint, 0) + 1;
  updated_reactions := jsonb_set(current_reactions, ARRAY[reaction_key], to_jsonb(current_val), true);

  UPDATE public.movies
  SET reactions = updated_reactions
  WHERE id = target_movie_id;

  RETURN updated_reactions;
END;
$$;

GRANT EXECUTE ON FUNCTION public.increment_movie_view(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.increment_movie_reaction(uuid, text) TO anon, authenticated;
