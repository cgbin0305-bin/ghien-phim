import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Hồi quy: trang quản trị không được quảng bá ra giao diện công khai.
 *
 * Yêu cầu: chỉ truy cập `/admin` bằng cách tự gõ URL, không hiện nút/link nào
 * dẫn tới đó cho người dùng thường.
 *
 * Khu quản trị vẫn được bảo vệ bằng đăng nhập (xem `src/app/admin/(panel)/layout.tsx`
 * và `requireAdmin()` trong các Server Action), nên việc ẩn link chỉ là lớp
 * giảm thiểu bề mặt tấn công — không phải lớp bảo mật duy nhất.
 */

const root = resolve(__dirname, "..");

/** File giao diện công khai — những chỗ người dùng thường thấy. */
const PUBLIC_UI_FILES = [
  "src/components/layout/site-header.tsx",
  "src/components/layout/site-footer.tsx",
  "src/components/layout/demo-banner.tsx",
  "src/app/page.tsx",
  "src/app/phim/page.tsx",
  "src/app/lich-chieu/page.tsx",
  "src/app/bai-viet/page.tsx",
  "src/app/not-found.tsx",
  "src/app/error.tsx",
];

describe("giao diện công khai — không lộ khu quản trị", () => {
  it.each(PUBLIC_UI_FILES)("%s không chứa link tới /admin", (relativePath) => {
    const source = readFileSync(resolve(root, relativePath), "utf8");

    // Bỏ qua dòng comment: tài liệu nội bộ được phép nhắc tới /admin.
    const codeLines = source
      .split(/\r?\n/)
      .filter((line) => !/^\s*(\/\/|\*|\/\*)/.test(line));

    const offenders = codeLines.filter(
      (line) => /href=["'`{]+["'`]?\/admin\b/.test(line) || /to=["'`]\/admin\b/.test(line),
    );

    expect(offenders, `link tới /admin trong ${relativePath}:\n${offenders.join("\n")}`).toEqual(
      [],
    );
  });

  it("header công khai không có nút mang nhãn quản trị", () => {
    const header = readFileSync(resolve(root, "src/components/layout/site-header.tsx"), "utf8");
    const codeLines = header
      .split(/\r?\n/)
      .filter((line) => !/^\s*(\/\/|\*|\/\*)/.test(line));
    const offenders = codeLines.filter((line) => /Quản trị/.test(line));
    expect(offenders, `nhãn quản trị còn trong header:\n${offenders.join("\n")}`).toEqual([]);
  });

  it("sitemap không liệt kê khu quản trị", () => {
    const sitemap = readFileSync(resolve(root, "src/app/sitemap.ts"), "utf8");
    // Chỉ kiểm tra phần code, không tính comment giải thích.
    const stripped = sitemap.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
    expect(stripped).not.toMatch(/\/admin/);
  });

  it("trang đăng nhập quản trị vẫn noindex", () => {
    const login = readFileSync(resolve(root, "src/app/admin/login/page.tsx"), "utf8");
    expect(login).toMatch(/robots:\s*\{\s*index:\s*false/);
  });
});
