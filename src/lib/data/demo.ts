/**
 * Demo data for "Ghiền Phim".
 *
 * Every movie is an ORIGINAL fictional title written for this demo. No real
 * production title is referenced, and the posters are locally generated SVG
 * placeholders, so nothing here points at copyrighted artwork.
 *
 * The video sources point at Blender Foundation open movies (Creative Commons
 * BY 3.0) purely as legal placeholder players. They are clearly labelled as
 * demo material in the admin UI.
 */

import type {
  Episode,
  Genre,
  Movie,
  Post,
  ScheduleEvent,
  SiteSettings,
  VideoSource,
} from "@/lib/types";

export const DEMO_GENRES: Genre[] = [
  { id: "g-cổ-trang", name: "Cổ trang", slug: "co-trang", description: "Bối cảnh cung đình, gia tộc và võ hiệp.", sortOrder: 1 },
  { id: "g-tien-hiem", name: "Tiên hiệm", slug: "tien-hiem", description: "Tu luyện, linh đồ và thế giới tu tiên.", sortOrder: 2 },
  { id: "g-kiem-hiep", name: "Kiếm hiệp", slug: "kiem-hiep", description: "Phiêu lưu võ hiệp và kiếm đạo.", sortOrder: 3 },
  { id: "g-cung-dau", name: "Cung đấu", slug: "cung-dau", description: "Tranh đấu quyền lực trong hậu cung.", sortOrder: 4 },
  { id: "g-huyen-huyen", name: "Huyền huyễn", slug: "huyen-huyen", description: "Suy luận và kỳ bí.", sortOrder: 5 },
  { id: "g-tinh-huong", name: "Tình hoán", slug: "tinh-hoang", description: "Tình cảm và mối duyên.", sortOrder: 6 },
  { id: "g-van-co", name: "Văn cổ", slug: "van-co", description: "Nội dung văn học cổ điển.", sortOrder: 7 },
];

const poster = (slug: string, hue: number, motif: string) =>
  `/api/poster/${hue}-${motif}-${slug}`;

export const DEMO_MOVIES: Movie[] = [
  {
    id: "m-1",
    slug: "van-kiem-lam-ngo",
    title: "Vấn Kiếm Lâm Ngô",
    originalTitle: "岚山剑影",
    synopsis:
      "Một kiếm khách trẻ rời núi tảng, mang theo thanh kiếm cổ tìm kiếm người thầy đã mất tích. Bên cạnh anh là cô đường hầu thông minh, hiểu đạo tự nhiên và một bí mật cũ về Vân Kiếm Trang.",
    year: 2024,
    country: "Trung Quốc",
    director: "Lâm Nhạc Châu",
    cast: ["Kiều Vân", "Lạc Thanh", "Tô Vãn"],
    posterUrl: poster("van-kiem-lam-ngo", 205, "kiem"),
    backdropUrl: poster("van-kiem-lam-ngo", 210, "ngu"),
    trailerUrl: null,
    status: "published",
    releaseStatus: "airing",
    totalEpisodes: 24,
    subtitleLabel: "vietsub",
    isFeatured: true,
    sortOrder: 1,
    publishedAt: "2026-09-01T04:00:00.000Z",
    createdAt: "2026-08-20T04:00:00.000Z",
    updatedAt: "2026-11-01T04:00:00.000Z",
    genres: [DEMO_GENRES[0]!, DEMO_GENRES[2]!, DEMO_GENRES[5]!],
  },
  {
    id: "m-2",
    slug: "linh-dong-thien-khu",
    title: "Linh Đông Thiên Khư",
    originalTitle: "灵动天枢",
    synopsis:
      "Trong thế giới tu tiên nơi linh khí là tất cả, một thiếu niên từng làng huyện bất ngờ sở hữu thiên phú thuộc huyền cổ, kéo theo cơn thịnh nộ của các cấm đạo.",
    year: 2025,
    country: "Trung Quốc",
    director: "Trần Thiên Vũ",
    cast: ["Hạ Nhiên", "Diệp Cầm", "Lục Nhất Hoài"],
    posterUrl: poster("linh-dong-thien-khu", 160, "tien"),
    backdropUrl: poster("linh-dong-thien-khu", 165, "ngu"),
    trailerUrl: null,
    status: "published",
    releaseStatus: "airing",
    totalEpisodes: 36,
    subtitleLabel: "thuyet_minh",
    isFeatured: false,
    sortOrder: 2,
    publishedAt: "2026-09-15T04:00:00.000Z",
    createdAt: "2026-09-01T04:00:00.000Z",
    updatedAt: "2026-11-05T04:00:00.000Z",
    genres: [DEMO_GENRES[1]!, DEMO_GENRES[2]!, DEMO_GENRES[3]!],
  },
  {
    id: "m-3",
    slug: "hoang-hon-coi-tam",
    title: "Hoang Hồn Cối Tâm",
    originalTitle: "荒魂闕心",
    synopsis:
      "Trong cung cấm, một nữ quan bị vu oán phải sống trong sự cô lập để tìm ra kẻ thao túng cả triều đình. Mỗi tập mở ra thêm một tầng bí mật của Vương gia.",
    year: 2023,
    country: "Trung Quốc",
    director: "Vương Nghi Nghi",
    cast: ["Mẫu Nương", "Lăng Uyển Nhi", "Tạ Kiều"],
    posterUrl: poster("hoang-hon-coi-tam", 350, "cung"),
    backdropUrl: poster("hoang-hon-coi-tam", 345, "ngu"),
    trailerUrl: null,
    status: "published",
    releaseStatus: "completed",
    totalEpisodes: 40,
    subtitleLabel: "vietsub",
    isFeatured: false,
    sortOrder: 3,
    publishedAt: "2026-07-10T04:00:00.000Z",
    createdAt: "2026-07-01T04:00:00.000Z",
    updatedAt: "2026-10-10T04:00:00.000Z",
    genres: [DEMO_GENRES[3]!, DEMO_GENRES[0]!, DEMO_GENRES[5]!],
  },
  {
    id: "m-4",
    slug: "vu-than-pho-thien",
    title: "Vũ Thần Phá Thiên",
    originalTitle: "武神破天",
    synopsis:
      "Một võ sĩ bị phản bội trong lần tranh giành bí bảo, thề báo thù và bước vào con đường tu luyện thị phiền — nơi mỗi tầng thiên địa đều có giá của riêng mình.",
    year: 2022,
    country: "Trung Quốc",
    director: "Hứa Văn Hiên",
    cast: ["Tiêu Viêm", "Doãn Ương", "Chu Hàn"],
    posterUrl: poster("vu-than-pho-thien", 20, "vu"),
    backdropUrl: poster("vu-than-pho-thien", 25, "ngu"),
    trailerUrl: null,
    status: "published",
    releaseStatus: "completed",
    totalEpisodes: 50,
    subtitleLabel: "thuyet_minh",
    isFeatured: false,
    sortOrder: 4,
    publishedAt: "2026-06-01T04:00:00.000Z",
    createdAt: "2026-05-20T04:00:00.000Z",
    updatedAt: "2026-09-20T04:00:00.000Z",
    genres: [DEMO_GENRES[2]!, DEMO_GENRES[1]!],
  },
  {
    id: "m-5",
    slug: "nguyet-lang-truyen",
    title: "Nguyệt Lang Truyền",
    originalTitle: "月朗传",
    synopsis:
      "Câu chuyện về một nữ cung nữ ghi chép lịch sử triều đại và chiếc ngọc bội mà mỗi đời người thừa kế phải trao lại. Bên ngoài là cung đình, bên trong là một cuộc tìm kiếm bản thân.",
    year: 2024,
    country: "Trung Quốc",
    director: "Tô Quyển",
    cast: ["Thẩm Vân", "Cố Tịnh", "Lục Việt"],
    posterUrl: poster("nguyet-lang-truyen", 45, "nguyet"),
    backdropUrl: poster("nguyet-lang-truyen", 50, "ngu"),
    trailerUrl: null,
    status: "published",
    releaseStatus: "airing",
    totalEpisodes: 28,
    subtitleLabel: "vietsub",
    isFeatured: false,
    sortOrder: 5,
    publishedAt: "2026-10-01T04:00:00.000Z",
    createdAt: "2026-09-20T04:00:00.000Z",
    updatedAt: "2026-11-08T04:00:00.000Z",
    genres: [DEMO_GENRES[0]!, DEMO_GENRES[4]!, DEMO_GENRES[6]!],
  },
  {
    id: "m-6",
    slug: "cua-anh-than-lai",
    title: "Cửa Ảnh Thần Lai",
    originalTitle: "神来之门",
    synopsis:
      "Một học sinh bình thường tình cờ mở được cổng nối sang thế giới tu luyện, nơi mỗi lần vượt qua cổng là một lần đánh đổi. Cô phải chọn giữa cuộc sống bình yên hay con đường tiên hiệp.",
    year: 2025,
    country: "Trung Quốc",
    director: "Kỳ Nhạc",
    cast: ["Từ Niệm", "Mộ Dung", "Diệp Vũ"],
    posterUrl: poster("cua-anh-than-lai", 280, "mon"),
    backdropUrl: poster("cua-anh-than-lai", 285, "ngu"),
    trailerUrl: null,
    status: "published",
    releaseStatus: "upcoming",
    totalEpisodes: 30,
    subtitleLabel: "vietsub",
    isFeatured: false,
    sortOrder: 6,
    publishedAt: "2026-11-01T04:00:00.000Z",
    createdAt: "2026-10-18T04:00:00.000Z",
    updatedAt: "2026-11-10T04:00:00.000Z",
    genres: [DEMO_GENRES[1]!, DEMO_GENRES[4]!],
  },
  {
    id: "m-7",
    slug: "long-hu-dai-quoc",
    title: "Long Hổ Đại Quốc",
    originalTitle: "龙虎大国",
    synopsis:
      "Bản thảo khoa cổ đại mô tả về quốc gia nơi long và hổ cai tranh, được một thầy thuốc trẻ dịch giải và phát hiện ra những bí mật về triều đại.",
    year: 2021,
    country: "Trung Quốc",
    director: "Hàn Chi Dã",
    cast: ["Lục Nhiên", "Tô Niệm", "Mạc Vân"],
    posterUrl: poster("long-hu-dai-quoc", 120, "van"),
    backdropUrl: poster("long-hu-dai-quoc", 125, "ngu"),
    trailerUrl: null,
    status: "published",
    releaseStatus: "completed",
    totalEpisodes: 32,
    subtitleLabel: "raw",
    isFeatured: false,
    sortOrder: 7,
    publishedAt: "2026-05-05T04:00:00.000Z",
    createdAt: "2026-04-25T04:00:00.000Z",
    updatedAt: "2026-08-15T04:00:00.000Z",
    genres: [DEMO_GENRES[6]!, DEMO_GENRES[4]!],
  },
  {
    id: "m-8",
    slug: "tu-than-luu-nhat",
    title: "Tư Thần Lưu Nhất",
    originalTitle: "思神流一",
    synopsis:
      "Một thiếu nữ có thể nghe thấy giọng nói của người đã khuất từ một cõi lưỡi cổ trong truyện. Mỗi lần lắng nghe, cô đánh đổi một phần ký ức.",
    year: 2026,
    country: "Trung Quốc",
    director: "Tô Hàm",
    cast: ["Chu Vân", "Phương Trình", "Hà Đức"],
    posterUrl: poster("tu-than-luu-nhat", 240, "thien"),
    backdropUrl: poster("tu-than-luu-nhat", 245, "ngu"),
    trailerUrl: null,
    status: "published",
    releaseStatus: "upcoming",
    totalEpisodes: 20,
    subtitleLabel: "vietsub",
    isFeatured: false,
    sortOrder: 8,
    publishedAt: "2026-11-08T04:00:00.000Z",
    createdAt: "2026-11-05T04:00:00.000Z",
    updatedAt: "2026-11-12T04:00:00.000Z",
    genres: [DEMO_GENRES[4]!, DEMO_GENRES[0]!],
  },
];

interface DemoSourceSpec {
  youtubeId: string;
  label: string;
  priority: number;
}

/** Legal placeholder players: Blender Foundation open movies (CC BY 3.0). */
const DEMO_SOURCE_POOL: DemoSourceSpec[] = [
  { youtubeId: "aqz-KE-bpKQ", label: "Nguồn dự án mở (Blender)", priority: 0 },
  { youtubeId: "eRsGyueVLvQ", label: "Nguồn dự án mở (Blender)", priority: 1 },
  { youtubeId: "R6MlUcmOul8", label: "Nguồn dự án mở (Blender)", priority: 2 },
  { youtubeId: "Y-rmzh0PI3c", label: "Nguồn dự án mở (Blender)", priority: 3 },
  { youtubeId: "Z4C82eyhwgU", label: "Nguồn dự án mở (Blender)", priority: 4 },
];

export const DEMO_EPISODES: Episode[] = [];
export const DEMO_VIDEO_SOURCES: VideoSource[] = [];

/** Builds a deterministic episode + source list for a movie. */
function buildEpisodes(movie: Movie, count: number, startDay: number) {
  for (let i = 1; i <= count; i += 1) {
    const episodeId = `${movie.id}-ep-${i}`;
    const source = DEMO_SOURCE_POOL[(i - 1) % DEMO_SOURCE_POOL.length]!;
    const releaseDate = new Date(Date.UTC(2026, 8, startDay + (i - 1) * 7));
    const isPublished = movie.status === "published" && i <= Math.min(count, movie.releaseStatus === "upcoming" ? 0 : count);

    DEMO_EPISODES.push({
      id: episodeId,
      movieId: movie.id,
      episodeNumber: i,
      title: `Tập ${i}`,
      slug: `tap-${i}`,
      releaseDate: releaseDate.toISOString().slice(0, 10),
      status: isPublished ? "published" : "draft",
      description: null,
      createdAt: releaseDate.toISOString(),
      updatedAt: releaseDate.toISOString(),
      sources: [],
    });

    if (isPublished) {
      const videoSource: VideoSource = {
        id: `${episodeId}-src-1`,
        episodeId,
        provider: "youtube",
        sourceUrl: `https://www.youtube.com/watch?v=${source.youtubeId}`,
        label: source.label,
        priority: 0,
        createdAt: releaseDate.toISOString(),
      };
      DEMO_VIDEO_SOURCES.push(videoSource);

      // A second, lower-priority source for a subset of episodes so the
      // source-switching UI is exercised.
      if (i % 4 === 0) {
        const alt = DEMO_SOURCE_POOL[(i + 1) % DEMO_SOURCE_POOL.length]!;
        DEMO_VIDEO_SOURCES.push({
          id: `${episodeId}-src-2`,
          episodeId,
          provider: "youtube",
          sourceUrl: `https://www.youtube.com/watch?v=${alt.youtubeId}`,
          label: "Nguồn dự phòng (Blender)",
          priority: 1,
          createdAt: releaseDate.toISOString(),
        });
      }
    }
  }
}

buildEpisodes(DEMO_MOVIES[0]!, 12, 1);
buildEpisodes(DEMO_MOVIES[1]!, 8, 5);
buildEpisodes(DEMO_MOVIES[2]!, 6, 8);
buildEpisodes(DEMO_MOVIES[4]!, 6, 3);

// Attach sources to their episodes.
for (const episode of DEMO_EPISODES) {
  episode.sources = DEMO_VIDEO_SOURCES.filter((s) => s.episodeId === episode.id);
}

/**
 * Schedule events are generated for the seven days of the week that CONTAINS
 * "today" - starting from that week's Monday, not from today itself. The
 * weekly grid on /lich-chieu shows Monday..Sunday, so generating from today
 * would leave the earlier days of the visible week empty.
 */
export function buildDemoSchedule(now = new Date()): ScheduleEvent[] {
  const events: ScheduleEvent[] = [];
  const airing = DEMO_MOVIES.filter((m) => m.status === "published");

  // The local (Asia/Ho_Chi_Minh) calendar day of `now`.
  const todayParts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const part = (type: string) => todayParts.find((p) => p.type === type)!.value;
  const y = Number(part("year"));
  const mo = Number(part("month"));
  const d = Number(part("day"));
  const todayUtc = new Date(Date.UTC(y, mo - 1, d));

  // Monday of the current week: shift back by the weekday index where
  // Monday = 0 and Sunday = 6.
  const mondayUtc = new Date(todayUtc.getTime() - ((todayUtc.getUTCDay() + 6) % 7) * 86_400_000);

  for (let day = 0; day < 7; day += 1) {
    const dayDate = new Date(mondayUtc.getTime() + day * 86_400_000);
    const count = 2 + (day % 2);
    for (let i = 0; i < count; i += 1) {
      const movie = airing[(day * 2 + i) % airing.length]!;
      const hour = 19 + ((day + i) % 4);
      const minute = i % 2 === 0 ? 0 : 30;
      // 19:00-22:30 Vietnam time, expressed as the correct UTC instant.
      const scheduled = new Date(
        Date.UTC(dayDate.getUTCFullYear(), dayDate.getUTCMonth(), dayDate.getUTCDate(), hour - 7, minute),
      );
      const episodeNumber = 12 + day + i;

      const existing = DEMO_EPISODES.find((e) => e.movieId === movie.id && e.episodeNumber === episodeNumber);
      const isPast = scheduled.getTime() < now.getTime();

      events.push({
        id: `sch-${day}-${i}`,
        movieId: movie.id,
        episodeId: existing?.id ?? null,
        episodeNumber,
        scheduledAt: scheduled.toISOString(),
        status: isPast ? "aired" : "scheduled",
        note: i === 0 ? "Phát sóng đúng giờ trên Ghiền Phim." : null,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
        movie: {
          id: movie.id,
          slug: movie.slug,
          title: movie.title,
          posterUrl: movie.posterUrl,
        },
        episode: existing
          ? {
              id: existing.id,
              slug: existing.slug,
              title: existing.title,
              episodeNumber: existing.episodeNumber,
              status: existing.status,
            }
          : null,
      });
    }
  }

  return events;
}

export const DEMO_POSTS: Post[] = [
  {
    id: "p-1",
    slug: "lich-chieu-tuan-demo",
    title: "Lịch chiếu tuần — bản demo",
    excerpt:
      "Bản lịch chiếu mẫu của Ghiền Phim, áp dụng cho tuần hiện tại. Nội dung này thuộc dữ liệu demo.",
    content: `## Lịch chiếu trong tuần

Đây là **bài viết mẫu** dùng để minh hoạ chức năng bài viết lịch chiếu. Mỗi ngày trong tuần sẽ có các tập phim cổ trang được lên sóng vào buổi tối.

### Ghi chú

- Toàn bộ tên phim trong dữ liệu demo là hư cấu.
- Nguồn video mẫu là phim mở của Blender Foundation (CC BY 3.0), dùng làm trình phát hợp pháp.

> Lịch chiếu thực tế sẽ được cập nhật khi quản trị viên đăng bài hằng tuần.`,
    coverImageUrl: poster("lich-chieu-tuan", 195, "ngu"),
    type: "weekly_schedule",
    status: "published",
    weekStart: "2026-11-09",
    publishedAt: "2026-11-09T04:00:00.000Z",
    createdAt: "2026-11-09T03:00:00.000Z",
    updatedAt: "2026-11-09T04:00:00.000Z",
    movies: [
      { id: "m-1", slug: "van-kiem-lam-ngo", title: "Vấn Kiếm Lâm Ngô", posterUrl: poster("van-kiem-lam-ngo", 205, "kiem") },
      { id: "m-5", slug: "nguyet-lang-truyen", title: "Nguyệt Lang Truyền", posterUrl: poster("nguyet-lang-truyen", 45, "nguyet") },
    ],
  },
  {
    id: "p-2",
    slug: "gioi-thieu-van-kiem-lam-ngo",
    title: "Giới thiệu: Vấn Kiếm Lâm Ngô",
    excerpt:
      "Nhìn lại cốt truyện, dàn nhân và bối cảnh võ hiệp của bộ phim cổ trang tiêu biểu của Ghiền Phim.",
    content: `## Về bộ phim

*Vấn Kiếm Lâm Ngô* là một bộ phim cổ trang hư cấu được tạo ra cho dữ liệu demo của Ghiền Phim.

### Bối cảnh

Bối cảnh dựng trong không gian sơn hải phong sương, với những ngọn núi xa chìm trong sương mù và ánh trăng thu xanh.

### Dàn nhân

- **Kiều Vân** — kiếm khách trẻ, lạnh lùng nhưng trung thành.
- **Lạc Thanh** — đường hầu xuất sắc, hiểu đạo tự nhiên.
- **Tô Vãn** — bí ẩn, luôn che giấu một bí mật cũ.

### Về thể loại

Bộ phim kết hợp **cổ trang**, **kiếm hiệp** và **tình hoán**, với tông màu xanh mực và điểm nhấn vàng champagne quen thuộc của Ghiền Phim.`,
    coverImageUrl: poster("van-kiem-lam-ngo", 205, "kiem"),
    type: "movie_intro",
    status: "published",
    weekStart: null,
    publishedAt: "2026-11-05T04:00:00.000Z",
    createdAt: "2026-11-05T03:00:00.000Z",
    updatedAt: "2026-11-05T04:00:00.000Z",
    movies: [
      { id: "m-1", slug: "van-kiem-lam-ngo", title: "Vấn Kiếm Lâm Ngô", posterUrl: poster("van-kiem-lam-ngo", 205, "kiem") },
    ],
  },
  {
    id: "p-3",
    slug: "thong-bao-ra-mat-gheien-phim",
    title: "Thông báo: Ghiền Phim chính thức ra mắt",
    excerpt:
      "Giới thiệu về dự án Ghiền Phim — nơi tập hợp phim cổ trang, tiên hiệp và kiếm hiệp với phụ đề tiếng Việt.",
    content: `## Chào mừng đến với Ghiền Phim

Ghiền Phim là nơi dành cho những người yêu thích phim cổ trang Trung Hoa: **cổ trang**, **tiên hiệm**, **kiếm hiệp**, **cung đấu** và **huyền huyễn**.

### Cam kết của chúng tôi

1. Không tải về, không proxy và không scrape video.
2. Chỉ dùng cơ chế nhúng chính thức của YouTube và Facebook.
3. Chỉ chia sẻ nội dung mà chủ website có quyền sử dụng.

> Trang này đang ở chế độ demo vì chưa cấu hình Supabase.`,
    coverImageUrl: poster("thong-bao", 190, "ngu"),
    type: "announcement",
    status: "published",
    weekStart: null,
    publishedAt: "2026-11-01T04:00:00.000Z",
    createdAt: "2026-11-01T03:00:00.000Z",
    updatedAt: "2026-11-01T04:00:00.000Z",
    movies: [],
  },
];

export const DEMO_SETTINGS: SiteSettings = {
  siteName: "Ghiền Phim",
  siteDescription:
    "Xem phim cổ trang, tiên hiệp, kiếm hiệp và cung đấu Trung Hoại với phụ đề tiếng Việt. Lịch chiếu hằng tuần cập nhật liên tục.",
  logoUrl: null,
  contactEmail: null,
  contactNote:
    "Dữ liệu trên website đang ở chế độ demo. Vui lòng để lại email liên hệ trong trang Cài đặt sau khi cấu hình Supabase.",
  seoTitle: "Ghiền Phim — Phim cổ trang Trung Hoại phụ đề tiếng Việt",
  seoDescription:
    "Ghiền Phim — cập nhật phim cổ trang, tiên hiệp, kiếm hiệp, cung đấu và huyền huyễn Trung Hoại kèm phụ đề tiếng Việt.",
  ogImageUrl: null,
  featuredMovieId: "m-1",
  updatedAt: "2026-11-12T04:00:00.000Z",
};
