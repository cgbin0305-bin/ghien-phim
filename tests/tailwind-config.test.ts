import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Hồi quy cho lỗi "UI/UX mất hết, chỉ còn text thuần".
 *
 * Nguyên nhân gốc: `src/app/globals.css` dùng Tailwind v4 (`@import "tailwindcss"`)
 * nhưng thiếu directive `@config`. Tailwind v4 KHÔNG tự đọc `tailwind.config.*`
 * — thiếu dòng đó khiến toàn bộ màu tùy chỉnh (`ink-*`, `gold-*`, `parchment-*`,
 * `jade-*`, `rouge-*`), `shadow-lift` và `animate-*` không được sinh ra, khiến
 * toàn bộ giao diện mất style.
 *
 * Test này chốt lại điều đó để lỗi không tái diễn.
 */

const root = resolve(__dirname, "..");
const globalsCss = readFileSync(resolve(root, "src/app/globals.css"), "utf8");

describe("globals.css — cấu hình Tailwind", () => {
  it("dùng Tailwind v4 qua @import", () => {
    expect(globalsCss).toMatch(/@import\s+["']tailwindcss["']/);
  });

  it("có directive @config trỏ tới file cấu hình tồn tại", () => {
    const match = globalsCss.match(/@config\s+["']([^"']+)["']/);
    expect(match, "globals.css phải có directive @config cho Tailwind v4").toBeTruthy();
    if (!match) return;

    const configPath = resolve(root, "src/app", match[1]!);
    expect(() => readFileSync(configPath, "utf8")).not.toThrow();
  });

  it("không trỏ @config tới file không tồn tại (sẽ làm build CSS hỏng)", () => {
    const match = globalsCss.match(/@config\s+["']([^"']+)["']/);
    if (!match) return;
    const configPath = resolve(root, "src/app", match[1]!);
    expect(() => readFileSync(configPath, "utf8")).not.toThrow();
  });
});

describe("tailwind config — token màu", () => {
  const configPath = resolve(root, "tailwind.config.mts");
  const config = readFileSync(configPath, "utf8");

  const palettes = ["ink", "gold", "parchment", "jade", "rouge"] as const;

  it.each(palettes)("có bảng màu %s", (palette) => {
    expect(config).toContain(`${palette}: {`);
  });

  it("có các token màu thực sự được dùng trong mã nguồn", () => {
    // Danh sách rút ra từ toàn bộ class màu tùy chỉnh trong src/.
    const required = [
      "ink-500",
      "ink-600",
      "ink-700",
      "ink-750",
      "ink-800",
      "ink-850",
      "ink-900",
      "ink-950",
      "gold-100",
      "gold-200",
      "gold-300",
      "gold-400",
      "gold-500",
      "jade-100",
      "jade-300",
      "jade-500",
      "parchment-100",
      "parchment-200",
      "parchment-300",
      "rouge-200",
      "rouge-300",
      "rouge-400",
      "rouge-500",
      "rouge-700",
    ];

    for (const token of required) {
      const [, shade] = token.split("-");
      expect(config, `thiếu token ${token}`).toMatch(
        new RegExp(`\\b${shade}:\\s*"#`),
      );
    }
  });

  it("có shadow và animation tùy chỉnh", () => {
    expect(config).toContain("lift:");
    expect(config).toContain("card:");
    // keyframes/animate dùng key có dấu nháy: "fade-rise": { ... }
    expect(config).toMatch(/["']?fade-rise["']?\s*:/);
    expect(config).toMatch(/["']?fade-in["']?\s*:/);
    expect(config).toMatch(/["']?shimmer["']?\s*:/);
  });
});
