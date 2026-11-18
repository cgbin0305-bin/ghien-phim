import { describe, expect, it } from "vitest";
import {
  classifyImageSource,
  isAllowedImageHost,
  normalizeImageUrl,
} from "@/lib/image-hosts";

/**
 * Hồi quy cho lỗi thực tế khi thêm poster trong trang quản trị:
 *
 *   Invalid src prop (https://supabase.com/dashboard/project/<ref>/storage/
 *   files/buckets/media?preview=Thien+Dao+Du+Do.png) on `next/image`,
 *   hostname "supabase.com" is not configured under images in your
 *   `next.config.js`
 *
 * Nguyên nhân: quản trị viên copy URL của **trang quản trị** Supabase (một
 * trang HTML), không phải URL file. `next/image` ném exception vì host
 * `supabase.com` không nằm trong `images.remotePatterns` — và kể cả có thêm
 * vào thì ảnh vẫn không hiện, vì đó không phải ảnh.
 *
 * `normalizeImageUrl` phải chuyển được link đó sang URL file công khai thật,
 * để ảnh vừa hiện được vừa không làm sập trang.
 */

const DASHBOARD_URL =
  "https://supabase.com/dashboard/project/kzbfxarmuwmcuxvlhlvx/storage/files/buckets/media?preview=Thien+Dao+Du+Do.png";

const PUBLIC_URL =
  "https://kzbfxarmuwmcuxvlhlvx.supabase.co/storage/v1/object/public/media/Thien%20Dao%20Du%20Do.png";

describe("normalizeImageUrl — link trang quản trị Supabase", () => {
  it("chuyển URL dashboard thành URL file công khai", () => {
    expect(normalizeImageUrl(DASHBOARD_URL)).toBe(PUBLIC_URL);
  });

  it("xử lý được link có thư mục con", () => {
    const withFolder =
      "https://supabase.com/dashboard/project/abc123/storage/files/buckets/media/folders/posters?preview=phim+moi.png";
    expect(normalizeImageUrl(withFolder)).toBe(
      "https://abc123.supabase.co/storage/v1/object/public/media/posters/phim%20moi.png",
    );
  });

  it("giữ nguyên URL file công khai đã đúng", () => {
    expect(normalizeImageUrl(PUBLIC_URL)).toBe(PUBLIC_URL);
  });

  it("giữ nguyên đường dẫn nội bộ, URL host khác và chuỗi rỗng", () => {
    expect(normalizeImageUrl("/api/poster/205-kiem-x")).toBe("/api/poster/205-kiem-x");
    expect(normalizeImageUrl("https://images.unsplash.com/a.jpg")).toBe(
      "https://images.unsplash.com/a.jpg",
    );
    expect(normalizeImageUrl("")).toBe("");
  });

  it("không chuyển được khi dashboard URL thiếu tên file — trả nguyên trạng", () => {
    const noFile =
      "https://supabase.com/dashboard/project/abc123/storage/files/buckets/media";
    expect(normalizeImageUrl(noFile)).toBe(noFile);
  });
});

describe("classifyImageSource — sau khi chuẩn hoá", () => {
  it("URL dashboard đã chuẩn hoá được coi là host hợp lệ (không crash)", () => {
    // Đây chính là điều kiện gây lỗi trước đây: nếu phân loại nhầm thành
    // "external" thì ảnh rơi vào <img>, còn nếu giữ nguyên URL gốc thì
    // next/image ném lỗi hostname.
    expect(classifyImageSource(DASHBOARD_URL)).toBe("remote");
  });

  it("host supabase.com (trang quản trị) tự nó không phải host ảnh hợp lệ", () => {
    expect(isAllowedImageHost("supabase.com")).toBe(false);
    expect(isAllowedImageHost("kzbfxarmuwmcuxvlhlvx.supabase.co")).toBe(true);
  });
});
