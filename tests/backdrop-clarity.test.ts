import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Hồi quy cho độ rõ của ảnh nền (backdrop).
 *
 * Người dùng báo: "ảnh backdrop quá mờ, không thể thấy rõ".
 *
 * Nguyên nhân gốc: ngoài `opacity` đặt trực tiếp lên ảnh, còn BA lớp phủ tối
 * chồng lên nhau (gradient ngang + gradient dọc + `.bg-mist-mountains`). Đo
 * độ hiện thực tế:
 *
 *   hero           : 0–13%  (gần như không thấy)
 *   trang chi tiết : 0–12%  (tệ hơn nữa vì ảnh chỉ có opacity 25%)
 *
 * Test này khoá lại hai điều:
 *  1. Ảnh nền không được đặt `opacity` thấp (phải hiện đủ).
 *  2. Không dùng lại lớp phủ `mist-mountains` vốn rất tối ở đáy.
 */

const root = resolve(__dirname, "..");
const homePage = readFileSync(resolve(root, "src/app/page.tsx"), "utf8");
const detailPage = readFileSync(resolve(root, "src/app/phim/[slug]/page.tsx"), "utf8");
const globalsCss = readFileSync(resolve(root, "src/app/globals.css"), "utf8");

/** Tìm class opacity thấp trên ảnh nền của một khối hero/backdrop. */
function findLowImageOpacity(source: string): string[] {
  // Chỉ xét thẻ <SafeImage> dùng `fill` (ảnh nền), không xét poster thu nhỏ.
  const blocks = source.split("<SafeImage").slice(1);
  const offenders: string[] = [];
  for (const block of blocks) {
    const tag = block.slice(0, block.indexOf("/>") + 2);
    if (!tag.includes("fill")) continue;
    // `opacity-25`, `opacity-40`, `opacity-80`... nhưng bỏ qua `opacity-100`.
    const match = tag.match(/\bopacity-(\d+)\b/);
    if (match && Number(match[1]) < 95) offenders.push(match[0]);
  }
  return offenders;
}

describe("ảnh nền — độ rõ", () => {
  it("hero không làm mờ ảnh nền bằng opacity", () => {
    const offenders = findLowImageOpacity(homePage);
    expect(
      offenders,
      `ảnh nền hero bị đặt opacity thấp (${offenders.join(", ")}): ` +
        "hãy để ảnh hiện đủ và điều chỉnh lớp phủ thay vì giảm opacity",
    ).toEqual([]);
  });

  it("trang chi tiết không làm mờ ảnh nền bằng opacity", () => {
    const offenders = findLowImageOpacity(detailPage);
    expect(
      offenders,
      `ảnh nền trang chi tiết bị đặt opacity thấp (${offenders.join(", ")}): ` +
        "trước đây là opacity-25 nên gần như không nhìn thấy backdrop",
    ).toEqual([]);
  });

  it("không dùng lại lớp phủ mist-mountains (làm tối tới 96%)", () => {
    expect(globalsCss).not.toContain("bg-mist-mountains");
    expect(homePage).not.toContain("bg-mist-mountains");
    expect(detailPage).not.toContain("bg-mist-mountains");
  });

  it("có bóng chữ để chữ vẫn đọc được khi ảnh hiện rõ", () => {
    expect(globalsCss).toContain("text-shadow-hero");
    expect(homePage).toContain("text-shadow-hero");
    expect(detailPage).toContain("text-shadow-hero");
  });
});
