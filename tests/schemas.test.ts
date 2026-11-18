import { describe, expect, it } from "vitest";
import {
  episodeSchema,
  episodeSourceSchema,
  fieldErrors,
  loginSchema,
  movieSchema,
  postSchema,
  publicationStatusSchema,
  releaseStatusSchema,
  scheduleEventSchema,
  settingsSchema,
  slugSchema,
  subtitleLabelSchema,
  videoUrlSchema,
} from "@/lib/validations/schemas";

/**
 * Bộ schema dùng chung cho toàn bộ form quản trị.
 *
 * Đây là "hợp đồng" giữa form và Server Action: mọi giá trị gửi lên đều phải
 * được kiểm tra ở đây trước khi chạm tới database.
 */

const validMovie = {
  title: "Vấn Kiếm Lâm Ngô",
  originalTitle: "岚山剑影",
  slug: "van-kiem-lam-ngo",
  synopsis: "Một kiếm khách trẻ rời núi tảng.",
  posterUrl: "https://example.com/poster.jpg",
  backdropUrl: "",
  status: "published",
  releaseStatus: "airing",
  genreIds: ["g-kiem-hiep"],
};

describe("slugSchema", () => {
  it("chấp nhận slug hợp lệ", () => {
    expect(slugSchema.safeParse("van-kiem-lam-ngo").success).toBe(true);
    expect(slugSchema.safeParse("phim2026").success).toBe(true);
  });

  it("từ chối slug rỗng hoặc chứa ký tự lạ", () => {
    expect(slugSchema.safeParse("").success).toBe(false);
    expect(slugSchema.safeParse("Phim Cổ Trang").success).toBe(false);
    expect(slugSchema.safeParse("phim--co--trang").success).toBe(false);
    expect(slugSchema.safeParse("-phim").success).toBe(false);
    expect(slugSchema.safeParse("phim-").success).toBe(false);
  });

  it("giới hạn độ dài 90 ký tự", () => {
    expect(slugSchema.safeParse("a".repeat(90)).success).toBe(true);
    expect(slugSchema.safeParse("a".repeat(91)).success).toBe(false);
  });
});

describe("enum schemas", () => {
  it("publicationStatus chỉ nhận draft/published", () => {
    expect(publicationStatusSchema.safeParse("draft").success).toBe(true);
    expect(publicationStatusSchema.safeParse("published").success).toBe(true);
    expect(publicationStatusSchema.safeParse("archived").success).toBe(false);
  });

  it("releaseStatus chỉ nhận upcoming/airing/completed", () => {
    expect(releaseStatusSchema.safeParse("upcoming").success).toBe(true);
    expect(releaseStatusSchema.safeParse("airing").success).toBe(true);
    expect(releaseStatusSchema.safeParse("completed").success).toBe(true);
    expect(releaseStatusSchema.safeParse("ended").success).toBe(false);
  });

  it("subtitleLabel chỉ nhận 3 giá trị", () => {
    expect(subtitleLabelSchema.safeParse("vietsub").success).toBe(true);
    expect(subtitleLabelSchema.safeParse("thuyet_minh").success).toBe(true);
    expect(subtitleLabelSchema.safeParse("raw").success).toBe(true);
    expect(subtitleLabelSchema.safeParse("english").success).toBe(false);
  });
});

describe("videoUrlSchema", () => {
  it("chấp nhận URL YouTube/Facebook hợp lệ", () => {
    expect(videoUrlSchema.safeParse("https://www.youtube.com/watch?v=aqz-KE-bpKQ").success).toBe(true);
    expect(
      videoUrlSchema.safeParse("https://www.facebook.com/watch/?v=10153231379946729").success,
    ).toBe(true);
  });

  it("từ chối URL không hỗ trợ hoặc không an toàn", () => {
    expect(videoUrlSchema.safeParse("https://example.com/video.mp4").success).toBe(false);
    expect(videoUrlSchema.safeParse("javascript:alert(1)").success).toBe(false);
    expect(videoUrlSchema.safeParse("http://www.youtube.com/watch?v=aqz-KE-bpKQ").success).toBe(false);
  });

  it("báo lỗi bằng tiếng Việt có kèm gợi ý", () => {
    const parsed = videoUrlSchema.safeParse("https://example.com/video.mp4");
    expect(parsed.success).toBe(false);
    if (parsed.success) return;
    expect(parsed.error.issues[0]?.message).toMatch(/không được hỗ trợ|hostname/i);
  });
});

describe("movieSchema", () => {
  it("chấp nhận dữ liệu tối giản từ form", () => {
    const parsed = movieSchema.safeParse(validMovie);
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(parsed.data.status).toBe("published");
    expect(parsed.data.releaseStatus).toBe("airing");
    expect(parsed.data.genreIds).toEqual(["g-kiem-hiep"]);
  });

  it("không còn các trường số tập / thứ tự hiển thị", () => {
    const parsed = movieSchema.safeParse({
      ...validMovie,
      totalEpisodes: "40",
      sortOrder: "3",
    });
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(parsed.data).not.toHaveProperty("totalEpisodes");
    expect(parsed.data).not.toHaveProperty("sortOrder");
  });

  it("bắt buộc có tên phim", () => {
    const parsed = movieSchema.safeParse({ ...validMovie, title: "   " });
    expect(parsed.success).toBe(false);
    if (parsed.success) return;
    expect(parsed.error.issues[0]?.message).toBe("Tên phim không được để trống.");
  });

  it("bắt buộc có slug hợp lệ", () => {
    expect(movieSchema.safeParse({ ...validMovie, slug: "" }).success).toBe(false);
    expect(movieSchema.safeParse({ ...validMovie, slug: "Phim Cổ Trang" }).success).toBe(false);
  });

  it("từ chối URL poster không hợp lệ", () => {
    const parsed = movieSchema.safeParse({ ...validMovie, posterUrl: "khong-phai-url" });
    expect(parsed.success).toBe(false);
    if (parsed.success) return;
    const issue = parsed.error.issues.find((i) => i.path.join(".") === "posterUrl");
    expect(issue?.message).toBe("URL ảnh không hợp lệ.");
  });

  it("chấp nhận đường dẫn ảnh nội bộ tương đối", () => {
    const parsed = movieSchema.safeParse({
      ...validMovie,
      posterUrl: "/api/poster/205-kiem-van-kiem-lam-ngo",
      backdropUrl: "/api/poster/210-ngu-van-kiem-lam-ngo",
    });
    expect(parsed.success).toBe(true);
  });

  it("chuẩn hoá URL trang quản trị Supabase thành URL file công khai", () => {
    const parsed = movieSchema.safeParse({
      ...validMovie,
      posterUrl:
        "https://supabase.com/dashboard/project/kzbfxarmuwmcuxvlhlvx/storage/files/buckets/media?preview=Thien+Dao+Yu+Do.png",
      backdropUrl: "",
    });
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(parsed.data.posterUrl).toBe(
      "https://kzbfxarmuwmcuxvlhlvx.supabase.co/storage/v1/object/public/media/Thien%20Dao%20Yu%20Do.png",
    );
  });

  it("từ chối URL trang quản trị Supabase khi thiếu tên file", () => {
    const parsed = movieSchema.safeParse({
      ...validMovie,
      posterUrl:
        "https://supabase.com/dashboard/project/kzbfxarmuwmcuxvlhlvx/storage/files/buckets/media",
    });
    expect(parsed.success).toBe(false);
  });

  it("không nhận host lạ làm URL ảnh", () => {
    const parsed = movieSchema.safeParse({ ...validMovie, posterUrl: "http://not-https.com/a.png" });
    expect(parsed.success).toBe(false);
  });

  it("từ chối URL backdrop không hợp lệ", () => {
    const parsed = movieSchema.safeParse({ ...validMovie, backdropUrl: "khong-phai-url" });
    expect(parsed.success).toBe(false);
    if (parsed.success) return;
    const issue = parsed.error.issues.find((i) => i.path.join(".") === "backdropUrl");
    expect(issue?.message).toBe("URL ảnh không hợp lệ.");
  });

  it("mặc định genreIds=[]", () => {
    const parsed = movieSchema.safeParse({
      ...validMovie,
      genreIds: undefined,
    });
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(parsed.data.genreIds).toEqual([]);
  });

  it("cho phép đổi sang bản nháp", () => {
    const parsed = movieSchema.safeParse({ ...validMovie, status: "draft" });
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(parsed.data.status).toBe("draft");
  });

});

describe("episodeSchema", () => {
  const base = {
    movieId: "m-1",
    episodeNumber: "3",
    title: "Tập 3",
    slug: "tap-3",
    releaseDate: "2026-01-05",
    status: "published",
    description: "",
    sources: [
      {
        provider: "youtube",
        sourceUrl: "https://www.youtube.com/watch?v=aqz-KE-bpKQ",
        label: "Nguồn 1",
        priority: 0,
      },
    ],
  };

  it("chấp nhận tập hợp lệ", () => {
    const parsed = episodeSchema.safeParse(base);
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(parsed.data.episodeNumber).toBe(3);
    expect(parsed.data.sources).toHaveLength(1);
  });

  it("bắt buộc có movieId", () => {
    const parsed = episodeSchema.safeParse({ ...base, movieId: "" });
    expect(parsed.success).toBe(false);
    if (parsed.success) return;
    const issue = parsed.error.issues.find((i) => i.path.join(".") === "movieId");
    expect(issue?.message).toBe("Thiếu phim.");
  });

  it("bắt buộc số tập >= 1", () => {
    expect(episodeSchema.safeParse({ ...base, episodeNumber: "0" }).success).toBe(false);
    expect(episodeSchema.safeParse({ ...base, episodeNumber: "" }).success).toBe(false);
    expect(episodeSchema.safeParse({ ...base, episodeNumber: "1" }).success).toBe(true);
  });

  it("từ chối ngày phát hành sai định dạng", () => {
    const parsed = episodeSchema.safeParse({ ...base, releaseDate: "05/01/2026" });
    expect(parsed.success).toBe(false);
    if (parsed.success) return;
    const issue = parsed.error.issues.find((i) => i.path.join(".") === "releaseDate");
    expect(issue?.message).toBe("Ngày phát hành không hợp lệ.");
  });

  it("cho phép ngày phát hành rỗng", () => {
    expect(episodeSchema.safeParse({ ...base, releaseDate: "" }).success).toBe(true);
  });

  it("mặc định sources là mảng rỗng", () => {
    const parsed = episodeSchema.safeParse({ ...base, sources: undefined });
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(parsed.data.sources).toEqual([]);
  });
});

describe("episodeSourceSchema", () => {
  it("từ chối nhãn rỗng", () => {
    const parsed = episodeSourceSchema.safeParse({
      provider: "youtube",
      sourceUrl: "https://www.youtube.com/watch?v=aqz-KE-bpKQ",
      label: "",
      priority: 0,
    });
    expect(parsed.success).toBe(false);
  });

  it("từ chối priority ngoài 0-99", () => {
    const base = {
      provider: "youtube" as const,
      sourceUrl: "https://www.youtube.com/watch?v=aqz-KE-bpKQ",
      label: "Nguồn 1",
    };
    expect(episodeSourceSchema.safeParse({ ...base, priority: -1 }).success).toBe(false);
    expect(episodeSourceSchema.safeParse({ ...base, priority: 100 }).success).toBe(false);
    expect(episodeSourceSchema.safeParse({ ...base, priority: 99 }).success).toBe(true);
  });
});

describe("scheduleEventSchema", () => {
  const base = {
    movieId: "m-1",
    episodeId: "",
    episodeNumber: "",
    date: "2026-01-05",
    time: "20:00",
    status: "scheduled",
    note: "",
  };

  it("chấp nhận lịch chiếu hợp lệ", () => {
    const parsed = scheduleEventSchema.safeParse(base);
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(parsed.data.episodeNumber).toBeNull();
    expect(parsed.data.status).toBe("scheduled");
  });

  it("bắt buộc chọn phim", () => {
    expect(scheduleEventSchema.safeParse({ ...base, movieId: "" }).success).toBe(false);
  });

  it("từ chối ngày/giờ sai định dạng", () => {
    expect(scheduleEventSchema.safeParse({ ...base, date: "2026-1-5" }).success).toBe(false);
    expect(scheduleEventSchema.safeParse({ ...base, time: "8:00" }).success).toBe(false);
  });

  it("từ chối số tập dự kiến không hợp lệ", () => {
    expect(scheduleEventSchema.safeParse({ ...base, episodeNumber: "0" }).success).toBe(false);
    expect(scheduleEventSchema.safeParse({ ...base, episodeNumber: "abc" }).success).toBe(false);
    expect(scheduleEventSchema.safeParse({ ...base, episodeNumber: "12" }).success).toBe(true);
  });
});

describe("postSchema", () => {
  const base = {
    title: "Lịch chiếu tuần",
    slug: "lich-chieu-tuan",
    excerpt: "",
    content: "## Nội dung",
    coverImageUrl: "",
    type: "weekly_schedule",
    status: "draft",
    weekStart: "2026-01-05",
    movieIds: [],
  };

  it("chấp nhận bài viết hợp lệ", () => {
    const parsed = postSchema.safeParse(base);
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(parsed.data.movieIds).toEqual([]);
  });

  it("từ chối loại bài viết lạ", () => {
    expect(postSchema.safeParse({ ...base, type: "unknown" }).success).toBe(false);
  });

  it("từ chối tuần bắt đầu sai định dạng", () => {
    expect(postSchema.safeParse({ ...base, weekStart: "05-01-2026" }).success).toBe(false);
    expect(postSchema.safeParse({ ...base, weekStart: "" }).success).toBe(true);
  });

  it("mặc định content rỗng", () => {
    const parsed = postSchema.safeParse({ ...base, content: undefined });
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(parsed.data.content).toBe("");
  });
});

describe("settingsSchema", () => {
  const base = {
    siteName: "Ghiền Phim",
    siteDescription: "",
    logoUrl: "",
    contactEmail: "",
    contactNote: "",
    seoTitle: "",
    seoDescription: "",
    ogImageUrl: "",
    featuredMovieId: "",
  };

  it("chấp nhận cài đặt hợp lệ", () => {
    expect(settingsSchema.safeParse(base).success).toBe(true);
  });

  it("bắt buộc có tên website", () => {
    const parsed = settingsSchema.safeParse({ ...base, siteName: "" });
    expect(parsed.success).toBe(false);
    if (parsed.success) return;
    expect(parsed.error.issues[0]?.message).toBe("Tên website không được để trống.");
  });

  it("kiểm tra email liên hệ", () => {
    expect(settingsSchema.safeParse({ ...base, contactEmail: "khong-hop-le" }).success).toBe(false);
    expect(settingsSchema.safeParse({ ...base, contactEmail: "a@b.com" }).success).toBe(true);
  });

  it("kiểm tra URL logo và ảnh OG", () => {
    expect(settingsSchema.safeParse({ ...base, logoUrl: "abc" }).success).toBe(false);
    expect(settingsSchema.safeParse({ ...base, ogImageUrl: "abc" }).success).toBe(false);
  });
});

describe("loginSchema", () => {
  it("chấp nhận email + mật khẩu", () => {
    expect(loginSchema.safeParse({ email: "admin@example.com", password: "secret" }).success).toBe(true);
  });

  it("từ chối email không hợp lệ", () => {
    const parsed = loginSchema.safeParse({ email: "not-an-email", password: "secret" });
    expect(parsed.success).toBe(false);
    if (parsed.success) return;
    expect(parsed.error.issues[0]?.message).toBe("Email không hợp lệ.");
  });

  it("bắt buộc có mật khẩu", () => {
    expect(loginSchema.safeParse({ email: "admin@example.com", password: "" }).success).toBe(false);
  });
});

describe("fieldErrors", () => {
  it("gộp lỗi theo đường dẫn field", () => {
    const parsed = movieSchema.safeParse({ ...validMovie, title: "", slug: "BAD SLUG" });
    expect(parsed.success).toBe(false);
    if (parsed.success) return;
    const errors = fieldErrors(parsed.error);
    expect(errors.title).toBe("Tên phim không được để trống.");
    expect(errors.slug).toBeTruthy();
  });

  it("trả về object rỗng khi không có lỗi", () => {
    expect(fieldErrors({ issues: [] } as never)).toEqual({});
  });
});
