import { describe, expect, it } from "vitest";
import {
  episodeSchema,
  movieSchema,
  scheduleEventSchema,
} from "@/lib/validations/schemas";

/**
 * Form quản trị gửi mọi giá trị `<input>` dưới dạng chuỗi. Schema phía server
 * phải tự ép kiểu, nếu không một ô nhập số rỗng ("2024", "0", "12") sẽ làm
 * cả lần lưu bị từ chối — kể cả khi trạng thái xuất bản đã hợp lệ.
 */
describe("movieSchema — ép kiểu số từ form", () => {
  const base = {
    title: "Vấn Kiếm Lâm Ngô",
    originalTitle: "",
    slug: "van-kiem-lam-ngo",
    synopsis: "",
    posterUrl: "",
    backdropUrl: "",
    status: "published",
    releaseStatus: "upcoming",
    genreIds: [],
  };

  it("chấp nhận dữ liệu tối giản", () => {
    const parsed = movieSchema.safeParse(base);

    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(parsed.data.status).toBe("published");
    expect(parsed.data.genreIds).toEqual([]);
  });

  it("vẫn cho phép đổi trạng thái sang bản nháp", () => {
    const parsed = movieSchema.safeParse({ ...base, status: "draft" });
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(parsed.data.status).toBe("draft");
  });

  it("bỏ qua các trường đã không còn trong form", () => {
    const parsed = movieSchema.safeParse({
      ...base,
      year: "abc",
      totalEpisodes: "abc",
      sortOrder: "abc",
    });
    expect(parsed.success).toBe(true);
  });
});

describe("episodeSchema — số tập gửi dạng chuỗi", () => {
  const base = {
    movieId: "movie-id",
    episodeNumber: "12",
    title: "Tập 12",
    slug: "tap-12",
    releaseDate: "",
    status: "published",
    description: "",
    sources: [],
  };

  it("chấp nhận số tập dạng chuỗi", () => {
    const parsed = episodeSchema.safeParse(base);
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(parsed.data.episodeNumber).toBe(12);
  });

  it("bắt buộc có số tập", () => {
    expect(episodeSchema.safeParse({ ...base, episodeNumber: "" }).success).toBe(false);
  });
});

describe("scheduleEventSchema — số tập dự kiến dạng chuỗi", () => {
  it("chấp nhận số tập dạng chuỗi và chuỗi rỗng", () => {
    const withNumber = scheduleEventSchema.safeParse({
      movieId: "movie-id",
      episodeId: "",
      episodeNumber: "5",
      date: "2026-01-05",
      time: "20:00",
      status: "scheduled",
      note: "",
    });
    expect(withNumber.success).toBe(true);
    if (withNumber.success) expect(withNumber.data.episodeNumber).toBe(5);

    const withoutNumber = scheduleEventSchema.safeParse({
      movieId: "movie-id",
      episodeId: "",
      episodeNumber: "",
      date: "2026-01-05",
      time: "20:00",
      status: "scheduled",
      note: "",
    });
    expect(withoutNumber.success).toBe(true);
    if (withoutNumber.success) expect(withoutNumber.data.episodeNumber).toBeNull();
  });
});
