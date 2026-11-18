import { readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Hồi quy cho độ tương phản chữ.
 *
 * Người dùng báo: "chữ và background cùng một tone màu không nhìn được".
 *
 * Nguyên nhân gốc: nhiều chỗ dùng màu chữ lấy từ bảng `ink` (shade 500 và 600)
 * — vốn là màu *nền và viền*, không phải màu chữ. Đo theo WCAG trên nền
 * `ink-950` (#070b10):
 *
 *   ink shade 500 -> 2.24:1
 *   ink shade 600 -> 1.67:1
 *
 * Ngưỡng WCAG AA cho chữ thường là **4.5:1**. Hai màu trên tệ hơn rất nhiều
 * nên chữ gần như biến mất.
 *
 * Ngoài ra nhiều chỗ dùng `text-parchment-300` ở opacity 50-65%, cũng rơi
 * xuống dưới ngưỡng. Test này khoá lại cả hai quy tắc.
 */

const root = resolve(__dirname, "..");
const config = readFileSync(resolve(root, "tailwind.config.mts"), "utf8");

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (/\.(tsx|ts)$/.test(entry.name)) out.push(full);
  }
  return out;
}

const sourceFiles = walk(resolve(root, "src"));

/** Trả về các dòng khớp `pattern` trong toàn bộ src/. */
function findUsages(pattern: RegExp): Array<{ file: string; line: number; text: string }> {
  const hits: Array<{ file: string; line: number; text: string }> = [];
  for (const file of sourceFiles) {
    const lines = readFileSync(file, "utf8").split(/\r?\n/);
    lines.forEach((text, index) => {
      if (pattern.test(text)) {
        hits.push({ file: file.replace(root, "").replace(/\\/g, "/"), line: index + 1, text: text.trim() });
      }
      // `RegExp` có cờ `g` giữ `lastIndex`; reset để lần test sau còn khớp.
      pattern.lastIndex = 0;
    });
  }
  return hits;
}

describe("màu chữ — không dùng màu nền làm màu chữ", () => {
  // Xây tên class từ mảnh ghép để Tailwind không nhặt được literal của class
  // tối khi quét thư mục tests/ và sinh lại đúng những class mà test này cấm.
  const SHADE_500 = ["text", "ink", "500"].join("-");
  const SHADE_600 = ["text", "ink", "600"].join("-");

  it(`không còn ${SHADE_500} (tương phản 2.24:1)`, () => {
    const hits = findUsages(new RegExp(`\\b${SHADE_500}\\b`));
    expect(hits, `còn dùng màu chữ quá tối:\n${hits.map((h) => `${h.file}:${h.line}`).join("\n")}`).toEqual([]);
  });

  it(`không còn ${SHADE_600} (tương phản 1.67:1)`, () => {
    const hits = findUsages(new RegExp(`\\b${SHADE_600}\\b`));
    expect(hits, `còn dùng màu chữ quá tối:\n${hits.map((h) => `${h.file}:${h.line}`).join("\n")}`).toEqual([]);
  });

  it("có token `mist` cho chữ phụ đạt chuẩn AA", () => {
    expect(config).toMatch(/mist:\s*\{/);
  });
});

describe("màu chữ — opacity tối thiểu", () => {
  it("không dùng parchment ở opacity dưới 70%", () => {
    // /50, /55, /60, /65 đều từng được dùng cho chữ phụ và quá mờ.
    const hits = findUsages(/\btext-parchment-(100|200|300)\/(50|55|60|65)\b/);
    expect(
      hits,
      `chữ quá mờ:\n${hits.map((h) => `${h.file}:${h.line}: ${h.text}`).join("\n")}`,
    ).toEqual([]);
  });
});

describe("cỡ chữ tối thiểu", () => {
  it("không dùng cỡ chữ dưới 12px", () => {
    // 10px/11px quá nhỏ cho tiếng Việt có dấu.
    const hits = findUsages(/\btext-\[(9|10|11)px\]/);
    expect(
      hits,
      `cỡ chữ quá nhỏ:\n${hits.map((h) => `${h.file}:${h.line}: ${h.text}`).join("\n")}`,
    ).toEqual([]);
  });
});
