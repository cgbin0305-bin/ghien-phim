import { describe, expect, it } from "vitest";
import {
  findMatchingMotChutMovie,
  isValidMotChutCode,
  isValidMotChutFbUrl,
  isValidMotChutThumbnail,
  isValidMotChutYtUrl,
  mapGenresToMotChutTags,
  normalizeTitleForMatch,
  sourcesToMotChutParts,
  validateAndBuildMotChutPayload,
  type MotChutMineMovie,
} from "@/lib/motchut";

const VALID_CODE = "AbCdEfGhIjKlMnOpQrStUvWxYz012345";
const VALID_UPDATE_FOR = "contrib-550e8400-e29b-41d4-a716-446655440000";

describe("MotChut API helpers & validation", () => {
  it("kiểm tra mã CTV đúng 32 ký tự", () => {
    expect(isValidMotChutCode(VALID_CODE)).toBe(true);
    expect(isValidMotChutCode("short")).toBe(false);
    expect(isValidMotChutCode(`${VALID_CODE}!`)).toBe(false);
  });

  it("kiểm tra URL thumbnail, Facebook và YouTube", () => {
    expect(isValidMotChutThumbnail("https://cdn.example.com/poster.webp")).toBe(true);
    expect(isValidMotChutThumbnail("https://cdn.example.com/poster.JPG")).toBe(true);
    expect(isValidMotChutThumbnail("/api/poster/123")).toBe(false);
    expect(isValidMotChutThumbnail("http://cdn.example.com/poster.png")).toBe(false);
    expect(isValidMotChutThumbnail("")).toBe(true);

    expect(isValidMotChutFbUrl("https://www.facebook.com/reel/123456789012345/")).toBe(true);
    expect(isValidMotChutFbUrl("https://fb.watch/abc123/")).toBe(true);
    expect(isValidMotChutFbUrl("https://youtube.com/watch?v=123")).toBe(false);

    expect(isValidMotChutYtUrl("https://youtu.be/abcdefghijk")).toBe(true);
    expect(isValidMotChutYtUrl("https://www.youtube.com/watch?v=abcdefghijk")).toBe(true);
    expect(isValidMotChutYtUrl("https://facebook.com/reel/123")).toBe(false);
  });

  it("chuẩn hoá và tự động khớp phim tiếng Việt theo tên hoặc tên gốc", () => {
    expect(normalizeTitleForMatch("Thái Huyền Thai Châu Truyện")).toBe("thai huyen thai chau truyen");

    const movies: MotChutMineMovie[] = [
      {
        id: VALID_UPDATE_FOR,
        title: "Thai Huyen Thai Chau Truyen",
        originalTitle: "太玄胎珠传",
        parts: [{ name: "Mùa 1" }],
      },
    ];

    expect(findMatchingMotChutMovie(movies, "Thái Huyền Thai Châu Truyện")?.id).toBe(VALID_UPDATE_FOR);
    expect(findMatchingMotChutMovie(movies, "Khác tên", "太玄胎珠传")?.id).toBe(VALID_UPDATE_FOR);
    expect(findMatchingMotChutMovie(movies, "Không tồn tại")).toBeNull();
  });

  it("mapping thể loại Ghiền Phim sang 9 thể loại chuẩn của Một Chút và bỏ thể loại thừa", () => {
    expect(
      mapGenresToMotChutTags([
        "Cổ trang",
        "Tiên hiệm",
        "Kiếm hiệp",
        "Huyền huyễn",
        "Cung đấu",
        "Tình hoán",
        "Văn cổ",
        "Hệ Thống",
      ]),
    ).toEqual(["Tu Tiên", "Huyền Huyễn", "Ngôn Tình", "Hệ Thống"]);
  });

  it("chuyển đổi nguồn tập thành parts hợp lý", () => {
    // 1 FB + 1 YT -> gộp vào 1 phần
    expect(
      sourcesToMotChutParts("Mùa 1 - Tập 5", 5, [
        { provider: "youtube", sourceUrl: "https://youtu.be/abc", label: "Server 1" },
        { provider: "facebook", sourceUrl: "https://www.facebook.com/reel/123", label: "Server 2" },
      ]),
    ).toEqual([
      {
        name: "Mùa 1 - Tập 5",
        fbUrl: "https://www.facebook.com/reel/123",
        ytUrl: "https://youtu.be/abc",
      },
    ]);

    // Nhiều phần trong 1 tập -> tách thành nhiều phần
    expect(
      sourcesToMotChutParts("Tập 5", 5, [
        { provider: "youtube", sourceUrl: "https://youtu.be/p1", label: "Phần 1" },
        { provider: "youtube", sourceUrl: "https://youtu.be/p2", label: "Phần 2" },
      ]),
    ).toEqual([
      { name: "Tập 5 - Phần 1", fbUrl: "", ytUrl: "https://youtu.be/p1" },
      { name: "Tập 5 - Phần 2", fbUrl: "", ytUrl: "https://youtu.be/p2" },
    ]);
  });

  it("tạo payload hợp lệ cho cả 3 chế độ (create, append, replace)", () => {
    const createRes = validateAndBuildMotChutPayload(
      {
        title: "Thái Huyền Thai Châu",
        originalTitle: "太玄胎珠传",
        format: "Phim 3D",
        audio: "Thuyết Minh",
        thumbnail: "https://cdn.example.com/bg.webp",
        description: "Mô tả ngắn",
        tags: ["Tu Tiên", "Cổ Trang"],
        completed: false,
        parts: [{ name: "Mùa 1", ytUrl: "https://youtu.be/abcdefghijk" }],
      },
      VALID_CODE,
    );
    expect(createRes.ok).toBe(true);
    if (createRes.ok) {
      expect(createRes.payload.title).toBe("Thái Huyền Thai Châu");
      expect(createRes.payload.updateFor).toBe("");
      expect(createRes.payload.updateMode).toBe("append");
      expect(createRes.payload.thumbnailFile).toBe("");
    }

    const appendRes = validateAndBuildMotChutPayload(
      {
        updateFor: VALID_UPDATE_FOR,
        updateMode: "append",
        parts: [{ name: "Mùa 2", fbUrl: "https://www.facebook.com/reel/999" }],
      },
      VALID_CODE,
    );
    expect(appendRes.ok).toBe(true);
    if (appendRes.ok) {
      expect(appendRes.payload).toEqual({
        code: VALID_CODE,
        updateFor: VALID_UPDATE_FOR,
        updateMode: "append",
        parts: [{ name: "Mùa 2", fbUrl: "https://www.facebook.com/reel/999", ytUrl: "" }],
      });
    }

    const replaceRes = validateAndBuildMotChutPayload(
      {
        updateFor: VALID_UPDATE_FOR,
        updateMode: "replace",
        title: "Thái Huyền (Bản Full)",
        completed: true,
        parts: [{ name: "Mùa 1", ytUrl: "https://youtu.be/abcdefghijk" }],
      },
      VALID_CODE,
    );
    expect(replaceRes.ok).toBe(true);
    if (replaceRes.ok) {
      expect(replaceRes.payload.updateMode).toBe("replace");
      expect(replaceRes.payload.completed).toBe(true);
    }
  });

  it("từ chối dữ liệu sai quy tắc (thiếu link, trùng tên phần, sai link)", () => {
    const missingLink = validateAndBuildMotChutPayload(
      {
        title: "Phim Test",
        parts: [{ name: "Mùa 1", fbUrl: "", ytUrl: "" }],
      },
      VALID_CODE,
    );
    expect(missingLink.ok).toBe(false);

    const dupNames = validateAndBuildMotChutPayload(
      {
        title: "Phim Test",
        parts: [
          { name: "Mùa 1", ytUrl: "https://youtu.be/1" },
          { name: "mùa 1", ytUrl: "https://youtu.be/2" },
        ],
      },
      VALID_CODE,
    );
    expect(dupNames.ok).toBe(false);
  });
});
