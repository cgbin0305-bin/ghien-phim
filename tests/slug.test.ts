import { describe, expect, it } from "vitest";
import { slugify } from "@/lib/slug";

describe("slugify", () => {
  it("strips Vietnamese diacritics", () => {
    expect(slugify("Vấn Kiếm Lâm Ngô")).toBe("van-kiem-lam-ngo");
    expect(slugify("Tình Yêu Của Đại Vương")).toBe("tinh-yeu-cua-dai-vuong");
  });

  it("handles the đ character", () => {
    expect(slugify("Đại Vương")).toBe("dai-vuong");
  });

  it("collapses separators and trims them", () => {
    expect(slugify("  Phim   Cổ  Trang  ")).toBe("phim-co-trang");
    expect(slugify("Phim: Cổ Trang!")).toBe("phim-co-trang");
  });

  it("returns an empty string for input with no usable characters", () => {
    expect(slugify("!!!")).toBe("");
  });

  it("keeps the result within the slug length limit", () => {
    expect(slugify("a".repeat(200)).length).toBeLessThanOrEqual(90);
  });
});
