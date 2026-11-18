import { describe, expect, it } from "vitest";
import { isUuid } from "@/lib/data/uuid";

describe("isUuid", () => {
  it("nhận UUID hợp lệ", () => {
    expect(isUuid("988355a1-ee3e-4932-952c-30ad1b13af8f")).toBe(true);
    expect(isUuid("00000000-0000-0000-0000-000000000000")).toBe(true);
  });

  it("không phân biệt hoa/thường", () => {
    expect(isUuid("988355A1-EE3E-4932-952C-30AD1B13AF8F")).toBe(true);
  });

  it("từ chối slug", () => {
    expect(isUuid("thien-dao-du-do")).toBe(false);
  });

  it("từ chối chuỗi rỗng", () => {
    expect(isUuid("")).toBe(false);
  });

  it("từ chối UUID thiếu/thừa ký tự", () => {
    expect(isUuid("988355a1-ee3e-4932-952c-30ad1b13af8")).toBe(false);
    expect(isUuid("988355a1-ee3e-4932-952c-30ad1b13af8ff")).toBe(false);
    expect(isUuid("988355a1ee3e4932952c30ad1b13af8f")).toBe(false);
  });

  it("từ chối chuỗi không phải hex", () => {
    expect(isUuid("zzzzzzzz-ee3e-4932-952c-30ad1b13af8f")).toBe(false);
  });
});
